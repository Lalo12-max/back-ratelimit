const db = require('../config/database');

const getLogStats = async (req, res) => {
    try {
        // Estadísticas generales
        const { rows: results } = await db.query(`
            SELECT 
                method,
                path,
                status_code,
                COUNT(*) as count,
                DATE_TRUNC('day', timestamp) as date
            FROM rate_limit_logs 
            GROUP BY method, path, status_code, DATE_TRUNC('day', timestamp)
            ORDER BY date DESC, status_code
        `);

        // Distribución por ruta específica para rate limit
        const { rows: routeDistribution } = await db.query(`
            SELECT 
                path,
                COUNT(*) as total_requests,
                COUNT(CASE WHEN status_code = 429 THEN 1 END) as rate_limited,
                COUNT(CASE WHEN status_code != 429 THEN 1 END) as successful
            FROM rate_limit_logs
            GROUP BY path
            ORDER BY total_requests DESC
        `);

        res.json({
            general: results,
            routeDistribution: routeDistribution
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const getAllLogs = async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT 
                id,
                method,
                path,
                status_code,
                response_time,
                ip_address,
                timestamp
            FROM rate_limit_logs 
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