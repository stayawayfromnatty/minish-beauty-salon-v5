const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, 'minish-db');
const LOGS_FILE = path.join(DB_DIR, 'logs_db.json');
const INV_FILE = path.join(DB_DIR, 'inventory_db.json');
const EXPENSES_FILE = path.join(DB_DIR, 'expenses_db.json');
const BACKUP_DIR = path.join(DB_DIR, 'backups');

function initDB() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);
  if (!fs.existsSync(LOGS_FILE)) fs.writeFileSync(LOGS_FILE, JSON.stringify([]));
  if (!fs.existsSync(INV_FILE)) fs.writeFileSync(INV_FILE, JSON.stringify([]));
  if (!fs.existsSync(EXPENSES_FILE)) fs.writeFileSync(EXPENSES_FILE, JSON.stringify([]));
}

function atomicWrite(filePath, data) {
  const tmpPath = filePath + '.tmp';
  
  // Create backup before writing
  const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
  if (stats && stats.size > 0) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.basename(filePath);
    const backupPath = path.join(BACKUP_DIR, `${filename}.${timestamp}.bak`);
    fs.copyFileSync(filePath, backupPath);
    
    // Keep only last 10 backups
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith(filename))
      .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime }))
      .sort((a,b) => b.time - a.time);
    
    if (backups.length > 10) {
      backups.slice(10).forEach(b => fs.unlinkSync(path.join(BACKUP_DIR, b.name)));
    }
  }

  const content = JSON.stringify(data, null, 2);
  fs.writeFileSync(tmpPath, content);

  let success = false;
  let attempts = 0;
  while (!success && attempts < 5) {
    try {
      fs.renameSync(tmpPath, filePath);
      success = true;
    } catch (e) {
      attempts++;
      if (attempts >= 5) throw e;
      const waitTill = new Date(new Date().getTime() + 100);
      while(waitTill > new Date()){}
    }
  }
}

function readLogs() {
  try {
    if (!fs.existsSync(LOGS_FILE)) return [];
    const data = fs.readFileSync(LOGS_FILE, 'utf8');
    if (!data || data.trim() === "") throw new Error("File is empty");
    return JSON.parse(data);
  } catch (e) {
    console.error("Error reading logs, attempting recovery...", e);
    try {
      if (fs.existsSync(BACKUP_DIR)) {
        const backups = fs.readdirSync(BACKUP_DIR)
          .filter(f => f.startsWith('logs_db.json'))
          .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime }))
          .sort((a,b) => b.time - a.time);
        if (backups.length > 0) {
          const latestBackup = path.join(BACKUP_DIR, backups[0].name);
          console.log(`Recovering from: ${latestBackup}`);
          return JSON.parse(fs.readFileSync(latestBackup, 'utf8'));
        }
      }
    } catch (backupErr) { console.error("Backup recovery failed:", backupErr); }
    return [];
  }
}

function writeLogs(logs) { atomicWrite(LOGS_FILE, logs); }

function readInventory() {
  try {
    if (!fs.existsSync(INV_FILE)) return [];
    const data = fs.readFileSync(INV_FILE, 'utf8');
    if (!data || data.trim() === "") throw new Error("File is empty");
    return JSON.parse(data);
  } catch (e) { return []; }
}

function writeInventory(inv) { atomicWrite(INV_FILE, inv); }

function readExpenses() {
  try {
    if (!fs.existsSync(EXPENSES_FILE)) return [];
    const data = fs.readFileSync(EXPENSES_FILE, 'utf8');
    if (!data || data.trim() === "") throw new Error("File is empty");
    return JSON.parse(data);
  } catch (e) {
    console.error("Error reading expenses, attempting recovery...", e);
    try {
      if (fs.existsSync(BACKUP_DIR)) {
        const backups = fs.readdirSync(BACKUP_DIR)
          .filter(f => f.startsWith('expenses_db.json'))
          .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime }))
          .sort((a,b) => b.time - a.time);
        if (backups.length > 0) {
          const latestBackup = path.join(BACKUP_DIR, backups[0].name);
          console.log(`Recovering from: ${latestBackup}`);
          return JSON.parse(fs.readFileSync(latestBackup, 'utf8'));
        }
      }
    } catch (backupErr) { console.error("Backup recovery failed:", backupErr); }
    return [];
  }
}

function writeExpenses(expenses) { atomicWrite(EXPENSES_FILE, expenses); }

module.exports = {
  initDB,
  readLogs,
  writeLogs,
  readInventory,
  writeInventory,
  readExpenses,
  writeExpenses
};
