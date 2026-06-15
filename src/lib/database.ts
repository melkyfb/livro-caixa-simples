import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import { readFile, writeFile, BaseDirectory, exists, mkdir } from '@tauri-apps/plugin-fs';
import { save, open } from '@tauri-apps/plugin-dialog';

let db: Database | null = null;
const DB_FILENAME = 'livro_caixa.sqlite';

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

  try {
    // Ensure the AppData directory exists
    const appDataExists = await exists('', { baseDir: BaseDirectory.AppData });
    if (!appDataExists) {
      await mkdir('', { baseDir: BaseDirectory.AppData });
    }

    // Check if the database file exists
    const fileExists = await exists(DB_FILENAME, { baseDir: BaseDirectory.AppData });

    if (fileExists) {
      // Load from file
      const u8array = await readFile(DB_FILENAME, { baseDir: BaseDirectory.AppData });
      db = new SQL.Database(u8array);
    } else {
      // Migrate from localStorage if exists
      const savedDb = localStorage.getItem('livro-caixa-db');
      if (savedDb) {
        const u8array = new Uint8Array(JSON.parse(savedDb));
        db = new SQL.Database(u8array);
        // Save to file immediately to migrate
        await saveDatabaseToFile(db);
        localStorage.removeItem('livro-caixa-db');
      } else {
        db = new SQL.Database();
        initSchema(db);
      }
    }
  } catch (e) {
    console.error("Error loading database:", e);
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
      customFieldsSchema TEXT,
      printSettings TEXT
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

// Internal async function to write to file
async function saveDatabaseToFile(database: Database) {
  try {
    const data = database.export();
    await writeFile(DB_FILENAME, data, { baseDir: BaseDirectory.AppData });
  } catch (e) {
    console.error("Error saving database to file:", e);
  }
}

// The exposed function is kept sync-looking but does async work, or we can make it async
export function saveDatabase(database: Database) {
  // Fire and forget, or handle errors internally
  saveDatabaseToFile(database);
}

export async function exportDatabase() {
  const currentDb = await getDatabase();
  const data = currentDb.export();
  
  const path = await save({
    filters: [{
      name: 'SQLite Database',
      extensions: ['sqlite']
    }],
    defaultPath: 'livro_caixa_backup.sqlite'
  });

  if (path) {
    // Escrevemos no caminho escolhido pelo usuário
    // Como plugin-dialog retorna caminho absoluto, não usamos baseDir
    // wait, @tauri-apps/plugin-fs tem uma função writeFile que suporta path absoluto.
    await writeFile(path, data);
    return true;
  }
  return false;
}

export async function importDatabase() {
  const path = await open({
    filters: [{
      name: 'SQLite Database',
      extensions: ['sqlite']
    }],
    multiple: false
  });

  if (path && typeof path === 'string') {
    const u8array = await readFile(path);
    // Sobrescreve o arquivo no AppData
    await writeFile(DB_FILENAME, u8array, { baseDir: BaseDirectory.AppData });
    return true;
  }
  return false;
}

export async function deleteDatabaseFile() {
  const fs = await import('@tauri-apps/plugin-fs');
  const exists = await fs.exists(DB_FILENAME, { baseDir: BaseDirectory.AppData });
  if (exists) {
    await fs.remove(DB_FILENAME, { baseDir: BaseDirectory.AppData });
  }
}
