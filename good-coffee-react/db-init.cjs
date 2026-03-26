// Database initialization script
// Run this once to create the database tables:
//   node db-init.cjs

require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/good_coffee';

const pool = new Pool({ connectionString: DATABASE_URL });

async function init() {
  console.log('Connecting to PostgreSQL...');
  console.log(`URL: ${DATABASE_URL.replace(/:[^@]+@/, ':***@')}`);

  try {
    // Create orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        "table" VARCHAR(50) NOT NULL,
        items JSONB NOT NULL,
        preparing BOOLEAN DEFAULT FALSE,
        prepared BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log('✅ "orders" table created (or already exists)');

    // Create index for faster name lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_name ON orders (LOWER(name));
    `);

    console.log('✅ Index on name created');

    // Create index for created_at (for cleanup queries)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);
    `);

    console.log('✅ Index on created_at created');

    console.log('\n🎉 Database initialized successfully!');
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    console.error('\nMake sure PostgreSQL is running and the database "good_coffee" exists.');
    console.error('Create it with: CREATE DATABASE good_coffee;');
  } finally {
    await pool.end();
  }
}

init();
