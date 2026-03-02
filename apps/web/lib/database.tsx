'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import type { Database } from '@myfast/shared';
import { initDatabase } from '@myfast/shared';

const STORAGE_KEY = 'myfast-db';

/** Load persisted database bytes from localStorage */
function loadFromStorage(): Uint8Array | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const binary = atob(raw);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

/** Persist database bytes to localStorage */
function saveToStorage(sqlDb: SqlJsDatabase): void {
  try {
    const data = sqlDb.export();
    // Build binary string in chunks to avoid stack overflow on large arrays
    const chunks: string[] = [];
    const chunkSize = 8192;
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(String.fromCharCode(...data.subarray(i, i + chunkSize)));
    }
    localStorage.setItem(STORAGE_KEY, btoa(chunks.join('')));
  } catch {
    // Silently fail if storage is full
  }
}

/** Create a Database adapter wrapping sql.js */
function createAdapter(sqlDb: SqlJsDatabase): Database {
  let inTransaction = false;

  function persist() {
    if (!inTransaction) {
      saveToStorage(sqlDb);
    }
  }

  return {
    run(sql: string, params?: unknown[]): void {
      if (params && params.length > 0) {
        const stmt = sqlDb.prepare(sql);
        stmt.bind(params as (string | number | null | Uint8Array)[]);
        stmt.step();
        stmt.free();
      } else {
        sqlDb.run(sql);
      }
      persist();
    },
    get<T>(sql: string, params?: unknown[]): T | undefined {
      const stmt = sqlDb.prepare(sql);
      if (params && params.length > 0) {
        stmt.bind(params as (string | number | null | Uint8Array)[]);
      }
      if (!stmt.step()) {
        stmt.free();
        return undefined;
      }
      const obj = stmt.getAsObject();
      stmt.free();
      return obj as T;
    },
    all<T>(sql: string, params?: unknown[]): T[] {
      const results: T[] = [];
      const stmt = sqlDb.prepare(sql);
      if (params && params.length > 0) {
        stmt.bind(params as (string | number | null | Uint8Array)[]);
      }
      while (stmt.step()) {
        results.push(stmt.getAsObject() as T);
      }
      stmt.free();
      return results;
    },
    transaction(fn: () => void): void {
      inTransaction = true;
      sqlDb.run('BEGIN TRANSACTION');
      try {
        fn();
        sqlDb.run('COMMIT');
      } catch (e) {
        try { sqlDb.run('ROLLBACK'); } catch { /* already rolled back */ }
        throw e;
      } finally {
        inTransaction = false;
      }
      persist();
    },
  };
}

const DatabaseContext = createContext<Database | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Database | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const SQL = await initSqlJs({
        locateFile: () => '/sql-wasm.wasm',
      });

      let adapter: Database;
      const saved = loadFromStorage();
      if (saved) {
        try {
          const sqlDb = new SQL.Database(saved);
          adapter = createAdapter(sqlDb);
          initDatabase(adapter);
          // Validate: test a write to catch corrupted schema
          adapter.run(
            `INSERT OR REPLACE INTO streak_cache (key, value, updated_at) VALUES ('_healthcheck', 0, datetime('now'))`,
          );
          adapter.run(`DELETE FROM streak_cache WHERE key = '_healthcheck'`);
        } catch {
          // Corrupted localStorage — start fresh
          localStorage.removeItem(STORAGE_KEY);
          const sqlDb = new SQL.Database();
          adapter = createAdapter(sqlDb);
          initDatabase(adapter);
        }
      } else {
        const sqlDb = new SQL.Database();
        adapter = createAdapter(sqlDb);
        initDatabase(adapter);
      }

      if (mounted) {
        setDb(adapter);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  if (!db) {
    return null;
  }

  return (
    <DatabaseContext.Provider value={db}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase(): Database {
  const db = useContext(DatabaseContext);
  if (!db) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return db;
}
