'use client';
// One hook that loads the data most overview pages need.
import { useMemo } from 'react';
import { useTable } from './hooks';
import { addDays, startOfToday, toDateStr } from './format';

export function useWorkspace(days = 30, cycle?: string) {
  const since = useMemo(() => toDateStr(addDays(new Date(), -days)), [days]);
  const todayIso = useMemo(() => startOfToday().toISOString(), []);
  const profiles = useTable('profiles', { order: ['full_name', 'asc'] });
  const departments = useTable('departments', { order: ['name', 'asc'] });
  const attendance = useTable('attendance', { gte: ['date', since] });
  const breaks = useTable('breaks', { gte: ['start_at', todayIso] });
  const objectives = useTable('objectives', cycle ? { filter: { cycle } } : undefined);
  const krs = useTable('key_results');
  const tasks = useTable('tasks');
  const leaves = useTable('leave_requests', { order: ['created_at', 'desc'] });
  const holidays = useTable('holidays', { order: ['date', 'asc'] });
  const kudos = useTable('kudos', { order: ['created_at', 'desc'], limit: 60 });
  const loading = profiles.loading || attendance.loading;
  return {
    loading,
    profiles: profiles.rows,
    departments: departments.rows,
    attendance: attendance.rows,
    breaks: breaks.rows,
    objectives: objectives.rows,
    krs: krs.rows,
    tasks: tasks.rows,
    leaves: leaves.rows,
    holidays: holidays.rows,
    kudos: kudos.rows,
    reload: { attendance: attendance.reload, breaks: breaks.reload, leaves: leaves.reload },
  };
}
export type Workspace = ReturnType<typeof useWorkspace>;
