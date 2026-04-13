-- Fix users table with correct password hashes
-- Passwords: Nahom=nahom123, Meklit=meklit123, Minish=minish123

DELETE FROM users;

INSERT INTO users (username, password_hash, role) VALUES
('Nahom', '6c34580e9e5d56781e1961ce7df02c8038aa75ec765ce5f0b6de71e84ea2f126', 'cashier'),
('Meklit', 'c50fcdd44ac247d5da7becd1892e0aa81f675ed4bb92c41a8ae64c672e0a633e', 'cashier'),
('Minish', '6f5ee3b19ef2e58dc7de20ebfc884ac334325d0522fe54f838419a1f87a45d37', 'manager');
