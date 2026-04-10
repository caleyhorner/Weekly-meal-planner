import { useState, useCallback } from 'react';
import { WeekPlan, DayPlan, DayStatus } from '../models/types';
import { getWeekStartDate, getWeekDates, toISODate } from '../utils/dates';
import * as DB from '../services/database';
import uuid from '../utils/uuid';

function buildEmptyWeekPlan(weekStartDate: string): WeekPlan {
  const start = new Date(weekStartDate + 'T00:00:00');
  const dates = getWeekDates(start);
  const days: Record<string, DayPlan> = {};
  dates.forEach((date) => {
    days[date] = { date, recipeId: null, status: 'planned' };
  });
  return { id: uuid(), weekStartDate, days };
}

export function useMealPlan() {
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [loading, setLoading] = useState(false);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
      const weekStart = getWeekStartDate(new Date());
      const weekStartDate = toISODate(weekStart);
      const existing = await DB.getWeekPlan(weekStartDate);
      if (existing) {
        // Ensure all 7 days exist (in case plan was created in a previous build)
        const dates = getWeekDates(weekStart);
        dates.forEach((d) => {
          if (!existing.days[d]) {
            existing.days[d] = { date: d, recipeId: null, status: 'planned' };
          }
        });
        setPlan(existing);
      } else {
        const newPlan = buildEmptyWeekPlan(weekStartDate);
        await DB.saveWeekPlan(newPlan);
        setPlan(newPlan);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const setDayRecipe = useCallback(
    async (date: string, recipeId: string | null) => {
      if (!plan) return;
      const updated: WeekPlan = {
        ...plan,
        days: {
          ...plan.days,
          [date]: { ...plan.days[date], recipeId, status: 'planned' },
        },
      };
      setPlan(updated);
      await DB.saveWeekPlan(updated);
    },
    [plan]
  );

  const toggleSkip = useCallback(
    async (date: string) => {
      if (!plan) return;
      const current = plan.days[date];
      const newStatus: DayStatus = current.status === 'skip' ? 'planned' : 'skip';
      const updated: WeekPlan = {
        ...plan,
        days: {
          ...plan.days,
          [date]: {
            ...current,
            status: newStatus,
            recipeId: newStatus === 'skip' ? null : current.recipeId,
          },
        },
      };
      setPlan(updated);
      await DB.saveWeekPlan(updated);
    },
    [plan]
  );

  const clearDay = useCallback(
    async (date: string) => {
      if (!plan) return;
      const updated: WeekPlan = {
        ...plan,
        days: {
          ...plan.days,
          [date]: { ...plan.days[date], recipeId: null, status: 'planned' },
        },
      };
      setPlan(updated);
      await DB.saveWeekPlan(updated);
    },
    [plan]
  );

  const plannedCount = plan
    ? Object.values(plan.days).filter((d) => d.status === 'planned' && d.recipeId).length
    : 0;

  return { plan, loading, loadPlan, setDayRecipe, toggleSkip, clearDay, plannedCount };
}
