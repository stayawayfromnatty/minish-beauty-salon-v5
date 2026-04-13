require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const dbLocal = require('./db_engine');
const dbCloud = require('./cloud_engine');
const authConfig = require('./auth.json');

// Choose engine based on environment
const useCloud = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY;
const db = useCloud ? dbCloud : dbLocal;

if (useCloud) {
  console.log("☁️  Using Cloud Database (Supabase)");
} else {
  console.log("📁 Using Local JSON Database");
  dbLocal.initDB();
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.get('/api/logs', async (req, res) => {
  try { res.json(await db.readLogs()); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/logs', async (req, res) => {
  try {
    const incoming = req.body;
    const currentLogs = await db.readLogs();
    const logsToSave = Array.isArray(incoming) ? [...currentLogs, ...incoming] : [...currentLogs, incoming];
    await db.writeLogs(logsToSave);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/logs/:ts', async (req, res) => {
  try {
    const ts = parseInt(req.params.ts);
    const logs = (await db.readLogs()).filter(l => l.timestamp !== ts);
    await db.writeLogs(logs);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/logs-reset', async (req, res) => {
  try {
    await db.writeLogs([]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Expenses endpoints
app.get('/api/expenses', async (req, res) => {
  try { res.json(await db.readExpenses()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const incoming = req.body;
    let exp = await db.readExpenses();
    if (incoming && incoming.id) {
      exp.push(incoming);
      await db.writeExpenses(exp);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Invalid expense data" });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const exp = (await db.readExpenses()).filter(e => e.id !== id);
    await db.writeExpenses(exp);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Secure Auth Endpoint (POST)
app.post('/api/auth', async (req, res) => {
  try {
    const { user, password } = req.body;
    if (!user || !password) return res.json({ success: false });

    if (useCloud) {
       const success = await db.verifyAuth(user, password);
       return res.json({ success });
    } else {
       const hash = crypto.createHash('sha256').update(String(password)).digest('hex');
       const storedHash = authConfig.users[user];
       res.json({ success: hash === storedHash });
    }
  } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Static File Serving (Robust Pathing)
const publicPath = path.resolve(__dirname);
app.use(express.static(publicPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Catch-all for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Minish Salon Cloud Server running at http://localhost:${PORT}`);
});
