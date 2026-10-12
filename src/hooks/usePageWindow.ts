"use client";
import { useEffect, useState } from "react";

/** Paging affects rendering only. Filtering and bulk selection retain all rows. */
export function usePageWindow<T>(items: T[], scope: string, size = 100) {
  const [selection, setSelection] = useState({ scope, page: 1 });
  useEffect(() => {
    setSelection(previous => previous.scope === scope ? previous : { scope, page: 1 });
  }, [scope]);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = selection.scope === scope ? Math.min(selection.page, pages) : 1;
  return {
    items: items.slice((page - 1) * size, page * size),
    page, pages, total: items.length,
    setPage: (next: number) => setSelection({ scope, page: Math.max(1, Math.min(next, pages)) }),
  };
}
