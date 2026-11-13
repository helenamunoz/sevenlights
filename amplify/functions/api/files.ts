import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * The private media bucket. Keys always begin with the owner's user id:
 *   <uid>/boards/<board id>/<image id>.jpg
 *   <uid>/avatar/<id>.jpg
 *   <uid>/audio/<id>.<ext>
 *
 * Nobody but this function can reach the bucket. The app reads through links
 * that expire, so a photo stops being reachable when its board is made private
 * or hidden; it uploads through a one-off form that fixes the key, the type
 * and a size limit.
 */

const BUCKET = process.env.BUCKET_NAME!;
const s3 = new S3Client({});

export const READ_SECONDS = 60 * 60;

export const boardImagePath = (userId: string, boardId: string, imageId: string) =>
  `${userId}/boards/${boardId}/${imageId}.jpg`;

export function readUrl(key: string): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: READ_SECONDS });
}

export async function uploadForm(
  key: string,
  contentType: string,
  maxMegabytes: number
): Promise<{ url: string; fields: Record<string, string> }> {
  const { url, fields } = await createPresignedPost(s3, {
    Bucket: BUCKET,
    Key: key,
    Expires: 300,
    Fields: { 'Content-Type': contentType },
    Conditions: [
      ['content-length-range', 1, maxMegabytes * 1024 * 1024],
      ['eq', '$Content-Type', contentType],
    ],
  });
  return { url, fields };
}

export async function exists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function copy(from: string, to: string): Promise<void> {
  await s3.send(
    new CopyObjectCommand({
      Bucket: BUCKET,
      Key: to,
      CopySource: `${BUCKET}/${from.split('/').map(encodeURIComponent).join('/')}`,
    })
  );
}

export async function removeMany(keys: string[]): Promise<void> {
  for (let i = 0; i < keys.length; i += 1000) {
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true },
      })
    );
  }
}

/** Deletes everything under a prefix except the keys in `keep`. */
export async function removeFolder(prefix: string, keep: Set<string>): Promise<void> {
  let token: string | undefined;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: token })
    );
    const keys = (page.Contents ?? []).map((object) => object.Key!).filter((key) => !keep.has(key));
    await removeMany(keys);
    token = page.NextContinuationToken;
  } while (token);
}
