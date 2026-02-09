export type Role = "ADMIN" | "CLIENT";

export type CourseStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";

export type RegistrationStatus = "INSERTED" | "CONFIRMED" | "TRAINED";

export type NotificationType =
  | "COURSE_PUBLISHED"
  | "CERT_UPLOADED"
  | "REMINDER"
  | "ATTENDANCE_RECORDED";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "ABSENT_JUSTIFIED";

export interface Employee {
  id: string;
  clientId: string;
  nome: string;
  cognome: string;
  codiceFiscale: string;
  dataNascita?: Date | string | null;
  luogoNascita?: string | null;
  email?: string | null;
  telefono?: string | null;
  mansione?: string | null;
  note?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface EmployeeWithStats extends Employee {
  client?: { id: string; ragioneSociale: string };
  _count?: { registrations: number; certificates?: number };
  coursesCompleted?: number;
  certificatesCount?: number;
}

export interface Certificate {
  id: string;
  clientId: string;
  courseEditionId?: string | null;
  employeeId: string;
  filePath: string;
  achievedAt?: Date | string | null;
  expiresAt?: Date | string | null;
  uploadedAt?: Date | string;
  uploadedBy?: string;
  employee?: Employee;
  courseEdition?: {
    id: string;
    editionNumber: number;
    course?: { id: string; title: string };
  } | null;
}

export interface CertificateWithRelations extends Certificate {
  employee: Employee;
  courseEdition?: {
    id: string;
    editionNumber: number;
    course?: { id: string; title: string };
  } | null;
  client?: { id: string; ragioneSociale: string };
}

export interface CertificateUploadData {
  employeeId: string;
  courseEditionId?: string;
  file: File;
}

export interface Lesson {
  id: string;
  courseEditionId: string;
  date: Date | string;
  startTime?: string | null;
  endTime?: string | null;
  durationHours: number;
  title?: string | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  _count?: { attendances: number };
}

export interface LessonFormData {
  date: string;
  startTime?: string;
  endTime?: string;
  durationHours: number;
  title?: string;
  notes?: string;
}

export interface Attendance {
  id: string;
  lessonId: string;
  employeeId: string;
  status: AttendanceStatus;
  notes?: string | null;
  recordedBy?: string | null;
  recordedAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  lesson?: Lesson;
  employee?: Employee;
}

export interface AttendanceUpdate {
  lessonId: string;
  employeeId: string;
  status: AttendanceStatus;
  notes?: string;
}

export interface EmployeeAttendanceStats {
  employeeId: string;
  employeeName: string;
  totalLessons: number;
  present: number;
  absent: number;
  justified: number;
  percentage: number;
  totalHours: number;
  attendedHours: number;
  belowMinimum: boolean;
}

export interface CourseAttendanceSummary {
  courseEditionId: string;
  totalLessons: number;
  totalHours: number;
  employeeStats: EmployeeAttendanceStats[];
}

export interface CourseTemplate {
  id: string;
  title: string;
  description?: string | null;
  durationHours?: number | null;
  visibilityType?: "ALL" | "SELECTED_CLIENTS" | "BY_CATEGORY";
  categories?: Array<{ id: string; name: string; color?: string | null }>;
}

export interface CourseEdition {
  id: string;
  courseId: string;
  clientId: string;
  editionNumber: number;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  deadlineRegistry?: Date | string | null;
  status: CourseStatus;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  course?: CourseTemplate;
  client?: { id: string; ragioneSociale: string };
  _count?: {
    registrations?: number;
    attendances?: number;
    certificates?: number;
    lessons?: number;
  };
}

export interface ClientBranding {
  primaryColor: string | null;
  secondaryColor: string | null;
  sidebarBgColor: string | null;
  sidebarTextColor: string | null;
  logoPath: string | null;
  logoLightPath: string | null;
  faviconPath?: string | null;
}

export interface ColorPalette {
  id: string;
  name: string;
  emoji: string;
  primary: string | null;
  secondary: string | null;
  sidebarBg: string | null;
  sidebarText: string | null;
}
