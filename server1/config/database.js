const { Pool } = require('pg');
require('dotenv').config(); // Make sure dotenv is imported

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Improve error handling
pool.on('error', (err) => {
  console.error('Database connection error:', err);
  process.exit(-1);
});

// Add initial connection verification
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Database connection established successfully');
  release();
});

module.exports = {
  query: (text, params) => pool.query(text, params)
};