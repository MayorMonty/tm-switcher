import { FileHandle } from "node:fs/promises";

let LOG_HANDLE: FileHandle | null = null;

export function log(level: string, message: string, stdout?: string | false) {
  if (stdout) {
    console.log(stdout);
  } else if (stdout !== false) {
    console.log(`[${new Date().toISOString()}] ${level}: ${message}`);
  }
  LOG_HANDLE?.write(`[${new Date().toISOString()}] ${level}: ${message}\n`);
}

export function setLogFile(handle: FileHandle) {
  LOG_HANDLE = handle;
}

export function getLogFile() {
  return LOG_HANDLE;
}
