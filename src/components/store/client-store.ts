"use client";

import { useSyncExternalStore } from "react";
import { sanitizeLines, type CartLine } from "@/lib/cart";

/** Tiny localStorage-backed store usable with useSyncExternalStore (syncs across tabs). */
function createPersistentStore<T>(key: string, initial: T, validate: (raw: unknown) => T) {
  let state = initial;
  let loaded = false;
  const listeners = new Set<() => void>();
  const load = () => {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) state = validate(JSON.parse(raw));
    } catch {
      state = initial;
    }
    window.addEventListener("storage", (e) => {
      if (e.key !== key) return;
      try {
        state = e.newValue ? validate(JSON.parse(e.newValue)) : initial;
      } catch {
        state = initial;
      }
      listeners.forEach((l) => l());
    });
  };
  return {
    get: () => {
      load();
      return state;
    },
    getServer: () => initial,
    set: (next: T | ((prev: T) => T)) => {
      load();
      state = typeof next === "function" ? (next as (p: T) => T)(state) : next;
      try {
        window.localStorage.setItem(key, JSON.stringify(state));
      } catch {
        /* storage full or disabled — keep in memory */
      }
      listeners.forEach((l) => l());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const ids = (max: number) => (raw: unknown) => (Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string").slice(0, max) : []);

export const favoritesStore = createPersistentStore<string[]>("jiskra:favorites", [], ids(100));
export const compareStore = createPersistentStore<string[]>("jiskra:compare", [], ids(12));
export const cartStore = createPersistentStore<CartLine[]>("jiskra:cart", [], sanitizeLines);

export function useStoreValue<T>(store: { get: () => T; getServer: () => T; subscribe: (l: () => void) => () => void }): T {
  return useSyncExternalStore(store.subscribe, store.get, store.getServer);
}

export function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}
