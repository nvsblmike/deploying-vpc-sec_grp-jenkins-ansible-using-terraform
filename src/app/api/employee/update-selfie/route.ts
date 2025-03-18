import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Employee, Selfie } from '@/types/db';
import { verifyEmployeeRequest } from '@/lib/middleware';
import { serializeEmployeeData } from '@/lib/employee-auth';
import { s3Client } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const verifiedReq = await verifyEmployeeRequest(request);
    if (verifiedReq instanceof NextResponse) {
      return verifiedReq;
    }

    const { fileName } = await request.json();

    if (!fileName) {
      return NextResponse.json(
        {
          error: 'fileName is required',
        },
        { status: 400 },
      );
    }

    const db = await getDb();

    // Get employee ID from verified token
    const employee = await db.collection<Employee>('employees').findOne({
      _id: ObjectId.createFromHexString(verifiedReq.id),
    });
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check for existing selfie record
    const existingSelfie = await db.collection<Selfie>('selfies').findOne({
      employeeId: employee.Staff_ID,
    });

    // If there's an existing selfie, delete the old file from S3
    if (existingSelfie?.fileName) {
      try {
        await s3Client.delete(existingSelfie.fileName);
      } catch (error) {
        console.error('Error deleting old selfie from S3:', error);
        // Continue with the update even if S3 deletion fails
      }
    }

    // Create or update selfie record
    const selfie: Omit<Selfie, '_id'> = {
      employeeId: employee.Staff_ID,
      fileName,
      createdAt: existingSelfie ? existingSelfie.createdAt : new Date(),
      updatedAt: new Date(),
      attendanceConfig: true,
    };

    let result;
    if (existingSelfie) {
      // Update existing record
      result = await db.collection<Selfie>('selfies').updateOne({ employeeId: employee.Staff_ID }, { $set: selfie });
    } else {
      // Create new record
      result = await db.collection<Selfie>('selfies').insertOne(selfie as Selfie);
    }

    if (!result.acknowledged) {
      return NextResponse.json(
        {
          error: 'Failed to save selfie',
        },
        { status: 500 },
      );
    }

    return NextResponse.json(serializeEmployeeData(employee, selfie as Selfie));
  } catch (error) {
    console.error('Error updating selfie:', error);
    return NextResponse.json(
      {
        error: 'Failed to update selfie',
      },
      { status: 500 },
    );
  }
}
