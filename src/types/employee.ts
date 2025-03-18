export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  photoUrl: string;
  joinDate: Date;
}

export interface EmployeeFormData extends Omit<Employee, 'id' | 'photoUrl'> {
  photo: File | null;
}