const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Room {
  id: string;
  name: string;
  capacity: number;
  is_active: boolean;
}

export interface Level {
  id: string;
  name: string;
  order_index: number;
}

export interface Course {
  id: string;
  name: string;
  description: string | null;
  levels: Level[];
}

export interface ScheduleSlot {
  id: string;
  room_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

export interface Group {
  id: string;
  course_id: string;
  level_id: string | null;
  teacher_id: string | null;
  name: string;
  max_students: number;
  status: string;
  enrolled_count: number;
  free_slots: number;
  is_full: boolean;
  schedule_slots: ScheduleSlot[];
}

export interface Student {
  id: string;
  full_name: string;
  phone: string | null;
  parent_phone: string | null;
  birth_date: string | null;
  telegram_id: number | null;
  status: string;
  source: string | null;
  total_points: number;
  paid_until: string | null;
  is_payment_overdue: boolean;
  lessons_total: number;
  lessons_missed: number;
  lessons_late: number;
  student_code: string | null;
}

export interface Payment {
  id: string;
  student_id: string;
  amount: string;
  method: string;
  status: string;
  paid_at: string;
  valid_until: string | null;
  comment: string | null;
}

export interface Debtor {
  student_id: string;
  full_name: string;
  phone: string | null;
  paid_until: string | null;
  days_overdue: number | null;
}

export interface ScheduleOverviewItem {
  weekday: string;
  start_time: string;
  end_time: string;
  room_name: string;
  room_capacity: number | null;
  group_name: string;
  teacher_id: string | null;
  enrolled_count: number;
  free_slots: number;
  is_full: boolean;
}

export interface PaymentExpiring {
  id: string;
  student_id: string;
  amount: string;
  valid_until: string | null;
}

export interface GroupStudent {
  id: string;
  full_name: string;
  phone: string | null;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  status: string;
  points_earned: number;
}

export interface Lesson {
  id: string;
  group_id: string;
  room_id: string | null;
  date: string;
  topic: string | null;
  is_cancelled: boolean;
  attendance_records: AttendanceRecord[];
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail || "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  login: (email: string, subdomain: string, password: string) =>
    request<{ access_token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, subdomain, password }),
    }),

  register: (payload: {
    tenant_name: string;
    subdomain: string;
    owner_full_name: string;
    owner_email: string;
    owner_password: string;
  }) =>
    request<{ access_token: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listRooms: () => request<Room[]>("/api/rooms"),
  createRoom: (payload: { name: string; capacity: number }) =>
    request<Room>("/api/rooms", { method: "POST", body: JSON.stringify(payload) }),

  listCourses: () => request<Course[]>("/api/courses"),
  createCourse: (payload: { name: string; description?: string; levels: string[] }) =>
    request<Course>("/api/courses", { method: "POST", body: JSON.stringify(payload) }),

  listGroups: () => request<Group[]>("/api/groups"),
  createGroup: (payload: {
    course_id: string;
    level_id?: string;
    teacher_id?: string;
    name: string;
    max_students: number;
    schedule_slots: { room_id: string; weekday: number; start_time: string; end_time: string }[];
  }) => request<Group>("/api/groups", { method: "POST", body: JSON.stringify(payload) }),
  deleteGroup: (id: string) => request<{ status: string; reason?: string }>(`/api/groups/${id}`, { method: "DELETE" }),
  enrollStudent: (groupId: string, studentId: string) =>
    request(`/api/groups/${groupId}/enroll?student_id=${studentId}`, { method: "POST" }),

  listStudents: () => request<Student[]>("/api/students"),
  createStudent: (payload: {
    full_name: string;
    phone?: string;
    parent_phone?: string;
    birth_date?: string;
    source?: string;
  }) => request<Student>("/api/students", { method: "POST", body: JSON.stringify(payload) }),

  updateStudent: (id: string, payload: Record<string, unknown>) =>
    request<Student>(`/api/students/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteStudent: (id: string) => request<{ status: string; reason?: string }>(`/api/students/${id}`, { method: "DELETE" }),
  studentPayments: (id: string) => request<Payment[]>(`/api/payments/student/${id}`),

  listPayments: () => request<Payment[]>("/api/payments"),
  listDebtors: () => request<Debtor[]>("/api/payments/debtors"),
  createPayment: (payload: {
    student_id: string;
    amount: number;
    method: string;
    paid_at: string;
    valid_until?: string;
    comment?: string;
  }) => request<Payment>("/api/payments", { method: "POST", body: JSON.stringify(payload) }),

  getScheduleOverview: () => request<ScheduleOverviewItem[]>("/api/schedule-overview"),

  getExpiringPayments: (withinDays = 3) =>
    request<PaymentExpiring[]>(`/api/payments/expiring?within_days=${withinDays}`),

  setStudentPassword: (studentId: string, password: string) =>
    request(`/api/student-auth/students/${studentId}/set-password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  enrollStudentInGroup: (groupId: string, studentId: string) =>
    request(`/api/groups/${groupId}/enroll?student_id=${studentId}`, { method: "POST" }),

  getGroupStudents: (groupId: string) => request<GroupStudent[]>(`/api/groups/${groupId}/students`),

  getOrCreateLesson: (groupId: string, date: string) =>
    request<Lesson>("/api/attendance/lessons/get-or-create", {
      method: "POST",
      body: JSON.stringify({ group_id: groupId, date }),
    }),

  markAttendance: (lessonId: string, records: { student_id: string; status: string }[]) =>
    request("/api/attendance/mark", {
      method: "POST",
      body: JSON.stringify({ lesson_id: lessonId, records }),
    }),
};

export { ApiError, getToken };

export interface StaffMember {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
  telegram_id: number | null;
}

export interface TenantInfo {
  id: string;
  code: string;
  name: string;
  subdomain: string;
  plan: string;
  is_active: boolean;
  created_at: string;
  owner_email: string | null;
  active_students: number;
  revenue_this_month: number;
}

export const staffApi = {
  list: () => request<StaffMember[]>("/api/staff"),
  create: (payload: { full_name: string; phone?: string; email?: string; password: string; role: string }) =>
    request<StaffMember>("/api/staff", { method: "POST", body: JSON.stringify(payload) }),
  update: (id: string, payload: Record<string, unknown>) =>
    request<StaffMember>(`/api/staff/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
};

export const superApi = {
  listTenants: (token: string) =>
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/superadmin/tenants`, {
      headers: { "X-Super-Token": token },
    }).then((r) => r.json()) as Promise<TenantInfo[]>,
  toggle: (token: string, id: string) =>
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/superadmin/tenants/${id}/toggle`, {
      method: "PATCH",
      headers: { "X-Super-Token": token },
    }).then((r) => r.json()),
};
