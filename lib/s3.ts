import { S3Client, GetObjectCommand, PutObjectCommand, CreateBucketCommand, HeadBucketCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const s3 = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY ? {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  } : undefined,
})

export async function ensureBucket(name: string) {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: name }))
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: name }))
  }
}

export async function getSignedCertificateUrl(key: string, expiresInSeconds = 900) {
  const bucket = process.env.S3_BUCKET || process.env.S3_BUCKET_CERTIFICATES
  const cmd = new GetObjectCommand({ Bucket: bucket!, Key: key })
  return getSignedUrl(s3, cmd, { expiresIn: expiresInSeconds })
}

export async function uploadBuffer(key: string, body: Buffer, contentType = 'application/pdf') {
  const bucket = process.env.S3_BUCKET || process.env.S3_BUCKET_CERTIFICATES
  await s3.send(new PutObjectCommand({ Bucket: bucket!, Key: key, Body: body, ContentType: contentType }))
}

export async function deleteObject(key: string) {
  const bucket = process.env.S3_BUCKET || process.env.S3_BUCKET_CERTIFICATES
  await s3.send(new DeleteObjectCommand({ Bucket: bucket!, Key: key }))
}
