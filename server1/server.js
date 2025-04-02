const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const dotenv = require('dotenv');
const authController = require('./controllers/authController');
const logMiddleware = require('./middleware/logMiddleware');
const logController = require('./controllers/logController'); 

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

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

app.post('/register', (req, res) => {
  authController.register(req, res, io);
});
app.post('/login', authController.login);
app.post('/verify-mfa', authController.verifyMFA);
// Cambiar las rutas para incluir el prefijo 'rate'
app.get('/rate/logs/stats', logController.getLogStats);
app.get('/rate/logs/all', logController.getAllLogs);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor 1 corriendo en puerto ${PORT}`);
});