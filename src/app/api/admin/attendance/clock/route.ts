/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Employee, EmployeeAttendance, AttendanceEventRecord } from '@/types/db';
import { endOfToday, startOfToday } from 'date-fns';

export async function POST(request: Request) {
  try {
    // Verify admin session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, employeeId, location, timestamp } = body as {
      type: 'clockin' | 'clockout';
      employeeId: string;
      location: { latitude: number; longitude: number; address?: string };
      timestamp?: string; // ISO string for custom time
    };

    if (!type || !employeeId || !location) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();

    // Get admin's user ID
    const adminUser = await db.collection('users').findOne({ email: session.user?.email });

    if (!adminUser) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    // Verify employee exists and admin is their supervisor
    const employee = await db.collection<Employee>('employees').findOne({
      Staff_ID: employeeId,
      'jobInfo.supervisor': { $in: [adminUser._id.toHexString()] },
      isTerminated: { $ne: true },
      hasResigned: { $ne: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found or unauthorized' }, { status: 404 });
    }

    // Get today's attendance record
    const attendance = await db.collection<EmployeeAttendance>('EmployeeAttendance').findOne({
      employeeId: employee.Staff_ID,
      date: {
        $gte: startOfToday(),
        $lt: endOfToday(),
      },
    });

    const now = timestamp ? new Date(timestamp) : new Date();

    // Create attendance event record
    const eventRecord: Omit<AttendanceEventRecord, '_id'> = {
      location,
      fileName: '', // No selfie for supervisor-initiated clock events
      lifenessCheck: 'pending', // Skip liveness check for supervisor-initiated clock events
      status: 'approved', // Auto-approve supervisor-initiated clock events
      createdAt: new Date(),
      updatedAt: new Date(),
      timestamp: now,
    };

    if (type === 'clockin') {
      if (attendance?.clockIn) {
        return NextResponse.json({ error: 'Employee already clocked in today' }, { status: 400 });
      }

      // Create new attendance record
      const newAttendance: Omit<EmployeeAttendance, '_id'> = {
        employeeId: employee.Staff_ID,
        userId: employee._id,
        date: startOfToday(),
        clockIn: eventRecord as AttendanceEventRecord,
        clockOut: null,
        status: 'pending',
        remarks: `Clock-in by supervisor: ${session.user?.email}${timestamp ? ' (Manual time set)' : ''}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection<EmployeeAttendance>('EmployeeAttendance').insertOne(newAttendance as any);
    } else {
      if (!attendance) {
        return NextResponse.json({ error: 'No clock-in record found for today' }, { status: 400 });
      }

      if (attendance.clockOut) {
        return NextResponse.json({ error: 'Employee already clocked out today' }, { status: 400 });
      }

      // Update existing attendance record with clock-out
      await db.collection<EmployeeAttendance>('EmployeeAttendance').updateOne(
        { _id: attendance._id },
        {
          $set: {
            clockOut: eventRecord as AttendanceEventRecord,
            status: 'approved',
            remarks: `${attendance.remarks || ''}\nClock-out by supervisor: ${session.user?.email}${
              timestamp ? ' (Manual time set)' : ''
            }`.trim(),
          },
        },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in supervisor clock in/out:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
