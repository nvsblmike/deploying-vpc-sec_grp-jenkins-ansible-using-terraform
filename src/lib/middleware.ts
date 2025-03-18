import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromAuthHeader, verifyEmployeeToken } from './employee-auth';

export async function verifyEmployeeRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = await getTokenFromAuthHeader(authHeader);

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await verifyEmployeeToken(token).catch(() => {
    return null;
  });
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  return payload;
}
