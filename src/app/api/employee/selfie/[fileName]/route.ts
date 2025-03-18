import { NextRequest, NextResponse } from 'next/server';

import { s3Client } from '@/lib/s3';

export async function GET(request: NextRequest, { params }: { params: Promise<{ fileName: string }> }) {
  try {
    const { fileName } = await params;
    const s3File = s3Client.file(fileName, {
      acl: 'public-read',
    });
    return new Response(s3File);
  } catch (error) {
    console.error('Error getting employee selfie:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
