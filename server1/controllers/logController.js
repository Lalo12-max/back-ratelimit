const db = require('../config/database');

const getLogStats = async (req, res) => {
    try {
        const { rows: results } = await db.query(`
            SELECT 
                status_code,
                COUNT(*) as count,
                DATE_TRUNC('day', timestamp) as date
            FROM logs 
            GROUP BY status_code, DATE_TRUNC('day', timestamp)
            ORDER BY date DESC, status_code
        `);
        
        const stats = {
            successCount: results.filter(r => r.status_code >= 200 && r.status_code < 300).length,
            errorCount: results.filter(r => r.status_code >= 400).length,
            byDate: {},
            byStatusCode: {}
        };

        results.forEach(row => {
            if (!stats.byDate[row.date]) {
                stats.byDate[row.date] = {};
            }
            stats.byDate[row.date][row.status_code] = row.count;

            if (!stats.byStatusCode[row.status_code]) {
                stats.byStatusCode[row.status_code] = 0;
            }
            stats.byStatusCode[row.status_code] += row.count;
        });

        res.json(stats);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas de logs' });
    }
};

const getAllLogs = async (req, res) => {
    try {
        const { rows: logs } = await db.query(`
            SELECT 
                l.*,
                u.username
            FROM logs l
            LEFT JOIN users u ON l.user_id = u.id
            ORDER BY l.timestamp DESC
            LIMIT 1000
        `);
        
        res.json(logs);
    } catch (error) {
        console.error('Error al obtener logs:', error);
        res.status(500).json({ message: 'Error al obtener logs' });
    }
};

module.exports = {
    getLogStats,
    getAllLogs
};