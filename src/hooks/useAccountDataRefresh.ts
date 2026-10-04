"use client";
import { useEffect, useRef } from "react";
import { subscribeAccountDeletion, type AccountDeletion } from "@/lib/accountDataChanges";

export function useAccountDataRefresh(refresh: (change: AccountDeletion) => unknown) {
  const ref = useRef(refresh);
  ref.current = refresh;
  useEffect(() => subscribeAccountDeletion(change => { void ref.current(change); }), []);
}
