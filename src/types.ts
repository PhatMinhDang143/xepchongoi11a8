export interface Student {
  id: string;
  name: string;
  normalizedName?: string;
  orderNumber: number;
  gender: 'male' | 'female' | 'other';
  dob: string; // e.g. "19/10/2010"
  password: string; // 4-digit date of birth "ddmm", e.g. "1910"
  avatarColor?: string;
  notes?: string;
}

export interface CurrentUser {
  role: 'student' | 'teacher';
  student?: Student;
  teacherName?: string;
}

export interface SeatAssignment {
  seatId: string;
  studentId: string | null;
  assignedAt?: string;
  assignedBy?: string;
}

export interface DeskLayoutConfig {
  rows: number; // 6 rows
  tablesPerRow: number; // 2 tables
  seatsPerTable: number; // 4 seats each
  leftAisleName: string;
  rightAisleName: string;
}

export type ViewPerspective = 'from-teacher' | 'from-students';

export interface ClassroomState {
  className: string;
  teacherName: string;
  schoolYear: string;
  layoutConfig: DeskLayoutConfig;
  perspective: ViewPerspective;
  isLocked: boolean;
  assignments: Record<string, string>; // seatId -> studentId
  lastUpdated: string;
}
