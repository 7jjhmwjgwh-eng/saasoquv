"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";

const ROLE_ROUTES: Record<string, string> = {
  owner: "/director",
  admin: "/admin",
  teacher: "/teacher",
};

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    const role = localStorage.getItem("user_role") ?? "";
    router.replace(ROLE_ROUTES[role] ?? "/director");
  }, [router]);

  return null;
}
