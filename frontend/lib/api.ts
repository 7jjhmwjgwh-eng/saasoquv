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
  schedule_slots: ScheduleSlot[];
}

export interface Student {
  id: string;
  full_name: string;
  phone: string | null;
  telegram_id: number | null;
  status: string;
  source: string | null;
  total_points: number;
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
    name: string;
    max_students: number;
    schedule_slots: { room_id: string; weekday: number; start_time: string; end_time: string }[];
  }) => request<Group>("/api/groups", { method: "POST", body: JSON.stringify(payload) }),
  enrollStudent: (groupId: string, studentId: string) =>
    request(`/api/groups/${groupId}/enroll?student_id=${studentId}`, { method: "POST" }),

  listStudents: () => request<Student[]>("/api/students"),
  createStudent: (payload: { full_name: string; phone?: string; source?: string }) =>
    request<Student>("/api/students", { method: "POST", body: JSON.stringify(payload) }),

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
