import { LocalDiskStorage } from "./local";
import type { Storage } from "./types";

let instance: Storage | null = null;

export function getStorage(): Storage {
  instance ??= new LocalDiskStorage();
  return instance;
}

export * from "./types";
