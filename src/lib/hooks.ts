'use client';
import { useCallback, useEffect, useState } from 'react';
import { db, type ListOptions } from './data';
import type { TableName, Tables } from './types';

/** Load a table, keep it live (realtime / cross-tab), and expose reload(). */
export function useTable<K extends TableName>(table: K, opts?: ListOptions, enabled = true) {
  const [rows, setRows] = useState<Tables[K][]>([]);
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify(opts ?? {});

  const reload = useCallback(async () => {
    try {
      setRows(await db.list(table, opts));
    } catch (e) {
      console.error(`[useTable:${table}]`, e);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, key]);

  useEffect(() => {
    if (!enabled) {
      setRows([]);
      setLoading(false);
      return;
    }
    reload();
    return db.subscribe(table, reload);
  }, [reload, enabled, table]);

  return { rows, loading, reload };
}

/** Re-render every `ms` for live clocks. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
