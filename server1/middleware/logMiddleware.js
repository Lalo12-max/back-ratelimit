const db = require('../config/database');
const jwt = require('jsonwebtoken');

const getClientIp = (req) => {
    
    let ip = req.headers['x-forwarded-for'] || 
            req.headers['x-real-ip'] ||
            req.socket?.remoteAddress ||
            '127.0.0.1';

   
    if (ip === '::1' || ip === ':1' || ip === '::ffff:127.0.0.1') {
        ip = '127.0.0.1';
    }

    
    if (ip.includes('::ffff:')) {
        ip = ip.split('::ffff:')[1];
    }

    return ip;
};

const logMiddleware = async (req, res, next) => {
    const start = Date.now();

   
    const authHeader = req.headers['authorization'];
    let userId = null;

    if (authHeader) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.id || decoded.userId;
        } catch (error) {
            console.log('Error al decodificar token:', error.message);
        }
    }

  
    const oldSend = res.send;
    res.send = async function (data) {
        const result = oldSend.call(this, data);
        
        const responseTime = Date.now() - start;
        console.log('Preparando datos para log:', {
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode
        });
        
        const logData = {
            user_id: userId || req.user?.id || null,
            method: req.method.substring(0, 45),
            path: req.originalUrl.substring(0, 45),
            status_code: res.statusCode,
            response_time: `${responseTime}`.substring(0, 45),
            ip_address: getClientIp(req).substring(0, 45),
            user_agent: (req.headers['user-agent'] || '').substring(0, 45),
            request_body: JSON.stringify(req.body).substring(0, 45),
            // Agregamos los campos faltantes
            query_params: JSON.stringify(req.query).substring(0, 255),
            hostname: req.hostname?.substring(0, 255) || null,
            protocol: req.protocol?.substring(0, 10) || null,
            environment: process.env.NODE_ENV?.substring(0, 20) || 'development',
            node_version: process.version.substring(0, 20),
            process_id: process.pid
        };

        try {
            console.log('Intentando insertar log en la base de datos...');
            try {
                console.log('=== INICIO DE REGISTRO DE LOG ===');
                console.log('Datos a insertar:', {
                    user_id: logData.user_id,
                    method: logData.method,
                    path: logData.path,
                    status_code: logData.status_code,
                    response_time: logData.response_time,
                    ip_address: logData.ip_address
                });
                console.log('Query params:', logData.query_params);
                console.log('Request body:', logData.request_body);

                const result = await db.query(`
                    INSERT INTO rate_limit_logs 
                    (user_id, method, path, status_code, response_time,
                    ip_address, user_agent, request_body, query_params,
                    hostname, protocol, environment, node_version, process_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    RETURNING *
                `, [
                    logData.user_id,
                    logData.method,
                    logData.path,
                    logData.status_code,
                    logData.response_time,
                    logData.ip_address,
                    logData.user_agent,
                    logData.request_body,
                    logData.query_params,
                    logData.hostname,
                    logData.protocol,
                    logData.environment,
                    logData.node_version,
                    logData.process_id
                ]);
                
                console.log('=== RESULTADO DE LA INSERCIÓN ===');
                console.log('Row insertada:', result.rows[0]);
                console.log('=== FIN DE REGISTRO DE LOG ===');
            } catch (error) {
                console.error('=== ERROR EN REGISTRO DE LOG ===');
                console.error('Error completo:', error);
                console.error('Mensaje de error:', error.message);
                console.error('Stack trace:', error.stack);
                console.error('Datos que se intentaron insertar:', logData);
                console.error('=== FIN DE ERROR ===');
            }
            console.log('Log guardado exitosamente:', result.rows[0]);
        } catch (error) {
            console.error('Error detallado al guardar log:', {
                error: error.message,
                stack: error.stack,
                logData
            });
        }
        
        return result;
    };

    next();
};

module.exports = logMiddleware;
