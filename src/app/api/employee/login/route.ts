import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { checkPassword } from '@/lib/password';
import { createEmployeeToken, serializeEmployeeData } from '@/lib/employee-auth';
import type { Employee, Selfie, User } from '@/types/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { staffId, password } = body as { staffId: string; password: string };

    if (!staffId || !password) {
      return NextResponse.json({ error: 'Staff ID and password are required' }, { status: 400 });
    }

    const db = await getDb();

    const user = await db.collection<User>('users').findOne({
      Staff_ID: staffId,
      isActive: true,
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    const employee = await db.collection<Employee>('employees').findOne({
      'jobInfo.employeeId': staffId,
    });
    if (!employee) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValidPassword = checkPassword(user.password, password);

    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await createEmployeeToken({
      id: employee._id.toString(),
      Staff_ID: employee.Staff_ID,
    });

    // Get employee's selfie
    const selfie = await db.collection('selfies').findOne(
      {
        employeeId: employee.Staff_ID,
      },
      {
        sort: { createdAt: -1 }, // Get the most recent selfie
      },
    );

    return NextResponse.json({
      token,
      user: serializeEmployeeData(employee, selfie as Selfie),
    });
  } catch (error) {
    console.error('Employee login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
