import { defineBackend } from '@aws-amplify/backend';
import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import {
  Distribution,
  HttpVersion,
  PriceClass,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { BlockPublicAccess, Bucket, BucketEncryption, HttpMethods } from 'aws-cdk-lib/aws-s3';

import { auth } from './auth/resource';
import { data } from './data/resource';
import { api } from './functions/api/resource';

/**
 * Everything here is pay-per-use: a Cognito pool, an AppSync API, two Lambda
 * functions, one on-demand DynamoDB table and one private S3 bucket. Nothing
 * runs when nobody is using the app.
 */
const backend = defineBackend({ auth, data, api });

const fn = backend.api.resources.lambda;
const stack = Stack.of(fn);
// A sandbox is thrown away with `ampx sandbox delete`; anything else keeps its data.
const disposable = stack.node.tryGetContext('amplify-backend-type') === 'sandbox';
const removalPolicy = disposable ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN;

const table = new Table(stack, 'SevenLightsTable', {
  partitionKey: { name: 'pk', type: AttributeType.STRING },
  sortKey: { name: 'sk', type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
  removalPolicy,
});

const bucket = new Bucket(stack, 'SevenLightsMedia', {
  blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
  encryption: BucketEncryption.S3_MANAGED,
  enforceSSL: true,
  removalPolicy,
  autoDeleteObjects: disposable,
  // The web build uploads with a browser form post and reads signed URLs.
  cors: [
    {
      allowedMethods: [HttpMethods.GET, HttpMethods.HEAD, HttpMethods.POST],
      allowedOrigins: ['*'],
      allowedHeaders: ['*'],
      maxAge: 3600,
    },
  ],
  lifecycleRules: [{ abortIncompleteMultipartUploadAfter: Duration.days(1) }],
});

table.grantReadWriteData(fn);
bucket.grantReadWrite(fn);
bucket.grantDelete(fn);
// Deleting an account removes the sign-in too.
fn.addToRolePolicy(
  new PolicyStatement({
    actions: ['cognito-idp:AdminDeleteUser'],
    resources: [backend.auth.resources.userPool.userPoolArn],
  })
);

backend.api.addEnvironment('TABLE_NAME', table.tableName);
backend.api.addEnvironment('BUCKET_NAME', bucket.bucketName);

// ── the web app ──────────────────────────────────────────────────────
// The exported web build (scripts/deploy-web.mjs uploads it) in a private
// bucket that only CloudFront can read. CloudFront gives it an https address;
// there is no custom domain. Both are pay-per-use, with a free tier that a
// small app stays inside.
const webStack = backend.createStack('web');
const webBucket = new Bucket(webStack, 'WebBucket', {
  blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
  encryption: BucketEncryption.S3_MANAGED,
  enforceSSL: true,
  // Nothing here is data: it can always be rebuilt from the repo.
  removalPolicy: RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
});
const web = new Distribution(webStack, 'WebDistribution', {
  defaultBehavior: {
    origin: S3BucketOrigin.withOriginAccessControl(webBucket),
    viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    compress: true,
  },
  defaultRootObject: 'index.html',
  // A single-page app: every unknown path is the app itself.
  errorResponses: [403, 404].map((httpStatus) => ({
    httpStatus,
    responseHttpStatus: 200,
    responsePagePath: '/index.html',
    ttl: Duration.seconds(0),
  })),
  // North America and Europe only: the cheapest class.
  priceClass: PriceClass.PRICE_CLASS_100,
  httpVersion: HttpVersion.HTTP2_AND_3,
});

backend.addOutput({
  custom: {
    tableName: table.tableName,
    bucketName: bucket.bucketName,
    apiFunctionName: fn.functionName,
    webBucketName: webBucket.bucketName,
    webDistributionId: web.distributionId,
    webUrl: `https://${web.distributionDomainName}`,
  },
});
