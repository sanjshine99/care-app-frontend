// src/types/api.ts
// Shared TypeScript interfaces for all API response shapes.
// Use these when calling API endpoints or consuming React Query results.

// ============================================================
// COMMON
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: ApiError;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Array<{ field: string; message: string }>;
}

export interface Pagination {
  page: number;
  pages: number;
  total: number;
  limit: number;
}

// ============================================================
// ADDRESS & GEO
// ============================================================

export interface Address {
  street?: string;
  city?: string;
  postcode?: string;
  full?: string;
}

export interface GeoPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

// ============================================================
// CARE GIVER
// ============================================================

export type CareGiverStatus = "active" | "inactive";
export type DrivingLicense = "yes" | "no";

export interface TimeOff {
  _id?: string;
  startDate: string; // ISO date string
  endDate: string;
  reason?: string;
}

export interface AvailabilitySlot {
  day: string; // "Monday", "Tuesday", etc.
  startTime: string; // "HH:MM"
  endTime: string;
}

export interface CareGiver {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: Address;
  coordinates?: GeoPoint;
  skills: string[];
  isActive: boolean;
  canDrive: boolean;
  availability?: AvailabilitySlot[];
  timeOff?: TimeOff[];
  genderPreference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CareGiversListData {
  careGivers: CareGiver[];
  pagination: Pagination;
}

// ============================================================
// CARE RECEIVER
// ============================================================

export interface VisitPattern {
  day: string;
  visitNumber: number;
  startTime?: string;
  endTime?: string;
  duration?: number;
  requiredSkills?: string[];
  genderPreference?: string;
}

export interface CareReceiver {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: Address;
  coordinates?: GeoPoint;
  isActive: boolean;
  dailyVisits: number;
  visitPattern?: VisitPattern[];
  genderPreference?: string;
  requiredSkills?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CareReceiversListData {
  careReceivers: CareReceiver[];
  pagination: Pagination;
}

// ============================================================
// APPOINTMENT
// ============================================================

export type AppointmentStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "needs_reassignment";

export interface Appointment {
  _id: string;
  careReceiver: Pick<CareReceiver, "_id" | "name" | "phone" | "address"> | string;
  careGiver: Pick<CareGiver, "_id" | "name" | "email" | "phone"> | string | null;
  secondaryCareGiver?: Pick<CareGiver, "_id" | "name" | "email" | "phone"> | string | null;
  date: string; // ISO date string
  visitNumber: number;
  startTime?: string;
  endTime?: string;
  status: AppointmentStatus;
  invalidationReason?: string;
  invalidatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentsListData {
  appointments: Appointment[];
  pagination?: Pagination;
}

// ============================================================
// SCHEDULE GENERATION
// ============================================================

export interface ScheduleResult {
  careReceiverId: string;
  scheduled: Appointment[];
  failed: Array<{
    date: string;
    visit?: { visitNumber: number };
    reason: string;
  }>;
}

export interface ScheduleSummary {
  totalScheduled: number;
  totalFailed: number;
  careReceiversProcessed: number;
}

export interface GenerateScheduleData {
  results: ScheduleResult[];
  summary: ScheduleSummary;
}

export interface ValidateScheduleData {
  summary: {
    total: number;
    valid: number;
    invalid: number;
  };
  appointments: Appointment[];
}

// ============================================================
// UNSCHEDULED
// ============================================================

export interface UnscheduledItem {
  careReceiver: {
    id: string;
    name: string;
    address?: { city?: string };
  };
  missing: number;
  dates?: string[];
}

export interface UnscheduledData {
  unscheduled: UnscheduledItem[];
}

// ============================================================
// NOTIFICATION
// ============================================================

export type NotificationStatus = "unread" | "read" | "archived" | "completed";
export type NotificationType = "success" | "error" | "warning" | "info";
export type NotificationPriority = "low" | "medium" | "high" | "critical";

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  actionRequired: boolean;
  actionUrl?: string;
  actionLabel?: string;
  adminUser: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsListData {
  notifications: Notification[];
  pagination: Pagination;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  archived: number;
  actionRequired: number;
  byPriority?: { low: number; medium: number; high: number; critical: number };
  byType?: { success: number; error: number; warning: number; info: number };
}

export interface NotificationStatsData {
  stats: NotificationStats;
}

// ============================================================
// DASHBOARD
// ============================================================

export interface DashboardStats {
  totalCareGivers: number;
  activeCareGivers: number;
  totalCareReceivers: number;
  activeCareReceivers: number;
  totalAppointments: number;
  scheduledAppointments: number;
  completedAppointments: number;
  needsReassignment: number;
  unreadNotifications: number;
}

// ============================================================
// SETTINGS
// ============================================================

export interface Settings {
  _id?: string;
  schedulingRadius?: number;
  autoScheduleMonths?: number;
  notificationRetentionDays?: number;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  maxVisitsPerDayCareGiver?: number;
  allowWeekendVisits?: boolean;
  defaultVisitDuration?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================
// AUTH
// ============================================================

export interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "viewer";
  isActive: boolean;
  createdAt: string;
}

export interface LoginData {
  token: string;
  user: User;
}

export interface AuthMeData {
  user: User;
}
