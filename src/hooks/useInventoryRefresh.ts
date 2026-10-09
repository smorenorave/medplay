"use client";
import { useEffect, useRef, useState } from "react";
import { subscribeInventoryChanges } from "@/lib/inventoryChanges";

export function useInventoryRefresh(refresh?: () => unknown) {
  const ref = useRef(refresh);
  ref.current = refresh;
  const [revision, setRevision] = useState(0);
  useEffect(() => subscribeInventoryChanges(() => {
    setRevision(value => value + 1);
    void ref.current?.();
  }), []);
  return revision;
}
