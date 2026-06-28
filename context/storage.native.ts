import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import type { SQLiteDatabase } from "expo-sqlite";
import React from "react";

async function initDb(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT 0
    );
  `);
}

export function StorageProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(SQLiteProvider, { databaseName: "pyra.db", onInit: initDb }, children);
}

export function useStorageDb(): SQLiteDatabase | null {
  return useSQLiteContext();
}
