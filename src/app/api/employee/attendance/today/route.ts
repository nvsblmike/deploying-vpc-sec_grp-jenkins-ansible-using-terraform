import { verifyEmployeeRequest } from '@/lib/middleware';
import { getDb } from '@/lib/mongodb';
import { EmployeeAttendance } from '@/types/db';
import { endOfToday, startOfToday } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';

// Get today's attendance for the employee
export async function POST(request: NextRequest) {
  try {
    const payload = await verifyEmployeeRequest(request);
    if (payload instanceof NextResponse) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const db = await getDb();

    // Get today's attendance record
    const attendance = await db.collection<EmployeeAttendance>('EmployeeAttendance').findOne({
      employeeId: payload.Staff_ID,
      date: {
        $gte: startOfToday(),
        $lt: endOfToday(),
      },
    });

    return NextResponse.json({
      attendance: attendance || null,
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
