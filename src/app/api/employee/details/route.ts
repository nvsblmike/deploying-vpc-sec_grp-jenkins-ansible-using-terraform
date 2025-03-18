import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Employee } from '@/types/db';
import { verifyEmployeeRequest } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  try {
    const payload = await verifyEmployeeRequest(request);
    if (payload instanceof NextResponse) {
      return payload;
    }

    const db = await getDb();

    // Get employee details
    const employee = await db.collection<Employee>('employees').findOne(
      {
        _id: new ObjectId(payload.id),
        Staff_ID: payload.Staff_ID,
        isActive: true,
      },
      {
        projection: {
          'personalInfo.name': 1,
          'personalInfo.email': 1,
          'personalInfo.phone': 1,
          'personalInfo.address': 1,
          'jobInfo.title': 1,
          'jobInfo.department': 1,
          'jobInfo.startDate': 1,
          'jobInfo.workLocationBranch': 1,
          Staff_ID: 1,
          branch: 1,
          isActive: 1,
        },
      },
    );

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Get attendance config for this employee
    const attendanceConfig = await db.collection('employee_attendance_configs').findOne(
      {
        userId: employee._id,
        isActive: true,
      },
      {
        projection: {
          allowedLocations: 1,
          workingHours: 1,
          requireSelfie: 1,
        },
      },
    );

    // Get attendance statistics
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthlyStats = await db
      .collection('EmployeeAttendance')
      .aggregate([
        {
          $match: {
            employeeId: employee.Staff_ID,
            date: {
              $gte: startOfMonth,
              $lte: endOfMonth,
            },
          },
        },
        {
          $group: {
            _id: null,
            totalDays: { $sum: 1 },
            onTime: {
              $sum: {
                $cond: [{ $eq: ['$status', 'approved'] }, 1, 0],
              },
            },
            late: {
              $sum: {
                $cond: [{ $eq: ['$status', 'late'] }, 1, 0],
              },
            },
            absent: {
              $sum: {
                $cond: [{ $eq: ['$status', 'absent'] }, 1, 0],
              },
            },
          },
        },
      ])
      .toArray();

    return NextResponse.json({
      employee,
      attendanceConfig,
      statistics: monthlyStats[0] || {
        totalDays: 0,
        onTime: 0,
        late: 0,
        absent: 0,
      },
    });
  } catch (error) {
    console.error('Error fetching employee details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
