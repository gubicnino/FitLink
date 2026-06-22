import { useCallback, useEffect, useState } from 'react';
import { workoutApi } from '../api/workoutApi';
import { coachingApi } from '../api/coachingApi';
import { videoCallApi } from '../api/videoCallApi';
import { useHealthConnect } from './useHealthConnect';
import type { CheckIn } from '../types/checkin';
import type { VideoCall, VideoCallStatus } from '../types/videoCall';


export interface CalendarDay {
  date: string;
  isToday: boolean;
  isFuture: boolean;
  dotTypes: CalendarEventType[];
  events: CalendarEvent[];
  checkInDue: boolean;
}

export type CalendarEventType =
  | 'workout'
  | 'checkIn'
  | 'hcExercise'
  | 'weightLog'
  | 'checkInDue'
  | 'videoCall';

export interface CalendarEvent {
  type: CalendarEventType;
  at: string;
  title: string;
  subtitle?: string;
  videoCallStatus?: VideoCallStatus;
}

const HORIZON_DAYS = 14;
const CHECK_IN_CADENCE_DAYS = 7;


export function useCalendarEvents() {
  const { snapshot: hcSnapshot, status: hcStatus, refreshSnapshot } = useHealthConnect();
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - 7 * 86400_000);
      const windowEnd = new Date(now.getTime() + (HORIZON_DAYS - 7) * 86400_000);

      const [sessions, coachings, videoCalls] = await Promise.all([
        workoutApi.listSessions().catch(() => []),
        coachingApi.getMyCoachings().catch(() => []),
        videoCallApi.window(windowStart, windowEnd).catch(() => [] as VideoCall[]),
      ]);

      const allCheckIns: CheckIn[] = coachings.flatMap((c: { checkIns?: CheckIn[] }) => c.checkIns ?? []);
      const latestCheckIn = allCheckIns
        .sort((a, b) => bestTime(b).localeCompare(bestTime(a)))[0];

      const nextDueIso = latestCheckIn
        ? new Date(new Date(bestTime(latestCheckIn)).getTime() + CHECK_IN_CADENCE_DAYS * 86400_000).toISOString()
        : null;

      setDays(buildWindow({
        now,
        sessions: sessions ?? [],
        checkIns: allCheckIns,
        hcExercises: hcSnapshot.recentExercises,
        weightTrend: hcSnapshot.weightTrend,
        videoCalls: videoCalls ?? [],
        nextCheckInDueIso: nextDueIso,
      }));
    } finally {
      setLoading(false);
    }
  }, [hcSnapshot.recentExercises, hcSnapshot.weightTrend]);


  useEffect(() => {
    load();
  }, [load]);


  useEffect(() => {
    if (hcStatus === 'granted' || hcStatus === 'partial') refreshSnapshot();
  }, [hcStatus, refreshSnapshot]);

  return { days, loading, reload: load };
}


