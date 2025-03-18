import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Employee, EmployeeAttendanceConfig, AttendanceConfigGroup } from '@/types/db';
import { verifyEmployeeRequest } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  try {
    const payload = await verifyEmployeeRequest(request);
    if (payload instanceof NextResponse) {
      return payload;
    }

    const db = await getDb();
    const employee = await db.collection<Employee>('employees').findOne({
      _id: ObjectId.createFromHexString(payload.id),
    });

    // Get employee's attendance config
    const employeeConfig = await db.collection<EmployeeAttendanceConfig>('employee_attendance_configs').findOne({
      employeeId: payload.Staff_ID,
    });

    if (employeeConfig) {
      return NextResponse.json(employeeConfig.overrideSettings);
    }
    if (!employee?.jobInfo.supervisor?.length) {
      return NextResponse.json({ data: {} });
    }
    // Get the supervisor's config group
    const configGroup = await db.collection<AttendanceConfigGroup>('attendance_config_groups').findOne({
      supervisorId: employee?.jobInfo.supervisor[0],
    });

    if (!configGroup) {
      return NextResponse.json({ error: 'Configuration group not found' }, { status: 404 });
    }
    return NextResponse.json(configGroup);
  } catch (error) {
    console.error('Error fetching employee config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
