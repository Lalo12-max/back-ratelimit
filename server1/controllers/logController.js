const db = require('../config/database');

const getLogStats = async (req, res) => {
    try {
        const { rows: results } = await db.query(`
            SELECT 
                status_code,
                COUNT(*) as count,
                DATE_TRUNC('day', timestamp) as date
            FROM rate_limit_logs 
            GROUP BY status_code, DATE_TRUNC('day', timestamp)
            ORDER BY date DESC, status_code
        `);
        res.json(results);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const getAllLogs = async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT * FROM rate_limit_logs 
            ORDER BY timestamp DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener logs:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = {
    getLogStats,
    getAllLogs
};