import { ObjectId } from 'mongodb';

export interface User {
  _id: ObjectId;
  isActive: boolean;
  isSuperAdmin: boolean;
  status: number;
  loggedIn: boolean;
  isAdmin: boolean;
  isFirstTime: boolean;
  isPasswordChange: boolean;
  appLoggedIn: boolean;
  grantAccess: boolean;
  setup_state: number;
  name: {
    first: string;
    last: string;
  };
  username: string;
  password: string;
  email: string;
  Staff_ID: string;
  stage: number;
  isStaff: boolean;
  account_type: number;
  workEmail: string;
  branch: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface Employee {
  _id: ObjectId;
  personalInfo: {
    name: {
      first: string;
      last: string;
      middle: string;
    };
    address: {
      apartment: string;
      street: string;
      city: string;
      state: string;
      zip: string;
    };
    phone: {
      home: string;
    };
    email: string;
    birth: string;
    isAdmin: boolean;
    grantAccess: boolean;
    govtId: string;
    govtType: string;
    gender: string;
    martial: string;
    spouse: {
      name: string;
      employer: string;
      phone: string;
    };
    prevEmployee: {
      employee: string;
      phone: string;
    };
  };
  jobInfo: {
    title: string;
    employeeId: string;
    grade: ObjectId;
    company_id: string;
    supervisor: ObjectId[];
    department: ObjectId;
    email: string;
    password: string;
    workPhone: string;
    cellPhone: string;
    startDate: string;
    joinDate: string;
    salary: string;
    status: string;
    salaryBasis: string;
    contract: boolean;
    contractType: string;
    sfa_id: string;
    workLocationBranch: string;
    confirmDate: string;
    state: string;
    usergrade: ObjectId;
  };
  isTerminated: boolean;
  hasResigned: boolean;
  userId: ObjectId;
  Staff_ID: string;
  branch: ObjectId;
  educationInfo: EducationInfo[];
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountType: string;
    accountOfficer: string;
    bankCode: string;
    pensionNumber: string;
    pensionAdmin: string;
  };
  emergencyInfo: {
    name: {
      first: string;
      last: string;
      middle: string;
    };
    address: {
      apartment: string;
      street: string;
      city: string;
      state: string;
      zip: string;
    };
    phone: {
      primary: string;
      secondary: string;
    };
    guarantor: {
      title: string;
      name: string;
      phone: string;
      address: string;
    };
    referee: {
      title: string;
      name: string;
      phone: string;
      address: string;
    };
    relation: string;
    employeeHMO: EmployeeHMO;
    lifeInsurance: LifeInsurance;
    image: string;
    resume: string;
  };
}

export interface EducationInfo {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  grade?: string;
}

export interface EmployeeHMO {
  provider: string;
  plan: string;
  membershipNumber?: string;
}

export interface LifeInsurance {
  provider: string;
  policyNumber?: string;
  coverage?: string;
}

export interface Selfie {
  _id: ObjectId;
  attendanceConfig?: boolean;
  employeeId: string;
  fileName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceEvent {
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  fileName: string;
  lifenessCheck?: 'positive' | 'negative' | 'pending';
}

export interface AttendanceEventRecord {
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  fileName: string;
  lifenessCheck?: 'positive' | 'negative' | 'pending';
  status?: 'pending' | 'approved' | 'rejected' | 'partial';
  remarks?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export interface EmployeeAttendance {
  _id: ObjectId;
  employeeId: string;
  userId: ObjectId;
  date: Date;
  clockIn: AttendanceEventRecord;
  clockOut: AttendanceEventRecord | null;
  status: 'pending' | 'approved' | 'rejected' | 'partial';
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeoFence {
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  address?: string;
}

export interface WorkingHours {
  start: string; // Format: "HH:mm"
  end: string; // Format: "HH:mm"
  flexibleTime: number; // in minutes, allowed early/late time
  breakTime?: number; // Optional break time in minutes
}

export interface AttendanceConfigGroup {
  _id: ObjectId;
  description?: string;
  branch?: ObjectId;
  allowedLocations: GeoFence[];
  workingHours: WorkingHours;
  requireSelfie: boolean;
  createdAt: Date;
  updatedAt: Date;
  supervisorId: ObjectId;
}

export interface EmployeeAttendanceConfig {
  _id: ObjectId;
  employeeId: string;
  userId: ObjectId;
  configGroupId: ObjectId;
  selfiePath: string;
  overrideSettings?: {
    allowedLocations?: GeoFence[];
    workingHours?: WorkingHours;
    requireSelfie?: boolean;
    allowRemoteWork?: boolean;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenRevision {
  _id: ObjectId;
  userId: ObjectId;
  revision: number;
  updatedAt: Date;
  createdAt: Date;
}
