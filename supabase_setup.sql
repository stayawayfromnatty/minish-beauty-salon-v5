-- Supabase SQL Setup for Minish Beauty Salon v5

-- 1. Create Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  employee_id INT,
  employee_name TEXT,
  service_desc TEXT,
  revenue DECIMAL(10,2),
  payment_method TEXT,
  customer_name TEXT,
  points INT,
  details JSONB -- Stores extra info like shampoo/conditioner usage
);

-- 2. Create Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  amount DECIMAL(10,2),
  description TEXT,
  expense_type TEXT,
  tip_payout DECIMAL(10,2) DEFAULT 0
);

-- 3. Create Users Table (for Cashier Auth)
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE,
  password_hash TEXT,
  role TEXT DEFAULT 'cashier'
);

-- Insert Default Cashiers (Nahom123, Meklit123, Minish123)
-- These are SHA-256 hashes for [name]123
INSERT INTO users (username, password_hash) VALUES
('Nahom', '784c56e36d4df7cc283c44a0db60b72013f993d05f3d3d63b063d8429ec5817a'),
('Meklit', '538e1b12b3f3b97b0a3f85e7a9e9a4f6d3d4b6c9a7b8c2e1d0f5e4d2c1b0a9f8'), -- Placeholder, will be corrected
('Minish', '538e1b12b3f3b97b0a3f85e7a9e9a4f6d3d4b6c9f6a7b8c2e1d0f5e4d2c1b0a9f8'); -- Placeholder

-- Enable Row Level Security (RLS) - Recommended but optional for private apps
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
