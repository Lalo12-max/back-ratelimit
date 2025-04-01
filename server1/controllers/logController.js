const db = require('../config/database');

const getLogStats = async (req, res) => {
    try {
        console.log('Fetching log stats...');
        const { rows: results } = await db.query(`
            SELECT 
                status_code,
                COUNT(*) as count,
                DATE_TRUNC('day', timestamp) as date
            FROM logs 
            GROUP BY status_code, DATE_TRUNC('day', timestamp)
            ORDER BY date DESC, status_code
        `);
        
        console.log('Log stats results:', results);
        res.json(results);
    } catch (error) {
        console.error('Error fetching log stats:', error);
        res.status(500).json({ 
            error: 'Error al obtener estadísticas',
            details: error.message 
        });
    }
};

const getAllLogs = async (req, res) => {
    try {
        console.log('Fetching all logs...');
        const { rows } = await db.query(`
            SELECT * FROM logs 
            ORDER BY timestamp DESC 
            LIMIT 100
        `);
        
        console.log('Number of logs retrieved:', rows.length);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching all logs:', error);
        res.status(500).json({ 
            error: 'Error al obtener logs',
            details: error.message 
        });
    }
};

module.exports = {
    getLogStats,
    getAllLogs
};