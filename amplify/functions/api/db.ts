import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  BatchGetCommand,
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
  type TransactWriteCommandInput,
} from '@aws-sdk/lib-dynamodb';

/**
 * One table, no secondary indexes. Every list the app shows is a partition of
 * small pointer items written in the same transaction as the thing they point
 * to, so every read is strongly consistent.
 *
 *   U#<user>     PROFILE · BOARD#<id> · LIKE#<board> · MEM#<challenge> ·
 *                CK#<challenge>#<day> · VOTE#<challenge> · CHOWN#<challenge> ·
 *                CMOWN#<comment> · BLOCK#<user> · BLOCKEDBY#<user>
 *   UN#<name>    UN                      (username → user, keeps names unique)
 *   BOARD#<id>   A · IMG#<image>
 *   CH#<id>      A · DAY#<nnn> · MEM#<user> · CM#<stamp> · NOTE#<when>#<user>#<day>
 *   EXPLORE      <board>                 (public boards with something on them)
 *   CHL#<locale> <challenge>             (community challenges)
 *   CHLO#<locale> <challenge>            (challenges suggested by the app)
 *   REPORT       <type>#<target>#<reporter>
 */

export const TABLE = process.env.TABLE_NAME!;

export const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

export type Item = Record<string, any>;
export type Key = { pk: string; sk: string };

export async function get(pk: string, sk: string): Promise<Item | null> {
  const out = await doc.send(new GetCommand({ TableName: TABLE, Key: { pk, sk }, ConsistentRead: true }));
  return out.Item ?? null;
}

export async function query(
  pk: string,
  prefix = '',
  options: { limit?: number; newestFirst?: boolean } = {}
): Promise<Item[]> {
  const items: Item[] = [];
  let start: Record<string, any> | undefined;
  do {
    const out = await doc.send(
      new QueryCommand({
        TableName: TABLE,
        ConsistentRead: true,
        KeyConditionExpression: prefix ? 'pk = :pk and begins_with(sk, :sk)' : 'pk = :pk',
        ExpressionAttributeValues: prefix ? { ':pk': pk, ':sk': prefix } : { ':pk': pk },
        ScanIndexForward: !options.newestFirst,
        ExclusiveStartKey: start,
        Limit: options.limit ? options.limit - items.length : undefined,
      })
    );
    items.push(...(out.Items ?? []));
    start = out.LastEvaluatedKey;
  } while (start && (!options.limit || items.length < options.limit));
  return items;
}

export async function batchGet(keys: Key[]): Promise<Item[]> {
  const found: Item[] = [];
  const unique = [...new Map(keys.map((key) => [`${key.pk}|${key.sk}`, key])).values()];
  for (let i = 0; i < unique.length; i += 100) {
    let pending: Key[] | undefined = unique.slice(i, i + 100);
    while (pending?.length) {
      const out: any = await doc.send(
        new BatchGetCommand({ RequestItems: { [TABLE]: { Keys: pending, ConsistentRead: true } } })
      );
      found.push(...(out.Responses?.[TABLE] ?? []));
      pending = out.UnprocessedKeys?.[TABLE]?.Keys as Key[] | undefined;
    }
  }
  return found;
}

export async function put(item: Item, onlyIfNew = false): Promise<void> {
  await doc.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: onlyIfNew ? 'attribute_not_exists(pk)' : undefined,
    })
  );
}

export async function remove(pk: string, sk: string): Promise<void> {
  await doc.send(new DeleteCommand({ TableName: TABLE, Key: { pk, sk } }));
}

export async function batchWrite(puts: Item[], deletes: Key[] = []): Promise<void> {
  const requests = [
    ...puts.map((Item) => ({ PutRequest: { Item } })),
    ...deletes.map((Key) => ({ DeleteRequest: { Key } })),
  ];
  for (let i = 0; i < requests.length; i += 25) {
    let pending: any[] | undefined = requests.slice(i, i + 25);
    while (pending?.length) {
      const out: any = await doc.send(new BatchWriteCommand({ RequestItems: { [TABLE]: pending } }));
      pending = out.UnprocessedItems?.[TABLE];
    }
  }
}

export type Change = {
  set?: Item;
  add?: Record<string, number>;
  remove?: string[];
  /** Raw condition; use #name / :value placeholders declared in names/values. */
  condition?: string;
  names?: Record<string, string>;
  values?: Item;
};

/** Builds an update with every attribute name aliased, so reserved words are safe. */
export function updateParams(pk: string, sk: string, change: Change) {
  const names: Record<string, string> = { ...change.names };
  const values: Item = { ...change.values };
  const parts: string[] = [];
  const sets = Object.entries(change.set ?? {}).map(([name, value]) => {
    names[`#s_${name}`] = name;
    values[`:s_${name}`] = value;
    return `#s_${name} = :s_${name}`;
  });
  if (sets.length) parts.push(`SET ${sets.join(', ')}`);
  const adds = Object.entries(change.add ?? {}).map(([name, value]) => {
    names[`#a_${name}`] = name;
    values[`:a_${name}`] = value;
    return `#a_${name} :a_${name}`;
  });
  if (adds.length) parts.push(`ADD ${adds.join(', ')}`);
  const removes = (change.remove ?? []).map((name) => {
    names[`#r_${name}`] = name;
    return `#r_${name}`;
  });
  if (removes.length) parts.push(`REMOVE ${removes.join(', ')}`);
  return {
    TableName: TABLE,
    Key: { pk, sk },
    UpdateExpression: parts.join(' '),
    // Never create a row by updating one that is gone.
    ConditionExpression: change.condition ?? 'attribute_exists(pk)',
    ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
    ExpressionAttributeValues: Object.keys(values).length ? values : undefined,
  };
}

/** Returns false when the condition did not hold. */
export async function update(pk: string, sk: string, change: Change): Promise<boolean> {
  try {
    await doc.send(new UpdateCommand(updateParams(pk, sk, change)));
    return true;
  } catch (error) {
    if ((error as Error).name === 'ConditionalCheckFailedException') return false;
    throw error;
  }
}

export type Tx = NonNullable<TransactWriteCommandInput['TransactItems']>[number];

export const tx = {
  put: (item: Item, onlyIfNew = false): Tx => ({
    Put: {
      TableName: TABLE,
      Item: item,
      ConditionExpression: onlyIfNew ? 'attribute_not_exists(pk)' : undefined,
    },
  }),
  remove: (pk: string, sk: string, mustExist = false): Tx => ({
    Delete: {
      TableName: TABLE,
      Key: { pk, sk },
      ConditionExpression: mustExist ? 'attribute_exists(pk)' : undefined,
    },
  }),
  update: (pk: string, sk: string, change: Change): Tx => ({ Update: updateParams(pk, sk, change) }),
};

/**
 * All or nothing. Resolves to null on success, or to the index of the first
 * item whose condition failed.
 */
export async function transact(items: Tx[]): Promise<number | null> {
  try {
    await doc.send(new TransactWriteCommand({ TransactItems: items }));
    return null;
  } catch (error) {
    const failure = error as { name?: string; CancellationReasons?: { Code?: string }[] };
    if (failure.name === 'TransactionCanceledException') {
      const index = (failure.CancellationReasons ?? []).findIndex(
        (reason) => reason.Code === 'ConditionalCheckFailed'
      );
      if (index >= 0) return index;
    }
    throw error;
  }
}

/** Strips the storage keys so only the row itself goes back to the app. */
export function row<T = Item>(item: Item): T {
  const { pk: _pk, sk: _sk, ...rest } = item;
  return rest as T;
}
