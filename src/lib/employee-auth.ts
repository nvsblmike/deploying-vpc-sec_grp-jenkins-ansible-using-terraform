import { SignJWT, jwtVerify } from 'jose';
import { ObjectId } from 'mongodb';
import { getDb } from './mongodb';
import type { Employee, Selfie, TokenRevision } from '@/types/db';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(process.env.EMPLOYEE_JWT_SECRET || 'default_employee_secret_key_change_this');

export async function createEmployeeToken(payload: { id: string; Staff_ID: string }) {
  const db = await getDb();

  // Get or create token revision
  const tokenRevision = await db.collection<TokenRevision>('token_revisions').findOneAndUpdate(
    { userId: new ObjectId(payload.id) },
    {
      $inc: { revision: 1 },
      $setOnInsert: { createdAt: new Date() },
      $set: { updatedAt: new Date() },
    },
    {
      upsert: true,
      returnDocument: 'after',
    },
  );

  return await new SignJWT({
    id: payload.id,
    Staff_ID: payload.Staff_ID,
    type: 'employee',
    tokenRevision: tokenRevision?.revision,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30 days')
    .sign(JWT_SECRET);
}

export async function verifyEmployeeToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    const db = await getDb();

    // Check token revisio
    const currentRevision = await db.collection<TokenRevision>('token_revisions').findOne({
      userId: new ObjectId(payload.id as string),
    });

    if (!currentRevision || (payload.tokenRevision as number) < currentRevision.revision) {
      throw new Error('Token revision is outdated');
    }

    return payload as { id: string; Staff_ID: string; type: string; tokenRevision: number };
  } catch {
    throw new Error('Invalid token');
  }
}

export async function getEmployeeToken() {
  const cookieStore = await cookies();
  return cookieStore.get('employee_token')?.value;
}

export async function getTokenFromAuthHeader(authHeader?: string | null) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

export function serializeEmployeeData(employee: Employee, selfie: Selfie | null) {
  return {
    id: employee._id.toString(),
    email: employee.personalInfo.email,
    staffId: employee.Staff_ID,
    name: [employee.personalInfo.name.first, employee.personalInfo.name.last].join(' '),
    title: employee.jobInfo.title,
    selfie: selfie?.fileName,
  };
}
