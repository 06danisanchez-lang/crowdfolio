import { useMemo, useCallback } from 'react';
import { FutureInvestment } from '@/types/futureInvestment';

export type ReminderPhase = '7d' | '2d' | '1h' | 'today' | 'open';

export interface FutureReminder {
  futureInvestmentId: string;
  projectName: string;
  phase: ReminderPhase;
  message: string;
  openDate: string;
}

const STORAGE_KEY = 'dismissed-reminders';
const MS_HOUR = 3_600_000;
const MS_DAY = 86_400_000;
const MS_48H = MS_DAY * 2;

interface DismissedEntry {
  id: string;
  phase: ReminderPhase;
}

function getDismissed(): DismissedEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveDismissed(entries: DismissedEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function hasTime(dateStr: string): boolean {
  return dateStr.includes('T') && !dateStr.endsWith('T00:00:00') && !dateStr.endsWith('T00:00');
}

function computePhase(
  openDateStr: string,
  now: Date,
  lang: 'es' | 'en'
): { phase: ReminderPhase; message: string } | null {
  const withTime = hasTime(openDateStr);
  const openDate = new Date(openDateStr);
  const diffMs = openDate.getTime() - now.getTime();

  if (withTime) {
    // With exact time
    if (diffMs <= -MS_48H) return null; // expired
    if (diffMs <= 0) return { phase: 'open', message: lang === 'es' ? 'Ya abierta' : 'Already open' };
    if (diffMs <= MS_HOUR) return { phase: '1h', message: lang === 'es' ? 'Abre en menos de 1 hora' : 'Opens in less than 1 hour' };
    if (diffMs <= MS_DAY * 2) {
      const days = Math.ceil(diffMs / MS_DAY);
      if (days <= 1) {
        return { phase: '2d', message: lang === 'es' ? 'Abre mañana' : 'Opens tomorrow' };
      }
      return { phase: '2d', message: lang === 'es' ? `Abre en ${days} días` : `Opens in ${days} days` };
    }
    if (diffMs <= MS_DAY * 7) {
      const days = Math.ceil(diffMs / MS_DAY);
      return { phase: '7d', message: lang === 'es' ? `Abre en ${days} días` : `Opens in ${days} days` };
    }
    return null; // too far
  } else {
    // Date only — treat as 00:00 of that day
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const openDayStart = new Date(openDate.getFullYear(), openDate.getMonth(), openDate.getDate());
    const diffDays = Math.round((openDayStart.getTime() - todayStart.getTime()) / MS_DAY);

    if (diffDays < 0) {
      // Past
      const pastMs = todayStart.getTime() - openDayStart.getTime();
      if (pastMs > MS_48H) return null;
      return { phase: 'open', message: lang === 'es' ? 'Ya abierta' : 'Already open' };
    }
    if (diffDays === 0) return { phase: 'today', message: lang === 'es' ? 'Abre hoy' : 'Opens today' };
    if (diffDays === 1) return { phase: '2d', message: lang === 'es' ? 'Abre mañana' : 'Opens tomorrow' };
    if (diffDays <= 2) return { phase: '2d', message: lang === 'es' ? `Abre en ${diffDays} días` : `Opens in ${diffDays} days` };
    if (diffDays <= 7) return { phase: '7d', message: lang === 'es' ? `Abre en ${diffDays} días` : `Opens in ${diffDays} days` };
    return null;
  }
}

export function useFutureReminders(
  futureInvestments: FutureInvestment[],
  lang: 'es' | 'en' = 'es'
) {
  const reminders = useMemo(() => {
    const now = new Date();
    const dismissed = getDismissed();
    const result: FutureReminder[] = [];

    for (const fi of futureInvestments) {
      if (!fi.estimatedOpenDate) continue;

      const computed = computePhase(fi.estimatedOpenDate, now, lang);
      if (!computed) continue;

      // Check if dismissed for this exact phase
      const isDismissed = dismissed.some(d => d.id === fi.id && d.phase === computed.phase);
      if (isDismissed) continue;

      result.push({
        futureInvestmentId: fi.id,
        projectName: fi.projectName,
        phase: computed.phase,
        message: computed.message,
        openDate: fi.estimatedOpenDate,
      });
    }

    return result;
  }, [futureInvestments, lang]);

  const activeCount = reminders.length;

  const dismiss = useCallback((futureInvestmentId: string) => {
    const reminder = reminders.find(r => r.futureInvestmentId === futureInvestmentId);
    if (!reminder) return;

    const dismissed = getDismissed();
    // Remove older dismissals for this investment, keep only the current phase
    const filtered = dismissed.filter(d => d.id !== futureInvestmentId);
    filtered.push({ id: futureInvestmentId, phase: reminder.phase });
    saveDismissed(filtered);

    // Force re-render by triggering a storage event won't work in same tab,
    // so we rely on the component to handle state update
    window.dispatchEvent(new Event('reminders-updated'));
  }, [reminders]);

  const cleanupForInvestment = useCallback((futureInvestmentId: string) => {
    const dismissed = getDismissed();
    saveDismissed(dismissed.filter(d => d.id !== futureInvestmentId));
  }, []);

  return { reminders, activeCount, dismiss, cleanupForInvestment };
}
