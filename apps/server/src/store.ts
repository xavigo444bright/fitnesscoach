import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import {
  emptyDirectory,
  parseDirectory,
  stringifyDirectory,
  type UserDirectory,
} from "@fitness-coach/core";
import type { SupportNote } from "./handler.js";

export function readDirectoryFile(file: string): UserDirectory {
  if (!existsSync(file)) return emptyDirectory();
  return parseDirectory(readFileSync(file, "utf8"));
}

export function writeDirectoryFile(file: string, dir: UserDirectory): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, stringifyDirectory(dir), "utf8");
}

export function writeSupportFile(file: string, notes: SupportNote[]): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(notes, null, 2), "utf8");
}
