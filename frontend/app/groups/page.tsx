"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { api, getToken, Group, Course, Room, Student, GroupStudent } from "@/lib/api";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [courseId, setCourseId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [maxStudents, setMaxStudents] = useState(12);
  const [roomId, setRoomId] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("19:30");
  const [saving, setSaving] = useState(false);

  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [roster, setRoster] = useState<GroupStudent[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  async function openRoster(groupId: string) {
    if (openGroupId === groupId) {
      setOpenGroupId(null);
      return;
    }
    setOpenGroupId(groupId);
    setRosterLoading(true);
    setEnrollError(null);
    try {
      const [rs, st] = await Promise.all([api.getGroupStudents(groupId), api.listStudents()]);
      setRoster(rs);
      setAllStudents(st);
    } finally {
      setRosterLoading(false);
    }
  }

  async function handleEnroll(groupId: string, studentId: string) {
    setEnrollError(null);
    try {
      await api.enrollStudent(groupId, studentId);
      const [rs] = await Promise.all([api.getGroupStudents(groupId), loadAll()]);
      setRoster(rs);
    } catch (err) {
      setEnrollError(err instanceof Error ? err.message : "Не удалось зачислить");
    }
  }

  function loadAll() {
    return Promise.all([api.listGroups(), api.listCourses(), api.listRooms()]).then(([g, c, r]) => {
      setGroups(g);
      setCourses(c);
      setRooms(r);
    });
  }

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    loadAll().finally(() => setLoading(false));
  }, [router]);

  const selectedCourse = courses.find((c) => c.id === courseId);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.createGroup({
        course_id: courseId,
        level_id: levelId || undefined,
        name,
        max_students: maxStudents,
        // One slot per selected weekday — this is how "Пн / Ср / Пт" becomes
        // three recurring lessons on the same room and time.
        schedule_slots: roomId
          ? weekdays
              .slice()
              .sort((a, b) => a - b)
              .map((wd) => ({
                room_id: roomId,
                weekday: wd,
                start_time: startTime,
                end_time: endTime,
              }))
          : [],
      });
      setName("");
      setWeekdays([]);
      setShowForm(false);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать группу");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-8 max-w-6xl pb-24 sm:pb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-1">Группы</h1>
            <p className="text-sm text-[var(--color-text-muted)]">{groups.length} групп</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium px-4 py-2 hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            + Создать группу
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 mb-6 space-y-4"
          >
            {error && (
              <div className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-bg)] rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Название группы</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="English Elementary Пн/Ср"
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Курс</label>
                <select
                  required
                  value={courseId}
                  onChange={(e) => {
                    setCourseId(e.target.value);
                    setLevelId("");
                  }}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                >
                  <option value="">Выбрать курс</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Уровень</label>
                <select
                  value={levelId}
                  onChange={(e) => setLevelId(e.target.value)}
                  disabled={!selectedCourse?.levels.length}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] disabled:opacity-50"
                >
                  <option value="">Без уровня</option>
                  {selectedCourse?.levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Мест в группе</label>
                <input
                  type="number"
                  min={1}
                  value={maxStudents}
                  onChange={(e) => setMaxStudents(Number(e.target.value))}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Аудитория</label>
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                >
                  <option value="">Без расписания</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.capacity} мест)
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Дни занятий</label>
                <div className="flex flex-wrap gap-1">
                  {WEEKDAYS.map((d, i) => {
                    const active = weekdays.includes(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={!roomId}
                        onClick={() =>
                          setWeekdays((prev) =>
                            prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
                          )
                        }
                        className={`w-9 h-9 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 ${
                          active
                            ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                            : "bg-[var(--color-bg)] text-[var(--color-text-muted)] border-[var(--color-border)]"
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">С</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={!roomId}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">До</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={!roomId}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || !courseId}
              className="rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium px-4 py-2 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
            >
              {saving ? "Создаём..." : "Создать группу"}
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Загрузка...</p>
        ) : groups.length === 0 ? (
          <div className="bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-xl p-10 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              Пока нет групп. Сначала создайте курс (с уровнями) на бэкенде или через API, затем группу здесь.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groups.map((g) => (
              <div key={g.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{g.name}</h3>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      g.free_slots === 0
                        ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
                        : "bg-[var(--color-success-bg)] text-[var(--color-success)]"
                    }`}
                  >
                    {g.free_slots === 0 ? "Мест нет" : `${g.free_slots} свободно`}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {g.enrolled_count} / {g.max_students} учеников
                </p>
                {g.schedule_slots.length > 0 && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    {g.schedule_slots
                      .slice()
                      .sort((a, b) => a.weekday - b.weekday)
                      .map((s) => WEEKDAYS[s.weekday])
                      .join(" / ")}
                    {" · "}
                    {g.schedule_slots[0].start_time.slice(0, 5)}–
                    {g.schedule_slots[0].end_time.slice(0, 5)}
                  </p>
                )}

                <button
                  onClick={() => openRoster(g.id)}
                  className="mt-3 text-xs font-medium text-[var(--color-accent)] hover:underline"
                >
                  {openGroupId === g.id ? "Скрыть учеников" : "Ученики группы"}
                </button>

                {openGroupId === g.id && (
                  <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                    {enrollError && (
                      <p className="text-xs text-[var(--color-danger)] mb-2">{enrollError}</p>
                    )}
                    {rosterLoading ? (
                      <p className="text-xs text-[var(--color-text-muted)]">Загрузка...</p>
                    ) : (
                      <>
                        {roster.length === 0 ? (
                          <p className="text-xs text-[var(--color-text-muted)] mb-2">
                            В группе пока никого нет
                          </p>
                        ) : (
                          <ul className="space-y-1 mb-3">
                            {roster.map((s) => (
                              <li key={s.id} className="text-sm flex items-center gap-2">
                                <span className="text-[var(--color-success)]">•</span>
                                {s.full_name}
                              </li>
                            ))}
                          </ul>
                        )}

                        {g.free_slots > 0 && (
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) handleEnroll(g.id, e.target.value);
                              e.target.value = "";
                            }}
                            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                          >
                            <option value="">+ Зачислить ученика...</option>
                            {allStudents
                              .filter((st) => !roster.some((r) => r.id === st.id))
                              .map((st) => (
                                <option key={st.id} value={st.id}>
                                  {st.full_name}
                                </option>
                              ))}
                          </select>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
