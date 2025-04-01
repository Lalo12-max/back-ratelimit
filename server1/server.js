const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const dotenv = require('dotenv');
const authController = require('./controllers/authController');
const logMiddleware = require('./middleware/logMiddleware');
const logController = require('./controllers/logController');
const db = require('./config/database');  // Agregamos esta línea

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173', 'https://frontend-seguridad.onrender.com'],
  methods: ['GET', 'POST'],
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100
});

app.use(limiter);
app.use(logMiddleware);

app.post('/register', authController.register);
app.post('/login', authController.login);
app.post('/verify-mfa', authController.verifyMFA);
app.get('/logs/stats', logController.getLogStats);
app.get('/logs/all', logController.getAllLogs);
app.post('/frontend-logs', async (req, res) => {
    try {
        const logData = req.body;
        await db.query(`
            INSERT INTO frontend_logs (
                user_id, event_type, component_name, action_description,
                browser_info, screen_resolution, user_language, page_url,
                error_message, stack_trace, performance_metrics,
                user_interaction_data, ip_address, user_agent
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
            logData.user_id || null,
            logData.event_type,
            logData.component_name,
            logData.action_description,
            logData.browser_info,
            logData.screen_resolution,
            logData.user_language,
            logData.page_url,
            logData.error_message || null,
            logData.stack_trace || null,
            logData.performance_metrics || null,
            logData.user_interaction_data || null,
            req.ip,
            req.headers['user-agent']
        ]);
        res.status(200).json({ message: 'Log guardado exitosamente' });
    } catch (error) {
        console.error('Error al guardar log del frontend:', error);
        res.status(500).json({ error: 'Error al guardar log' });
    }
});
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor 1 corriendo en puerto ${PORT}`);
});