import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import type { EmployeeAttendance } from '@/types/db';
import { verifyEmployeeRequest } from '@/lib/middleware';

interface AttendanceFilter {
  employeeId: string;
  date?: {
    $gte?: Date;
    $lte?: Date;
  };
  status?: EmployeeAttendance['status'];
}

export async function GET(request: NextRequest) {
  try {
    const payload = await verifyEmployeeRequest(request);
    if (payload instanceof NextResponse) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status') as EmployeeAttendance['status'];

    // Build query
    const matchStage: AttendanceFilter = {
      employeeId: payload.Staff_ID,
    };

    // Add date range filter if provided
    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) {
        matchStage.date.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.date.$lte = new Date(endDate);
      }
    }

    // Add status filter if provided
    if (status) {
      matchStage.status = status;
    }

    const db = await getDb();
    // Get total count for pagination
    const total = await db.collection('EmployeeAttendance').countDocuments(matchStage);

    // Get paginated attendance records
    const attendanceRecords = await db
      .collection<EmployeeAttendance>('EmployeeAttendance')
      .find(matchStage)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();
    return NextResponse.json({
      records: attendanceRecords,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching attendance history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
