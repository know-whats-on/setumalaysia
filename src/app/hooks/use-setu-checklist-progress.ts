import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearSetuChecklistProgress,
  fetchSetuChecklistProgress,
  syncSetuChecklistProgress,
} from '../lib/setu-api';
import type { SetuChecklistProgress } from '../lib/setu-types';

const STORAGE_KEY_PREFIX = 'setu_checklist_progress_';
const ITEM_ID_PATTERN = /^[a-zA-Z0-9_-]{1,255}$/;

function normalizeEmail(value: string) {
  return String(value || '').trim().toLowerCase();
}

function isValidCompletedItems(items: string[]) {
  return Array.isArray(items) && items.every((item) => ITEM_ID_PATTERN.test(item));
}

function loadFromLocalStorage(email: string) {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${email}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.completedItems)) {
      return null;
    }
    return parsed as SetuChecklistProgress;
  } catch {
    return null;
  }
}

function saveToLocalStorage(email: string, progress: SetuChecklistProgress) {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${email}`, JSON.stringify(progress));
  } catch (error) {
    console.error('GHAR SETU local progress save failed:', error);
  }
}

export function useSetuChecklistProgress(email: string) {
  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);
  const [progress, setProgress] = useState<SetuChecklistProgress | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(normalizedEmail));
  const progressRef = useRef<SetuChecklistProgress | null>(null);
  const lastSyncedStateRef = useRef('');
  const debounceRef = useRef<number | null>(null);

  const syncNow = useCallback(
    async (completedItems: string[]) => {
      if (!normalizedEmail || !isValidCompletedItems(completedItems)) return;
      try {
        await syncSetuChecklistProgress(normalizedEmail, completedItems);
        lastSyncedStateRef.current = JSON.stringify([...completedItems].sort());
      } catch (error) {
        console.error('GHAR SETU progress sync failed:', error);
      }
    },
    [normalizedEmail],
  );

  const scheduleSync = useCallback(
    (nextProgress: SetuChecklistProgress) => {
      if (!normalizedEmail) return;
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }

      debounceRef.current = window.setTimeout(() => {
        const currentProgress = progressRef.current;
        if (!currentProgress) return;
        const currentState = JSON.stringify([...currentProgress.completedItems].sort());
        if (currentState === lastSyncedStateRef.current) return;
        void syncNow(currentProgress.completedItems);
      }, 3000);
    },
    [normalizedEmail, syncNow],
  );

  const saveProgress = useCallback(
    (nextProgress: SetuChecklistProgress, syncMode: 'debounced' | 'immediate' = 'debounced') => {
      const progressWithTimestamp = {
        ...nextProgress,
        completedItems: [...nextProgress.completedItems],
        lastUpdated: new Date().toISOString(),
      };
      setProgress(progressWithTimestamp);
      progressRef.current = progressWithTimestamp;

      if (normalizedEmail) {
        saveToLocalStorage(normalizedEmail, progressWithTimestamp);
      }

      if (syncMode === 'immediate') {
        if (debounceRef.current) {
          window.clearTimeout(debounceRef.current);
          debounceRef.current = null;
        }
        void syncNow(progressWithTimestamp.completedItems);
      } else {
        scheduleSync(progressWithTimestamp);
      }
    },
    [normalizedEmail, scheduleSync, syncNow],
  );

  const loadProgress = useCallback(async () => {
    if (!normalizedEmail) {
      setIsLoading(false);
      setProgress(null);
      progressRef.current = null;
      return;
    }

    const localProgress = loadFromLocalStorage(normalizedEmail);
    if (localProgress) {
      setProgress(localProgress);
      progressRef.current = localProgress;
      setIsLoading(false);
    }

    try {
      const serverProgress = await fetchSetuChecklistProgress(normalizedEmail);
      const serverItems = Array.isArray(serverProgress.completed_items)
        ? serverProgress.completed_items.filter((item) => ITEM_ID_PATTERN.test(item))
        : [];

      if (serverItems.length > 0) {
        const mergedProgress =
          localProgress
            ? {
                ...localProgress,
                completedItems: serverItems,
                lastUpdated: new Date().toISOString(),
              }
            : {
                checklistId: 'auto_load',
                universityId: 0,
                completedItems: serverItems,
                totalItems: serverItems.length,
                lastUpdated: new Date().toISOString(),
                universityName: '',
                location: '',
              };

        setProgress(mergedProgress);
        progressRef.current = mergedProgress;
        saveToLocalStorage(normalizedEmail, mergedProgress);
        lastSyncedStateRef.current = JSON.stringify([...serverItems].sort());
      } else if (localProgress) {
        lastSyncedStateRef.current = JSON.stringify([...localProgress.completedItems].sort());
      }
    } catch (error) {
      console.error('GHAR SETU progress load failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [normalizedEmail]);

  const initializeProgress = useCallback(
    async (
      checklistId: string,
      universityId: number,
      totalItems: number,
      universityName: string,
      location: string,
    ) => {
      if (!normalizedEmail) return null;

      const existing = progressRef.current;
      const nextProgress: SetuChecklistProgress = {
        checklistId,
        universityId,
        completedItems: existing?.completedItems || [],
        totalItems,
        lastUpdated: new Date().toISOString(),
        universityName,
        location,
      };

      saveProgress(nextProgress);
      return nextProgress;
    },
    [normalizedEmail, saveProgress],
  );

  const toggleItem = useCallback(
    (itemId: string) => {
      if (!ITEM_ID_PATTERN.test(itemId)) return;
      const current = progressRef.current;
      if (!current || !normalizedEmail) return;

      const completedItems = current.completedItems.includes(itemId)
        ? current.completedItems.filter((value) => value !== itemId)
        : [...current.completedItems, itemId];

      saveProgress({
        ...current,
        completedItems,
      });
    },
    [normalizedEmail, saveProgress],
  );

  const clearProgress = useCallback(async () => {
    if (!normalizedEmail) return;

    const current = progressRef.current;
    if (!current) {
      await clearSetuChecklistProgress(normalizedEmail);
      return;
    }

    const cleared = {
      ...current,
      completedItems: [],
      lastUpdated: new Date().toISOString(),
    };

    setProgress(cleared);
    progressRef.current = cleared;
    saveToLocalStorage(normalizedEmail, cleared);
    lastSyncedStateRef.current = JSON.stringify([]);

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    try {
      await clearSetuChecklistProgress(normalizedEmail);
    } catch (error) {
      console.error('GHAR SETU progress clear failed:', error);
    }
  }, [normalizedEmail]);

  const getCompletionPercentage = useCallback(() => {
    const current = progressRef.current;
    if (!current || current.totalItems === 0) return 0;
    return Math.round((current.completedItems.length / current.totalItems) * 100);
  }, []);

  const isItemCompleted = useCallback((itemId: string) => {
    return Boolean(progressRef.current?.completedItems.includes(itemId));
  }, []);

  const getCompletedCount = useCallback(() => {
    return progressRef.current?.completedItems.length || 0;
  }, []);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    lastSyncedStateRef.current = '';
    setIsLoading(Boolean(normalizedEmail));
    void loadProgress();

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [loadProgress, normalizedEmail]);

  return {
    progress,
    isLoading,
    initializeProgress,
    toggleItem,
    clearProgress,
    getCompletionPercentage,
    isItemCompleted,
    getCompletedCount,
  };
}
