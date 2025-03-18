import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Employee } from '@/types/db';
import { verifyEmployeeRequest } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  try {
    const verifiedReq = await verifyEmployeeRequest(request);
    if (verifiedReq instanceof NextResponse) {
      return verifiedReq;
    }

    // Get employee from database
    const db = await getDb();
    const employee = await db.collection<Employee>('employees').findOne({
      _id: ObjectId.createFromHexString(verifiedReq.id),
      Staff_ID: verifiedReq.Staff_ID,
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Get employee's attendance config
    const attendanceConfig = await db.collection('employee_attendance_configs').findOne({
      userId: employee._id,
      isActive: true,
    });

    return NextResponse.json({
      hasSelfie: Boolean(attendanceConfig?.selfiePath),
      requireSelfie: attendanceConfig?.requireSelfie ?? false,
    });
  } catch (error) {
    console.error('Error checking employee selfie:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
