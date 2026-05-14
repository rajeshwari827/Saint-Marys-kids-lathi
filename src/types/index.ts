export enum StudentStandard {
  NURSERY = 'Nursery',
  LKG = 'LKG',
  UKG = 'UKG',
  STD1 = 'Std 1',
  STD2 = 'Std 2',
  STD3 = 'Std 3',
  STD4 = 'Std 4',
  STD5 = 'Std 5',
  STD6 = 'Std 6',
  STD7 = 'Std 7',
  STD8 = 'Std 8',
}

export interface Teacher {
  id: string;
  name: string;
  age: number;
  subject: string;
  qrData: string;
  createdAt: any;
}

export interface Attendance {
  id: string;
  teacherId: string;
  date: string; // YYYY-MM-DD
  entryTime: any;
  exitTime?: any;
  createdAt: any;
}

export interface Student {
  id: string;
  name: string;
  grNumber: string;
  fatherName: string;
  motherName: string;
  address: string;
  age: number;
  placeOfBirth: string;
  dateOfBirth: string;
  standard: StudentStandard;
  createdAt: any;
}

export interface Fee {
  id: string;
  studentId: string;
  semester: 'First' | 'Second';
  amount: number;
  paymentMode: 'UPI' | 'Online' | 'Cheque';
  date: any;
  createdAt: any;
}

export interface Mark {
  fa1?: number; // Unit 1
  fa2?: number; // Unit 2
  sa1?: number; // Semester 1 Exam (calculated as 40 or 100 based on standard)
  internal?: number; // Internal
  total?: number;
  grade?: string;
}

export interface Result {
  id: string;
  studentId: string;
  standard: StudentStandard;
  rollNo: string;
  academicYear: string;
  semester1: Record<string, Mark>; // subjectId -> Mark
  semester2: Record<string, Mark>; // subjectId -> Mark
  attendance?: {
    sem1: string;
    sem2: string;
  };
  createdAt: any;
  updatedAt: any;
}

export interface Admin {
  id: string;
  email: string;
}
