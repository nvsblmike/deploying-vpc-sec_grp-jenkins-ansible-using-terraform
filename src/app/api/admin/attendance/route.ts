/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { EmployeeAttendance, Employee } from '@/types/db';

interface AttendanceFilter {
  employeeId?: string;
  date?: {
    $gte?: Date;
    $lte?: Date;
  };
  status?: string;
}

export async function GET(request: Request) {
  try {
    // Verify admin session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Pagination params
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Filter params
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');
    const search = searchParams.get('search');
    const supervisor = searchParams.get('supervisor');

    const db = await getDb();

    // Get admin's user ID
    const adminUser = await db.collection('users').findOne({ email: session.user?.email });

    if (!adminUser) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }
    const employee = await db.collection('employees').findOne({ userId: adminUser._id });
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }
    // Get list of employees where this admin is a supervisor
    const supervisedEmployees = await db
      .collection<Employee>('employees')
      .find({
        $or: [
          { 'jobInfo.supervisor': { $in: [adminUser._id.toHexString()] } },
          { 'jobInfo.supervisor': { $in: [employee._id.toHexString()] } },
        ],
      })
      .toArray();

    const supervisedStaffIds = supervisedEmployees.map((emp) => emp.Staff_ID);

    // Build the base pipeline
    const pipeline: any[] = [
      // First match stage to filter by supervised employees
      {
        $match: {
          employeeId: { $in: supervisedStaffIds },
        },
      },
    ];

    // Match stage for attendance filters
    const matchStage: AttendanceFilter = {};

    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) matchStage.date.$gte = new Date(startDate);
      if (endDate) matchStage.date.$lte = new Date(endDate);
    }

    if (status) matchStage.status = status;
    if (employeeId) matchStage.employeeId = employeeId;

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // Lookup employee details
    pipeline.push({
      $lookup: {
        from: 'employees',
        let: { userId: '$userId' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$_id', '$$userId'] },
            },
          },
          {
            $project: {
              'personalInfo.name': 1,
              'personalInfo.email': 1,
              Staff_ID: 1,
              branch: 1,
              'jobInfo.supervisor': 1,
            },
          },
        ],
        as: 'employee',
      },
    });

    // Unwind employee array (converts array to object)
    pipeline.push({ $unwind: '$employee' });

    // Additional filters based on employee data
    if (search || supervisor) {
      const employeeMatch: any = {};

      if (search) {
        employeeMatch.$or = [
          { 'employee.Staff_ID': { $regex: search, $options: 'i' } },
          { 'employee.personalInfo.name.first': { $regex: search, $options: 'i' } },
          { 'employee.personalInfo.name.last': { $regex: search, $options: 'i' } },
        ];
      }

      if (supervisor) {
        employeeMatch['employee.jobInfo.supervisor'] = new ObjectId(supervisor);
      }

      if (Object.keys(employeeMatch).length > 0) {
        pipeline.push({ $match: employeeMatch });
      }
    }

    // Count total documents for pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const [countResult] = await db.collection('EmployeeAttendance').aggregate(countPipeline).toArray();
    const total = countResult?.total || 0;

    // Add sorting and pagination
    pipeline.push({ $sort: { createdAt: -1 } }, { $skip: (page - 1) * limit }, { $limit: limit });

    // Execute the query
    const records = await db.collection<EmployeeAttendance>('EmployeeAttendance').aggregate(pipeline).toArray();

    return NextResponse.json({
      records,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update attendance status (approve/reject)
export async function PATCH(request: Request) {
  try {
    // Verify admin session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { attendanceId, status, remarks, eventType } = body as {
      attendanceId: string;
      status: 'approved' | 'rejected';
      remarks?: string;
      eventType?: 'checkIn' | 'checkOut';
    };

    if (!attendanceId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (status === 'rejected' && !remarks?.trim()) {
      return NextResponse.json({ error: 'Remarks are required when rejecting attendance' }, { status: 400 });
    }

    const db = await getDb();

    // If eventType is specified, only update that specific event's status
    if (eventType) {
      const updateField = eventType === 'checkIn' ? 'clockIn.status' : 'clockOut.status';
      const remarksField = eventType === 'checkIn' ? 'clockIn.remarks' : 'clockOut.remarks';

      const result = await db.collection('EmployeeAttendance').updateOne(
        { _id: new ObjectId(attendanceId) },
        {
          $set: {
            [updateField]: status,
            [remarksField]: remarks,
            updatedAt: new Date(),
            // Set overall status to partial if events have different statuses
            status: 'partial',
          },
        },
      );

      if (result.matchedCount === 0) {
        return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
      }

      // Check if both events are approved/rejected and update overall status accordingly
      const record = await db.collection('EmployeeAttendance').findOne({ _id: new ObjectId(attendanceId) });
      if (record) {
        const clockInStatus = record.clockIn?.status;
        const clockOutStatus = record.clockOut?.status;

        if (clockInStatus === clockOutStatus) {
          await db.collection('EmployeeAttendance').updateOne(
            { _id: new ObjectId(attendanceId) },
            {
              $set: {
                status: clockInStatus,
                updatedAt: new Date(),
              },
            },
          );
        }
      }
    } else {
      // Update overall attendance status (legacy behavior)
      const result = await db.collection('EmployeeAttendance').updateOne(
        { _id: new ObjectId(attendanceId) },
        {
          $set: {
            status,
            remarks,
            'clockIn.status': status,
            'clockOut.status': status,
            updatedAt: new Date(),
          },
        },
      );

      if (result.matchedCount === 0) {
        return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Attendance ${eventType ? eventType + ' ' : ''}${status} successfully`,
    });
  } catch (error) {
    console.error('Error updating attendance status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