function buildWindow(input: {
  now: Date;
  sessions: { startedAt: string | null; finishedAt?: string | null; name?: string | null; durationMinutes?: number | null }[];
  checkIns: CheckIn[];
  hcExercises: { startAt: string; durationMinutes: number; title: string | null; exerciseType: number | null }[];
  weightTrend: { at: string; kg: number }[];
  videoCalls: VideoCall[];
  nextCheckInDueIso: string | null;
}): CalendarDay[] {
  const { now, sessions, checkIns, hcExercises, weightTrend, videoCalls, nextCheckInDueIso } = input;

  const start = startOfDay(new Date(now.getTime() - 7 * 86400_000));
  const todayKey = dateKey(now);
  const dueKey = nextCheckInDueIso ? dateKey(new Date(nextCheckInDueIso)) : null;

  const byDay = new Map<string, CalendarDay>();
  for (let i = 0; i < HORIZON_DAYS; i++) {
    const d = new Date(start.getTime() + i * 86400_000);
    const key = dateKey(d);
    byDay.set(key, {
      date: key,
      isToday: key === todayKey,
      isFuture: d.getTime() > now.getTime(),
      dotTypes: [],
      events: [],
      checkInDue: dueKey === key,
    });
  }

  const pushEvent = (key: string, event: CalendarEvent, type: CalendarEventType) => {
    const day = byDay.get(key);
    if (!day) return;
    day.events.push(event);
    if (!day.dotTypes.includes(type)) day.dotTypes.push(type);
  };

  for (const s of sessions) {
    const at = s.finishedAt ?? s.startedAt;
    if (!at) continue;
    const key = dateKey(new Date(at));
    if (!byDay.has(key)) continue;
    const minutes = s.durationMinutes && s.durationMinutes > 0 ? `${s.durationMinutes} min` : undefined;
    pushEvent(key, {
      type: 'workout',
      at,
      title: s.name || 'Workout',
      subtitle: minutes,
    }, 'workout');
  }

  for (const ci of checkIns) {
    const at = bestTime(ci);
    const key = dateKey(new Date(at));
    if (!byDay.has(key)) continue;
    const w = ci.weightKg && ci.weightKg > 0 ? `${ci.weightKg.toFixed(1)} kg` : undefined;
    pushEvent(key, {
      type: 'checkIn',
      at,
      title: 'Weekly check-in',
      subtitle: w,
    }, 'checkIn');
  }

  for (const ex of hcExercises) {
    if (!ex.startAt) continue;
    const key = dateKey(new Date(ex.startAt));
    if (!byDay.has(key)) continue;
    const day = byDay.get(key)!;
    if (day.dotTypes.includes('workout')) continue;
    pushEvent(key, {
      type: 'hcExercise',
      at: ex.startAt,
      title: ex.title || 'Tracked workout',
      subtitle: `${ex.durationMinutes} min · Health Connect`,
    }, 'hcExercise');
  }

  for (const w of weightTrend) {
    const key = dateKey(new Date(w.at));
    if (!byDay.has(key)) continue;
    pushEvent(key, {
      type: 'weightLog',
      at: w.at,
      title: 'Weight logged',
      subtitle: `${w.kg.toFixed(1)} kg`,
    }, 'weightLog');
  }

  for (const vc of videoCalls) {
    if (!vc.scheduledFor) continue;
    const key = dateKey(new Date(vc.scheduledFor));
    if (!byDay.has(key)) continue;
    const when = new Date(vc.scheduledFor);
    const timeStr = when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    pushEvent(key, {
      type: 'videoCall',
      at: vc.scheduledFor,
      title: videoCallTitle(vc.status),
      subtitle: `${timeStr} · Video call`,
      videoCallStatus: vc.status,
    }, 'videoCall');
  }

  if (dueKey && byDay.has(dueKey)) {
    const day = byDay.get(dueKey)!;
    if (!day.dotTypes.includes('checkIn')) {
      day.events.push({
        type: 'checkInDue',
        at: dueKey + 'T00:00:00Z',
        title: 'Check-in due',
        subtitle: 'Submit your weekly progress',
      });
      day.dotTypes.push('checkInDue');
    }
  }


  for (const day of byDay.values()) {
    day.events.sort((a, b) => a.at.localeCompare(b.at));
  }

  return Array.from(byDay.values());
}

function startOfDay(d: Date): Date {
  const o = new Date(d);
  o.setHours(0, 0, 0, 0);
  return o;
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function bestTime(ci: CheckIn): string {
  return (ci.start ?? ci.createdAt ?? new Date().toISOString()) as string;
}

function videoCallTitle(status: VideoCallStatus): string {
  switch (status) {
    case 'PENDING': return 'Video call (awaiting reply)';
    case 'ACCEPTED': return 'Video call (confirmed)';
    case 'LIVE': return 'Video call';
    case 'COMPLETED': return 'Video call (finished)';
    case 'DECLINED': return 'Video call (declined)';
    case 'CANCELLED': return 'Video call (cancelled)';
    case 'EXPIRED': return 'Video call (missed)';
    default: return 'Video call';
  }
}
