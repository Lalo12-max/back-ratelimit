const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const db = require('../config/database');

const mfaStorage = new Map();

const register = async (req, res) => {
    try {
        console.log('Starting registration process...');
        console.log('Request body:', req.body);
        
        const { email, username, password } = req.body;
        
        console.log('Extracted credentials:', { 
            email, 
            username, 
            hasPassword: !!password 
        });

        // Verify if user exists
        console.log('Checking if user exists...');
        const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        console.log('User exists query result:', {
            rowCount: userExists.rows.length,
            found: userExists.rows.length > 0
        });

        if (userExists.rows.length > 0) {
            console.log('User already exists, sending 400 response');
            return res.status(400).json({ message: 'El usuario ya existe' });
        }

        console.log('Generating 2FA secret...');
        const secret = speakeasy.generateSecret({
            name: `ProyectoSeguridad:${email}`,
            length: 16 
        });
        console.log('2FA secret generated:', { secretBase32: secret.base32 });

        console.log('Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Password hashed successfully');

        console.log('Inserting new user into database...');
        const result = await db.query(
            'INSERT INTO users (email, username, password, secret) VALUES ($1, $2, $3, $4) RETURNING *',
            [email, username, hashedPassword, secret.base32]
        );
        console.log('Database insert result:', {
            success: !!result.rows[0],
            userId: result.rows[0]?.id
        });

        console.log('Registration successful, sending response');
        res.status(201).json({ 
            message: 'Usuario registrado exitosamente',
            secretKey: secret.base32, 
            instrucciones: [
                "1. Abre Microsoft Authenticator",
                "2. Pulsa en + (agregar cuenta)",
                "3. Selecciona 'Otra cuenta (Google, Facebook, etc.)'",
                "4. Selecciona 'Ingresar código manualmente'",
                "5. Nombre: ProyectoSeguridad",
                "6. Ingresa este código: " + secret.base32
            ]
        });
    } catch (error) {
        console.error('Registration error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            message: 'Error en el registro',
            error: error.message 
        });
    }
};

const generateMFACode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const login = async (req, res) => {
    try {
        console.log('Datos de login recibidos:', {
            email: req.body.email,
            hasPassword: !!req.body.password,
            hasToken: !!req.body.token
        });
        
        const { email, password, token } = req.body;
        
      
        const { rows: users } = await db.query(
            'SELECT * FROM users WHERE email = $1', 
            [email]
        );
        const user = users[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ 
                success: false,
                message: 'Credenciales inválidas' 
            });
        }

        
        console.log('Intentando verificar TOTP:', {
            hasSecret: !!user.secret,
            receivedToken: token,
            tokenLength: token?.length
        });

        const verified = speakeasy.totp.verify({
            secret: user.secret,
            encoding: 'base32',
            token: token,
            window: 2
        });

        console.log('Resultado verificación TOTP:', verified);

        if (!verified) {
            return res.status(401).json({
                success: false,
                message: 'Código del autenticador inválido'
            });
        }

        
        const jwtToken = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ 
            success: true,
            message: 'Autenticación exitosa',
            token: jwtToken
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error en el servidor' 
        });
    }
};

const verifyMFA = async (req, res) => {
    try {
        console.log('Datos recibidos en verifyMFA:', {
            body: req.body,
            headers: req.headers
        });
        const { userId, mfaCode } = req.body;
        
        console.log('Valores extraídos:', { userId, mfaCode });
        console.log('Estado actual del mfaStorage:', {
            keys: Array.from(mfaStorage.keys()),
            hasUserId: mfaStorage.has(userId?.toString())
        });

        if (!userId || !mfaCode) {
            console.log('Validación fallida:', { userId, mfaCode });
            return res.status(400).json({ 
                success: false,
                message: 'UserId y código MFA son requeridos',
                debug: { userId: !!userId, mfaCode: !!mfaCode }
            });
        }

        const mfaData = mfaStorage.get(userId.toString());
        console.log('Datos MFA recuperados:', {
            encontrado: !!mfaData,
            datos: mfaData,
            codigoEsperado: mfaData?.code,
            codigoRecibido: mfaCode
        });

        if (!mfaData) {
            return res.status(401).json({ message: 'Código MFA expirado o inválido' });
        }

        
        if (Date.now() - mfaData.timestamp > 5 * 60 * 1000) {
            mfaStorage.delete(userId.toString());
            return res.status(401).json({ message: 'Código MFA expirado' });
        }

        
        if (mfaData.attempts >= 3) {
            mfaStorage.delete(userId.toString());
            return res.status(401).json({ message: 'Demasiados intentos fallidos. Por favor, inicie sesión nuevamente' });
        }

       
        if (mfaCode !== mfaData.code) {
            mfaData.attempts++;
            return res.status(401).json({ 
                message: 'Código MFA incorrecto',
                intentosRestantes: 3 - mfaData.attempts
            });
        }

        
        mfaStorage.delete(userId.toString());
        
       
        const token = jwt.sign(
            { userId },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ 
            message: 'Autenticación exitosa',
            token 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// Make sure all these methods are properly exported
module.exports = {
    register,
    login,
    verifyMFA  // Verify this method exists and is properly defined
};