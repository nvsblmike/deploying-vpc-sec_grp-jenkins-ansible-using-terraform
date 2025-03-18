import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { verifyEmployeeToken, getTokenFromAuthHeader, getEmployeeToken } from '@/lib/employee-auth';
import type { Employee, AttendanceEvent, EmployeeAttendance, AttendanceEventRecord, Selfie } from '@/types/db';
import { endOfToday, startOfToday } from 'date-fns';
import { validateAttendanceSelfie } from '@/lib/faceRecognition';

export async function POST(request: Request) {
  try {
    // Verify employee token
    const authHeader = request.headers.get('authorization');
    const token = (await getTokenFromAuthHeader(authHeader)) || (await getEmployeeToken());

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyEmployeeToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { type, location, fileName } = body as {
      type: 'clockin' | 'clockout';
      location: { latitude: number; longitude: number; address?: string };
      fileName: string;
    };

    if (!type || !location || !fileName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();

    // Get employee
    const employee = await db.collection<Employee>('employees').findOne({
      _id: new ObjectId(payload.id),
      Staff_ID: payload.Staff_ID,
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }
    const selfie = await db.collection<Selfie>('selfies').findOne({
      employeeId: employee.Staff_ID,
      attendanceConfig: true,
    });
    if (!selfie) {
      return NextResponse.json({ error: 'Selfie not found' }, { status: 404 });
    }

    // Validate selfie against employee's photo
    const selfieValidation = await validateAttendanceSelfie(selfie.fileName, fileName);

    if (!selfieValidation.isMatch) {
      return NextResponse.json(
        { error: 'Face verification failed. Please ensure your face is clearly visible.' },
        { status: 400 },
      );
    }

    // Get today's attendance record
    const attendance = await db.collection<EmployeeAttendance>('EmployeeAttendance').findOne({
      employeeId: employee.Staff_ID,
      date: {
        $gte: startOfToday(),
        $lt: endOfToday(),
      },
    });

    const now = new Date();
    const attendanceEvent: AttendanceEvent = {
      location,
      fileName,
      lifenessCheck: 'pending', // This should be updated by a background job
    };

    if (type === 'clockin') {
      if (attendance?.clockIn) {
        return NextResponse.json({ error: 'Already clocked in today' }, { status: 400 });
      }

      // Create attendance event record
      const eventRecord: Omit<AttendanceEventRecord, '_id'> = {
        location,
        fileName,
        lifenessCheck: 'pending',
        status: 'pending',
        createdAt: now,
        updatedAt: now,
        timestamp: now,
      };

      // Create new attendance record
      const newAttendance: Omit<EmployeeAttendance, '_id'> = {
        employeeId: employee.Staff_ID,
        userId: employee._id,
        date: startOfToday(),
        clockIn: eventRecord as AttendanceEventRecord,
        clockOut: null,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };

      await db.collection('EmployeeAttendance').insertOne(newAttendance);

      return NextResponse.json({
        success: true,
        message: 'Successfully clocked in',
        attendance: newAttendance,
      });
    } else {
      // Clock out
      if (!attendance) {
        return NextResponse.json({ error: 'No clock-in record found' }, { status: 400 });
      }

      if (attendance.clockOut) {
        return NextResponse.json({ error: 'Already clocked out today' }, { status: 400 });
      }

      // Create attendance event record
      const eventRecord: Omit<AttendanceEventRecord, '_id'> = {
        ...attendanceEvent,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
        timestamp: now,
      };

      // Update attendance record with clock out
      await db.collection('EmployeeAttendance').updateOne(
        { _id: attendance._id },
        {
          $set: {
            clockOut: eventRecord,
            status: 'pending',
            updatedAt: now,
          },
        },
      );

      const updatedAttendance = await db.collection<EmployeeAttendance>('EmployeeAttendance').findOne({
        _id: attendance._id,
      });

      return NextResponse.json({
        success: true,
        message: 'Successfully clocked out',
        attendance: updatedAttendance,
      });
    }
  } catch (error) {
    console.error('Error processing attendance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
