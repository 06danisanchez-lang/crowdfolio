import { useCallback, useEffect, useRef } from 'react';
import {
  DraftFormValues,
  DraftPayload,
  saveDraft,
  loadDraft,
  clearDraft,
} from '@/lib/draftStorage';

export function useInvestmentDraft(userId: string | undefined) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // latestPayloadRef always holds the most recent payload to write.
  // flushSave() reads from this ref directly — no stale closure risk.
  const latestPayloadRef = useRef<DraftPayload | null>(null);

  const flushSave = useCallback(() => {
    if (!userId || !latestPayloadRef.current) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    saveDraft(userId, latestPayloadRef.current);
  }, [userId]);

  // Register page-leave listeners once on mount.
  // flushSave is stable (depends only on userId which doesn't change mid-session).
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushSave();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', flushSave);
    window.addEventListener('beforeunload', flushSave);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', flushSave);
      window.removeEventListener('beforeunload', flushSave);
    };
  }, [flushSave]);

  /** Debounced save — updates latestPayloadRef immediately, writes after 300 ms. */
  const save = useCallback(
    (formValues: DraftFormValues) => {
      if (!userId) return;

      const payload: DraftPayload = {
        version: 1,
        updatedAt: new Date().toISOString(),
        entryMode: 'manual',
        formValues,
      };

      // Always update ref first so flushSave() sees the latest data
      latestPayloadRef.current = payload;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (userId && latestPayloadRef.current) {
          saveDraft(userId, latestPayloadRef.current);
        }
      }, 300);
    },
    [userId],
  );

  const load = useCallback(
    (): DraftPayload | null => (userId ? loadDraft(userId) : null),
    [userId],
  );

  const clear = useCallback(() => {
    if (!userId) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    latestPayloadRef.current = null;
    clearDraft(userId);
  }, [userId]);

  return { save, flushSave, load, clear };
}
