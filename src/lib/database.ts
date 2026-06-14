import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';

let db: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: file => {
      if (file.endsWith('.wasm')) {
        return `./sql-wasm.wasm`;
      }
      return `./${file}`;
    }
  });

  // Tentar carregar do localStorage no navegador ou arquivo no Tauri
  const savedDb = localStorage.getItem('livro-caixa-db');
  if (savedDb) {
    const u8array = new Uint8Array(JSON.parse(savedDb));
    db = new SQL.Database(u8array);
  } else {
    db = new SQL.Database();
    initSchema(db);
  }

  return db;
}

function initSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      initialBalance REAL DEFAULT 0,
      currentBalance REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      value REAL NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      accountId INTEGER NOT NULL,
      destinationAccountId INTEGER,
      categoryId INTEGER NOT NULL,
      customFields TEXT,
      FOREIGN KEY(accountId) REFERENCES accounts(id),
      FOREIGN KEY(categoryId) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entityName TEXT,
      entityType TEXT,
      country TEXT,
      currency TEXT,
      customFieldsSchema TEXT
    );
  `);

  // Inserir categorias padrão
  db.run(`
    INSERT INTO categories (name, type) VALUES 
    ('Diversos', 'Entrada'),
    ('Pagamento', 'Entrada'), 
    ('Salário', 'Entrada'), 
    ('Dízimos', 'Entrada'), 
    ('Transferência', 'Entrada'),
    ('Diversos', 'Saída'),
    ('Transporte', 'Saída'), 
    ('Farmácia', 'Saída'), 
    ('Escola', 'Saída'), 
    ('Transferência', 'Saída');
  `);
  
  saveDatabase(db);
}

export function saveDatabase(database: Database) {
  const data = database.export();
  const array = Array.from(data);
  localStorage.setItem('livro-caixa-db', JSON.stringify(array));
}
