const { Pool } = require('pg');
require('dotenv').config();

async function testConnection() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        const result = await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful');
        console.log('Server time:', result.rows[0].now);
        await pool.end();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
    }
}

testConnection();