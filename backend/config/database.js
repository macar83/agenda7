const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Configurazione database PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const SCHEMA_PATH = path.join(__dirname, '..', 'database.sql');

// Helper per convertire query SQLite (?) in PostgreSQL ($1, $2, ...)
const convertQuery = (sql) => {
  let i = 1;
  return sql.replace(/\?/g, () => `$${i++}`);
};

// Funzione per parsare SQL in modo più robusto
const parseSQL = (schema) => {
  // Rimuovi commenti SQL (-- e /* */)
  let cleanSchema = schema
    .replace(/--.*$/gm, '') // Rimuovi commenti --
    .replace(/\/\*[\s\S]*?\*\//g, '') // Rimuovi commenti /* */
    .trim();

  const statements = [];
  let currentStatement = '';
  let inFunction = false; // Postgres usa $$ per le funzioni

  const lines = cleanSchema.split('\n');

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Aggiungi la linea al statement corrente
    currentStatement += (currentStatement ? ' ' : '') + line;

    // Gestione blocchi $$ (funzioni PL/pgSQL)
    if (line.includes('$$')) {
      inFunction = !inFunction;
    }

    // Se non siamo in una funzione e la linea finisce con ;, è un statement completo
    if (!inFunction && line.endsWith(';')) {
      statements.push(currentStatement);
      currentStatement = '';
    }
  }

  // Aggiungi l'ultimo statement se esiste
  if (currentStatement.trim()) {
    if (!currentStatement.endsWith(';')) {
      currentStatement += ';';
    }
    statements.push(currentStatement);
  }

  return statements.filter(stmt => stmt.trim().length > 0);
};

// Inizializza il database
const initDatabase = async () => {
  try {
    console.log('🔌 Connessione a PostgreSQL...');
    const client = await pool.connect();
    try {
      console.log('✅ Connesso a PostgreSQL');

      // Verifica se il file schema esiste
      try {
        await fs.access(SCHEMA_PATH);
        console.log('✅ File schema trovato:', SCHEMA_PATH);
      } catch (error) {
        throw new Error(`File schema non trovato: ${SCHEMA_PATH}`);
      }

      // Carica e esegui lo schema
      const schema = await fs.readFile(SCHEMA_PATH, 'utf8');
      console.log('📝 Schema caricato, lunghezza:', schema.length, 'caratteri');

      // Parse SQL
      const statements = parseSQL(schema);
      console.log(`📋 Trovati ${statements.length} statement SQL`);

      // Esegui ogni statement
      for (let i = 0; i < statements.length; i++) {
        try {
          await client.query(statements[i]);
          console.log(`✅ Statement ${i + 1}/${statements.length} eseguito`);
        } catch (error) {
          // Ignora errori se la tabella/oggetto esiste già (opzionale, dipende dalla strategia)
          if (error.code === '42P07') { // duplicate_table
            console.log(`⚠️ Statement ${i + 1}: Tabella già esistente, salto.`);
          } else {
            console.error(`❌ Errore statement ${i + 1}:`, error.message);
            // Non blocchiamo tutto per un errore, ma lo logghiamo
          }
        }
      }

      console.log('🎉 Database inizializzato con successo!');
      return true;

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Errore inizializzazione database:', error);
    throw error;
  }
};

// Funzione helper per eseguire query
const runQuery = async (sql, params = []) => {
  const client = await pool.connect();
  try {
    const convertedSql = convertQuery(sql);
    const result = await client.query(convertedSql, params);
    // Simula il comportamento di sqlite3 (this.lastID, this.changes)
    // In Postgres INSERT ritorna rows se usiamo RETURNING id, ma qui adattiamo genericamente
    return {
      id: result.rows.length > 0 && result.rows[0].id ? result.rows[0].id : null,
      changes: result.rowCount,
      rows: result.rows
    };
  } finally {
    client.release();
  }
};

// Funzione per query che ritornano una riga
const getOne = async (sql, params = []) => {
  const client = await pool.connect();
  try {
    const convertedSql = convertQuery(sql);
    const result = await client.query(convertedSql, params);
    return result.rows[0];
  } finally {
    client.release();
  }
};

// Funzione per query che ritornano multiple righe
const getAll = async (sql, params = []) => {
  const client = await pool.connect();
  try {
    const convertedSql = convertQuery(sql);
    const result = await client.query(convertedSql, params);
    return result.rows;
  } finally {
    client.release();
  }
};

// Funzione per transazioni
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client); // Passiamo il client se necessario
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Chiudi connessione database
const closeDatabase = async () => {
  await pool.end();
  console.log('✅ Database disconnesso');
};

// Backup database (Non supportato direttamente via codice per Postgres remoto, meglio usare pg_dump)
const createBackup = async () => {
  console.log('⚠️ Backup automatico non supportato per PostgreSQL remoto. Usa gli strumenti di Supabase.');
  return null;
};

// Statistiche database
const getDbStats = async () => {
  try {
    // Verifica tabelle esistenti
    const tables = await getAll(`
      SELECT table_name as name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    const tableNames = tables.map(t => t.name);
    console.log('📋 Tabelle disponibili:', tableNames);

    if (tableNames.length === 0) {
      return {
        users_count: 0,
        lists_count: 0,
        tasks_count: 0,
        completed_tasks_count: 0,
        activity_logs_count: 0
      };
    }

    // Costruisci query
    let query = 'SELECT ';
    const selects = [];

    if (tableNames.includes('users')) {
      selects.push('(SELECT COUNT(*) FROM users) as users_count');
    } else {
      selects.push('0 as users_count');
    }

    if (tableNames.includes('lists')) {
      selects.push('(SELECT COUNT(*) FROM lists) as lists_count');
    } else {
      selects.push('0 as lists_count');
    }

    if (tableNames.includes('tasks')) {
      selects.push('(SELECT COUNT(*) FROM tasks) as tasks_count');
      selects.push('(SELECT COUNT(*) FROM tasks WHERE completed = true) as completed_tasks_count');
    } else {
      selects.push('0 as tasks_count');
      selects.push('0 as completed_tasks_count');
    }

    if (tableNames.includes('activity_logs')) {
      selects.push('(SELECT COUNT(*) FROM activity_logs) as activity_logs_count');
    } else {
      selects.push('0 as activity_logs_count');
    }

    query += selects.join(', ');

    const stats = await getOne(query);
    // Postgres ritorna stringhe per i COUNT, convertiamo a numeri
    return {
      users_count: parseInt(stats.users_count || 0),
      lists_count: parseInt(stats.lists_count || 0),
      tasks_count: parseInt(stats.tasks_count || 0),
      completed_tasks_count: parseInt(stats.completed_tasks_count || 0),
      activity_logs_count: parseInt(stats.activity_logs_count || 0)
    };

  } catch (error) {
    console.error('❌ Errore statistiche database:', error);
    return {
      users_count: 0,
      lists_count: 0,
      tasks_count: 0,
      completed_tasks_count: 0,
      activity_logs_count: 0
    };
  }
};

module.exports = {
  initDatabase,
  runQuery,
  getOne,
  getAll,
  transaction,
  closeDatabase,
  createBackup,
  getDbStats,
  get database() { return pool; }
};