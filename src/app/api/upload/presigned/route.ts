import { NextRequest, NextResponse } from 'next/server';
import { s3Client } from '@/lib/s3';
import { verifyEmployeeRequest } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  try {
    const verifiedReq = await verifyEmployeeRequest(request);
    if (verifiedReq instanceof NextResponse) {
      return verifiedReq;
    }

    const { fileName, contentType } = await request.json();

    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'fileName and contentType are required' }, { status: 400 });
    }
    const ip = await getNetworkIp();

    // Generate presigned URL that's valid for 1 hour
    const presignedUrl = s3Client.presign(fileName, {
      expiresIn: 3600, // 1 hour
      method: 'PUT',
      type: contentType,
      endpoint: process.env.NODE_ENV === 'development' ? process.env.S3_ENDPOINT?.replace('localhost', ip || '') : undefined,
      acl: 'public-read-write',
    });

    return NextResponse.json({
      presignedUrl,
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json({ error: 'Failed to generate presigned URL' }, { status: 500 });
  }
}

async function getNetworkIp() {
  try {
    const res = Bun.$`ipconfig getifaddr en0`.text();
    return (await res).trim();
  } catch (error) {
    console.error('Error getting network IP:', error);
    return null;
  }
}
