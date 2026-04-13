require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("WARNING: Supabase URL or Key is missing. Cloud operations will fail.");
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function readLogs() {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('timestamp', { ascending: false });
    if (error) throw error;
    return data.map(t => ({
      id: t.id, timestamp: new Date(t.timestamp).getTime(),
      employeeId: t.employee_id, employeeName: t.employee_name,
      service: t.service_desc, revenue: parseFloat(t.revenue) || 0,
      paymentMethod: t.payment_method, customerName: t.customer_name,
      points: t.points, ...t.details
    }));
  } catch (e) { console.error("Cloud ReadLogs Error:", e); return []; }
}

async function writeLogs(logs) {
  if (!logs.length) return;
  const latest = logs[logs.length - 1];
  try {
    const { error } = await supabase.from('transactions').insert([{
      employee_id: latest.employeeId, employee_name: latest.employeeName,
      service_desc: latest.service, revenue: latest.revenue,
      payment_method: latest.paymentMethod, customer_name: latest.customerName,
      points: latest.points,
      details: { shampoo: latest.shampoo, conditioner: latest.conditioner, placenta: latest.placenta }
    }]);
    if (error) throw error;
  } catch (e) { console.error("Cloud WriteLogs Error:", e); }
}

async function readExpenses() {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('timestamp', { ascending: false });
    if (error) throw error;
    return data.map(e => ({
      id: e.id, amount: parseFloat(e.amount) || 0, description: e.description,
      expense_type: e.expense_type, timestamp: new Date(e.timestamp).getTime(), tip_payout: e.tip_payout
    }));
  } catch (e) { console.error("Cloud ReadExpenses Error:", e); return []; }
}

async function writeExpenses(expenses) {
  if (!expenses.length) return;
  const latest = expenses[expenses.length - 1];
  try {
    const { error } = await supabase.from('expenses').insert([{
      amount: latest.amount, description: latest.description,
      expense_type: latest.expense_type, tip_payout: latest.tip_payout
    }]);
    if (error) throw error;
  } catch (e) { console.error("Cloud WriteExpenses Error:", e); }
}

async function verifyAuth(user, password) {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(String(password)).digest('hex');
  try {
    const { data, error } = await supabase
      .from('users').select('password_hash')
      .eq('username', user).single();
    if (error || !data) return false;
    return data.password_hash === hash;
  } catch (e) { return false; }
}

module.exports = { readLogs, writeLogs, readExpenses, writeExpenses, verifyAuth };
