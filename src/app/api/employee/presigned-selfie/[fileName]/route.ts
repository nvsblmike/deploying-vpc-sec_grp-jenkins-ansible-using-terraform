import { NextRequest, NextResponse } from 'next/server';
import { verifyEmployeeRequest } from '@/lib/middleware';
import { generatePresignedUrl } from '@/lib/s3';

export async function GET(request: NextRequest, { params }: { params: Promise<{ fileName: string }> }) {
  try {
    const verifiedReq = await verifyEmployeeRequest(request);
    if (verifiedReq instanceof NextResponse) {
      return verifiedReq;
    }
    const { fileName } = await params;
    // Generate a presigned URL that expires in 1 hour
    const presignedUrl = await generatePresignedUrl(fileName, 3600);

    return NextResponse.json({
      url: presignedUrl,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('Error generating presigned selfie URL:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
