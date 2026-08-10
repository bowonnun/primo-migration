import Database from "better-sqlite3";
import path from "path";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = path.resolve(process.cwd(), process.env.DB_PATH ?? "./database/members.db");
  db = new Database(dbPath, { readonly: true, fileMustExist: true });
  return db;
}
