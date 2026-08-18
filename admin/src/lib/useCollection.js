import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { useToast } from '../components/Toast.jsx';

/**
 * The shared engine behind all four content managers.
 *
 * Every manager needs the same things — load the rows, save a new or edited
 * one, delete one, show/hide one, and (for ordered lists) move one up or down.
 * Keeping that here means each manager file is only about its own fields and
 * layout, and a fix to saving or error handling applies everywhere at once.
 *
 * @param table   Supabase table name
 * @param order   { column, ascending } used for the default sort
 * @param label   singular noun used in the messages shown to the editor
 */
export function useCollection(table, order, label) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from(table)
      .select('*')
      .order(order.column, { ascending: order.ascending });

    if (err) {
      setError(err.message);
      // Surfacing the raw message alone would be meaningless to an office
      // user, so pair it with what they can actually do about it.
      toast.error(`Could not load ${label}s. Check your internet connection and refresh.`);
    } else {
      setRows(data || []);
      setError(null);
    }
    setLoading(false);
  }, [table, order.column, order.ascending, label, toast]);

  useEffect(() => {
    load();
  }, [load]);

  /** Creates when `id` is absent, updates when present. */
  const save = useCallback(
    async (values, id) => {
      const query = id
        ? supabase.from(table).update(values).eq('id', id)
        : supabase.from(table).insert(values);

      const { error: err } = await query;
      if (err) {
        toast.error(`Could not save. ${friendly(err)}`);
        return false;
      }
      toast.success(id ? `${cap(label)} updated — it is live on the website now.` : `${cap(label)} added — it is live on the website now.`);
      await load();
      return true;
    },
    [table, label, load, toast]
  );

  const remove = useCallback(
    async (id) => {
      const { error: err } = await supabase.from(table).delete().eq('id', id);
      if (err) {
        toast.error(`Could not delete. ${friendly(err)}`);
        return false;
      }
      toast.success(`${cap(label)} deleted.`);
      await load();
      return true;
    },
    [table, label, load, toast]
  );

  /** Show/hide on the public site without deleting anything. */
  const togglePublished = useCallback(
    async (row) => {
      const next = !row.published;
      // Flip locally first so the switch feels instant, then reconcile.
      setRows((list) => list.map((r) => (r.id === row.id ? { ...r, published: next } : r)));

      const { error: err } = await supabase
        .from(table)
        .update({ published: next })
        .eq('id', row.id);

      if (err) {
        setRows((list) => list.map((r) => (r.id === row.id ? { ...r, published: !next } : r)));
        toast.error(`Could not change visibility. ${friendly(err)}`);
        return;
      }
      toast.success(next ? 'Now showing on the website.' : 'Now hidden from the website.');
    },
    [table, toast]
  );

  /**
   * Moves a row one place up or down by swapping its `position` with its
   * neighbour's. Only for tables that have a `position` column.
   */
  const move = useCallback(
    async (row, direction) => {
      const sorted = [...rows].sort((a, b) => a.position - b.position);
      const index = sorted.findIndex((r) => r.id === row.id);
      const target = sorted[index + (direction === 'up' ? -1 : 1)];
      if (!target) return;

      setRows((list) =>
        list.map((r) => {
          if (r.id === row.id) return { ...r, position: target.position };
          if (r.id === target.id) return { ...r, position: row.position };
          return r;
        })
      );

      const [a, b] = await Promise.all([
        supabase.from(table).update({ position: target.position }).eq('id', row.id),
        supabase.from(table).update({ position: row.position }).eq('id', target.id),
      ]);

      if (a.error || b.error) {
        toast.error('Could not change the order. Refreshing.');
        await load();
      }
    },
    [rows, table, load, toast]
  );

  /** Next free position, so new rows land at the end of an ordered list. */
  const nextPosition = useCallback(
    () => (rows.length ? Math.max(...rows.map((r) => r.position || 0)) + 1 : 1),
    [rows]
  );

  return { rows, loading, error, load, save, remove, togglePublished, move, nextPosition };
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Turns Postgres error text into something an office user can act on. */
function friendly(err) {
  const msg = err?.message || '';
  if (/row-level security|violates row-level/i.test(msg)) {
    return 'You appear to have been signed out — please sign in again.';
  }
  if (/duplicate key/i.test(msg)) return 'That entry already exists.';
  if (/violates check constraint/i.test(msg)) return 'One of the choices was not valid.';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Check your internet connection.';
  return msg;
}
