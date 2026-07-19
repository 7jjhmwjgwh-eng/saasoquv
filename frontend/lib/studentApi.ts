const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface StudentProfile {
  id: string;
  full_name: string;
  phone: string | null;
  status: string;
  total_points: number;
}

export interface StudentAttendanceItem {
  id: string;
  status: string;
  points_earned: number;
  lesson_date: string | null;
}

export interface StudentHomeworkItem {
  id: string;
  homework_id: string;
  submitted_at: string | null;
  grade: number | null;
  teacher_comment: string | null;
  is_completed: boolean;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function getStudentToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("student_access_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStudentToken();
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
  return res.json();
}

export const studentApi = {
  login: (subdomain: string, phone: string, password: string) =>
    request<{ access_token: string; student_id: string }>("/api/student-auth/login", {
      method: "POST",
      body: JSON.stringify({ subdomain, phone, password }),
    }),
  me: () => request<StudentProfile>("/api/student-auth/me"),
  attendance: () => request<StudentAttendanceItem[]>("/api/student-auth/me/attendance"),
  homework: () => request<StudentHomeworkItem[]>("/api/student-auth/me/homework"),
};

export { ApiError, getStudentToken };
