/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import type { Employee } from '@/types/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    // Verify admin session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();

    // Get admin's user ID
    const adminUser = await db.collection('users').findOne({ email: session.user?.email });

    if (!adminUser) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }
    const adminEmployee = await db.collection('employees').findOne({ userId: adminUser._id });
    if (!adminEmployee) {
      return NextResponse.json({ error: 'Admin employee not found' }, { status: 404 });
    }

    // Get all supervised employees
    const employees = await db
      .collection<Employee>('employees')
      .find(
        {
          'jobInfo.supervisor': { $in: [adminEmployee._id.toHexString()] },
          isTerminated: { $ne: true },
          hasResigned: { $ne: true },
        },
        {
          projection: {
            'personalInfo.name': 1,
            Staff_ID: 1,
          },
        },
      )
      .toArray();

    return NextResponse.json({ employees });
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
