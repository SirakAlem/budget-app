import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, 'budget.db');

let db = null;

// Inizializza il database
async function initDb() {
  const SQL = await initSqlJs();

  // Carica database esistente o creane uno nuovo
  if (existsSync(DB_PATH)) {
    const fileBuffer = readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Crea le tabelle
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      monthly_income REAL DEFAULT 0,
      necessita_percent INTEGER DEFAULT 50,
      svago_percent INTEGER DEFAULT 30,
      risparmio_percent INTEGER DEFAULT 20,
      requisition_id TEXT,
      account_id TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      category TEXT CHECK(category IN ('necessita', 'svago', 'risparmio', 'entrata', 'non_categorizzato')),
      bank_transaction_id TEXT UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS monthly_budget (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL UNIQUE,
      income REAL DEFAULT 0,
      necessita_budget REAL DEFAULT 0,
      svago_budget REAL DEFAULT 0,
      risparmio_budget REAL DEFAULT 0,
      necessita_spent REAL DEFAULT 0,
      svago_spent REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Inserisci settings di default se non esistono
  const check = db.exec("SELECT COUNT(*) as count FROM settings");
  if (check[0].values[0][0] === 0) {
    db.run("INSERT INTO settings (id) VALUES (1)");
  }

  saveDb();
  return db;
}

// Salva il database su file
function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(DB_PATH, buffer);
  }
}

// Wrapper per prepare().run()
function run(sql, ...params) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
  saveDb();
  return { changes: db.getRowsModified() };
}

// Wrapper per prepare().get()
function get(sql, ...params) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let result = null;
  if (stmt.step()) {
    const columns = stmt.getColumnNames();
    const values = stmt.get();
    result = {};
    columns.forEach((col, i) => {
      result[col] = values[i];
    });
  }
  stmt.free();
  return result;
}

// Wrapper per prepare().all()
function all(sql, ...params) {
  const results = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) {
    const columns = stmt.getColumnNames();
    const values = stmt.get();
    const row = {};
    columns.forEach((col, i) => {
      row[col] = values[i];
    });
    results.push(row);
  }
  stmt.free();
  return results;
}

// Helper per creare prepared statement con interfaccia compatibile
function prepare(sql) {
  return {
    run: (...params) => run(sql, ...params),
    get: (...params) => get(sql, ...params),
    all: (...params) => all(sql, ...params)
  };
}

// Esporta l'interfaccia del database
export default {
  init: initDb,
  prepare,
  run,
  get,
  all,
  save: saveDb
};
