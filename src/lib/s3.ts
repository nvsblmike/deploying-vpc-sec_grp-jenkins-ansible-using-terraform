import { S3Client } from 'bun';

export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  bucket: process.env.AWS_S3_BUCKET_NAME!,
  endpoint: process.env.AWS_S3_ENDPOINT,
});

export async function generatePresignedUrl(key: string, expiresIn = 3600) {
  return s3Client.presign(key, { expiresIn, acl: 'public-read' });
}
