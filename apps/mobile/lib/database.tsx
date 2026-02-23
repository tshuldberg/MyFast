import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import type { Database } from '@myfast/shared';
import { initDatabase } from '@myfast/shared';

/** Adapter: wraps expo-sqlite's sync API into our Database interface */
function createAdapter(sqliteDb: SQLite.SQLiteDatabase): Database {
  return {
    run(sql: string, params?: unknown[]): void {
      sqliteDb.runSync(sql, params as SQLite.SQLiteBindParams);
    },
    get<T>(sql: string, params?: unknown[]): T | undefined {
      const row = sqliteDb.getFirstSync(sql, params as SQLite.SQLiteBindParams);
      return (row ?? undefined) as T | undefined;
    },
    all<T>(sql: string, params?: unknown[]): T[] {
      return sqliteDb.getAllSync(sql, params as SQLite.SQLiteBindParams) as T[];
    },
    transaction(fn: () => void): void {
      sqliteDb.withTransactionSync(fn);
    },
  };
}

const DatabaseContext = createContext<Database | null>(null);

/** Provides the Database instance to the component tree. Runs migrations on mount. */
export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Database | null>(null);

  useEffect(() => {
    const sqliteDb = SQLite.openDatabaseSync('myfast.db');
    const adapter = createAdapter(sqliteDb);
    initDatabase(adapter);
    setDb(adapter);
  }, []);

  if (!db) {
    // DB initializing -- render nothing until ready
    return null;
  }

  return (
    <DatabaseContext.Provider value={db}>
      {children}
    </DatabaseContext.Provider>
  );
}

/** Hook to access the Database instance. Must be used inside DatabaseProvider. */
export function useDatabase(): Database {
  const db = useContext(DatabaseContext);
  if (!db) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return db;
}
