import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { GeoFence, WorkingHours } from '@/types/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface AttendanceConfig {
  _id?: ObjectId;
  allowedLocations: GeoFence[];
  workingHours: WorkingHours;
  requireSelfie: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function GET() {
  try {
    // Verify admin session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const config = await db.collection<AttendanceConfig>('attendance_config_groups').findOne({});

    if (!config) {
      // Return default config if none exists
      return NextResponse.json({
        allowedLocations: [],
        workingHours: {
          start: '09:00',
          end: '17:00',
          flexibleTime: 30,
          breakTime: 60,
        },
        requireSelfie: false,
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching attendance config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Verify admin session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { allowedLocations, workingHours, requireSelfie } = body as AttendanceConfig;

    // Validate required fields
    if (!workingHours?.start || !workingHours?.end) {
      return NextResponse.json(
        { error: 'Working hours start and end times are required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const config = await db.collection<AttendanceConfig>('attendance_config_groups').findOne({});

    const now = new Date();

    if (config) {
      // Update existing config
      await db.collection('attendance_config_groups').updateOne(
        { _id: config._id },
        {
          $set: {
            allowedLocations,
            workingHours,
            requireSelfie,
            updatedAt: now,
          },
        }
      );
    } else {
      // Create new config
      await db.collection('attendance_config_groups').insertOne({
        allowedLocations,
        workingHours,
        requireSelfie,
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating attendance config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
