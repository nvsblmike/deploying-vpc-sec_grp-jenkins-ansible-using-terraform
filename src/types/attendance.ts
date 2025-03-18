import { Employee, EmployeeAttendance } from '@/types/db';

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface AttendanceEvent {
  time: string;
  location: Location;
  selfie?: string; // Base64 or URL of the selfie image
  status?: 'pending' | 'approved' | 'rejected' | 'partial';
  remarks?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  date: Date;
  status: 'pending' | 'approved' | 'rejected' | 'partial';
  checkIn: AttendanceEvent;
  checkOut?: AttendanceEvent;
  remarks?: string;
}

export type AttendanceResponse = {
  records: (EmployeeAttendance & { employee: Employee })[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};
