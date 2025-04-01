const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const dotenv = require('dotenv');
const authController = require('./controllers/authController');
const logMiddleware = require('./middleware/logMiddleware');
const logController = require('./controllers/logController'); 

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor 1 corriendo en puerto ${PORT}`);
});