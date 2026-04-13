require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function migrate() {
  console.log('🚀 Starting Minish Salon data migration to Supabase...\n');

  // --- MIGRATE TRANSACTIONS ---
  const logsRaw = fs.readFileSync(path.join(__dirname, 'minish-db', 'logs_db.json'), 'utf8');
  const logs = JSON.parse(logsRaw);
  console.log(`📦 Found ${logs.length} transactions to migrate...`);

  let successLogs = 0, failLogs = 0;
  for (const log of logs) {
    const { error } = await supabase.from('transactions').insert([{
      timestamp: log.timestamp ? new Date(log.timestamp).toISOString() : new Date().toISOString(),
      employee_id: log.employeeId || 0,
      employee_name: log.employeeName || 'Unknown',
      service_desc: log.service || '',
      revenue: log.revenue || 0,
      payment_method: log.paymentMethod || 'Cash',
      customer_name: log.customerName || '',
      points: log.points || 0,
      details: {
        shampoo: log.shampoo,
        conditioner: log.conditioner,
        placenta: log.placenta,
        netRevenue: log.netRevenue,
        vatAmount: log.vatAmount,
        isTip: log.isTip
      }
    }]);
    if (error) { failLogs++; console.error('  ❌ Log error:', error.message); }
    else successLogs++;
  }
  console.log(`✅ Transactions: ${successLogs} migrated, ${failLogs} failed\n`);

  // --- MIGRATE EXPENSES ---
  const expRaw = fs.readFileSync(path.join(__dirname, 'minish-db', 'expenses_db.json'), 'utf8');
  const expenses = JSON.parse(expRaw);
  console.log(`📦 Found ${expenses.length} expenses to migrate...`);

  let successExp = 0, failExp = 0;
  for (const exp of expenses) {
    const { error } = await supabase.from('expenses').insert([{
      timestamp: exp.timestamp ? new Date(exp.timestamp).toISOString() : new Date().toISOString(),
      amount: exp.amount || 0,
      description: exp.description || '',
      expense_type: exp.expense_type || 'general',
      tip_payout: exp.tip_payout || 0
    }]);
    if (error) { failExp++; console.error('  ❌ Expense error:', error.message); }
    else successExp++;
  }
  console.log(`✅ Expenses: ${successExp} migrated, ${failExp} failed\n`);

  console.log('🎉 MIGRATION COMPLETE! Your historical data is now in the cloud.');
}

migrate().catch(console.error);
