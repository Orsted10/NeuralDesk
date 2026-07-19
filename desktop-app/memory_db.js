const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

class MemoryDB {
  constructor() {
    this.db = null;
  }

  init() {
    return new Promise((resolve, reject) => {
      const userDataPath = app.getPath('userData');
      const dbPath = path.join(userDataPath, 'aetheria_memory.db');
      
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('[MemoryDB] Error connecting to memory database:', err);
          return reject(err);
        }
        console.log(`[MemoryDB] Connected to memory database at ${dbPath}`);
        this.setupTables().then(resolve).catch(reject);
      });
    });
  }

  setupTables() {
    return new Promise((resolve, reject) => {
      const queries = [
        `CREATE TABLE IF NOT EXISTS EpisodicMemory (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          window_title TEXT,
          url TEXT,
          process_name TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS ContextGraph (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          subject TEXT,
          predicate TEXT,
          object TEXT,
          source TEXT
        )`
      ];

      this.db.serialize(() => {
        this.db.run(queries[0]);
        this.db.run(queries[1], (err) => {
          if (err) {
            console.error('[MemoryDB] Error creating tables:', err);
            return reject(err);
          }
          console.log('[MemoryDB] Tables initialized successfully');
          resolve();
        });
      });
    });
  }

  logEpisode(windowTitle, url = null, processName = null) {
    if (!this.db) return;
    const stmt = this.db.prepare('INSERT INTO EpisodicMemory (window_title, url, process_name) VALUES (?, ?, ?)');
    stmt.run([windowTitle, url, processName], (err) => {
      if (err) console.error('[MemoryDB] Error logging episode:', err);
    });
    stmt.finalize();
  }

  logContext(subject, predicate, object, source = 'interaction') {
    if (!this.db) return;
    const stmt = this.db.prepare('INSERT INTO ContextGraph (subject, predicate, object, source) VALUES (?, ?, ?, ?)');
    stmt.run([subject, predicate, object, source], (err) => {
      if (err) console.error('[MemoryDB] Error logging context:', err);
    });
    stmt.finalize();
  }

  getRecentEpisodes(limit = 10) {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve([]);
      this.db.all('SELECT * FROM EpisodicMemory ORDER BY timestamp DESC LIMIT ?', [limit], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  searchContext(query) {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve([]);
      const searchTerm = `%${query}%`;
      this.db.all(
        'SELECT * FROM ContextGraph WHERE subject LIKE ? OR predicate LIKE ? OR object LIKE ? ORDER BY timestamp DESC LIMIT 50', 
        [searchTerm, searchTerm, searchTerm], 
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
      });
    });
  }
}

module.exports = new MemoryDB();
