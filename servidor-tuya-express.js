require('dotenv').config();
const express = require('express');
const cors = require('cors');
const qs = require('qs');
const crypto = require('crypto');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static('public')); // Servir archivos estáticos

// Configuración de Tuya - TODAS las credenciales vienen del .env
const config = {
    host: process.env.TUYA_HOST || 'https://openapi.tuyaus.com',
    accessKey: process.env.TUYA_ACCESS_KEY,
    secretKey: process.env.TUYA_SECRET_KEY,
    deviceId: process.env.TUYA_DEVICE_ID,
};

// Validar que todas las credenciales estén presentes
function validateConfig() {
    const missing = [];
    if (!config.accessKey) missing.push('TUYA_ACCESS_KEY');
    if (!config.secretKey) missing.push('TUYA_SECRET_KEY');
    if (!config.deviceId) missing.push('TUYA_DEVICE_ID');

    if (missing.length > 0) {
        console.error('❌ Variables de entorno faltantes:');
        missing.forEach(key => console.error(`   - ${key}`));
        console.error('\nCrea un archivo .env con:');
        console.error('TUYA_ACCESS_KEY=tu_access_key');
        console.error('TUYA_SECRET_KEY=tu_secret_key');
        console.error('TUYA_DEVICE_ID=tu_device_id');
        console.error('TUYA_HOST=https://openapi.tuyaus.com (opcional)');
        return false;
    }
    return true;
}

let token = '';

const httpClient = axios.create({
    baseURL: config.host,
    timeout: 10000,
});

// Función para obtener token
async function getToken() {
    try {
        const method = 'GET';
        const timestamp = Date.now().toString();
        const signUrl = '/v1.0/token?grant_type=1';
        const contentHash = crypto.createHash('sha256').update('').digest('hex');
        const stringToSign = [method, contentHash, '', signUrl].join('\n');
        const signStr = config.accessKey + timestamp + stringToSign;

        const headers = {
            t: timestamp,
            sign_method: 'HMAC-SHA256',
            client_id: config.accessKey,
            sign: await encryptStr(signStr, config.secretKey),
        };

        const { data: login } = await httpClient.get('/v1.0/token?grant_type=1', { headers });

        if (!login || !login.success) {
            throw new Error(`fetch failed: ${login.msg}`);
        }

        token = login.result.access_token;
        console.log('Token obtenido exitosamente');
        return token;
    } catch (error) {
        console.error('Error obteniendo token:', error.message);
        throw error;
    }
}

// Función para encriptar
async function encryptStr(str, secret) {
    return crypto.createHmac('sha256', secret).update(str, 'utf8').digest('hex').toUpperCase();
}

// Función para generar firma de petición
async function getRequestSign(path, method, headers = {}, query = {}, body = {}) {
    const t = Date.now().toString();
    const [uri, pathQuery] = path.split('?');
    const queryMerged = Object.assign(query, qs.parse(pathQuery));
    const sortedQuery = {};

    Object.keys(queryMerged)
        .sort()
        .forEach((i) => (sortedQuery[i] = queryMerged[i]));

    const querystring = decodeURIComponent(qs.stringify(sortedQuery));
    const url = querystring ? `${uri}?${querystring}` : uri;
    const contentHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
    const stringToSign = [method, contentHash, '', url].join('\n');
    const signStr = config.accessKey + token + t + stringToSign;

    return {
        t,
        path: url,
        client_id: config.accessKey,
        sign: await encryptStr(signStr, config.secretKey),
        sign_method: 'HMAC-SHA256',
        access_token: token,
    };
}

// Función para controlar el dispositivo
async function controlDevice(deviceId, command, value) {
    try {
        // Verificar si tenemos token válido
        if (!token) {
            await getToken();
        }

        const body = {
            commands: [
                {
                    code: command,
                    value: value
                }
            ]
        };

        const method = 'POST';
        const url = `/v1.0/devices/${deviceId}/commands`;
        const reqHeaders = await getRequestSign(url, method, {}, {}, body);

        const { data } = await httpClient.request({
            method,
            data: body,
            params: {},
            headers: reqHeaders,
            url: reqHeaders.path,
        });

        if (!data || !data.success) {
            throw new Error(`request api failed: ${data.msg}`);
        }

        return data;
    } catch (error) {
        console.error('Error controlando dispositivo:', error.message);
        throw error;
    }
}

// Función para obtener información del dispositivo
async function getDeviceInfo(deviceId) {
    try {
        if (!token) {
            await getToken();
        }

        const method = 'GET';
        const url = `/v1.0/devices/${deviceId}`;
        const reqHeaders = await getRequestSign(url, method, {}, {}, {});

        const { data } = await httpClient.request({
            method,
            params: {},
            headers: reqHeaders,
            url: reqHeaders.path,
        });

        if (!data || !data.success) {
            throw new Error(`request api failed: ${data.msg}`);
        }

        return data;
    } catch (error) {
        console.error('Error obteniendo info del dispositivo:', error.message);
        throw error;
    }
}

// ENDPOINTS

// Ruta principal - servir la interfaz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint de salud
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        hasToken: !!token,
        config: {
            hasAccessKey: !!config.accessKey,
            hasSecretKey: !!config.secretKey,
            hasDeviceId: !!config.deviceId,
            environment: process.env.NODE_ENV || 'development',
            host: config.host
        }
    });
});

// Endpoint para encender el dispositivo
app.post('/device/on', async (req, res) => {
    try {
        const result = await controlDevice(config.deviceId, 'switch_led', true);
        res.json({
            success: true,
            message: 'Dispositivo encendido',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error encendiendo dispositivo',
            error: error.message
        });
    }
});

// Endpoint para apagar el dispositivo
app.post('/device/off', async (req, res) => {
    try {
        const result = await controlDevice(config.deviceId, 'switch_led', false);
        res.json({
            success: true,
            message: 'Dispositivo apagado',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error apagando dispositivo',
            error: error.message
        });
    }
});

// Endpoint para controlar el dispositivo con parámetros personalizados
app.post('/device/control', async (req, res) => {
    try {
        const { command, value, deviceId } = req.body;

        if (!command || value === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Faltan parámetros: command y value son requeridos'
            });
        }

        const targetDeviceId = deviceId || config.deviceId;
        const result = await controlDevice(targetDeviceId, command, value);

        res.json({
            success: true,
            message: 'Comando enviado exitosamente',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error controlando dispositivo',
            error: error.message
        });
    }
});

// Endpoint para obtener información del dispositivo
app.get('/device/info', async (req, res) => {
    try {
        const result = await getDeviceInfo(config.deviceId);
        res.json({
            success: true,
            message: 'Información obtenida exitosamente',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error obteniendo información del dispositivo',
            error: error.message
        });
    }
});

// Endpoint para obtener información de dispositivo específico
app.get('/device/:deviceId/info', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const result = await getDeviceInfo(deviceId);
        res.json({
            success: true,
            message: 'Información obtenida exitosamente',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error obteniendo información del dispositivo',
            error: error.message
        });
    }
});

// Endpoint para renovar token manualmente
app.post('/token/refresh', async (req, res) => {
    try {
        await getToken();
        res.json({
            success: true,
            message: 'Token renovado exitosamente'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error renovando token',
            error: error.message
        });
    }
});

// Endpoint para cambiar color HSV
app.post('/device/color/hsv', async (req, res) => {
    try {
        const { h, s, v } = req.body;

        if (h === undefined || s === undefined || v === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Faltan parámetros: h (0-360), s (0-1000), v (0-1000) son requeridos'
            });
        }

        // Validar rangos
        if (h < 0 || h > 360 || s < 0 || s > 1000 || v < 0 || v > 1000) {
            return res.status(400).json({
                success: false,
                message: 'Valores fuera de rango: h(0-360), s(0-1000), v(0-1000)'
            });
        }

        const result = await controlDevice(config.deviceId, 'colour_data_v2', {
            h: Math.round(h),
            s: Math.round(s),
            v: Math.round(v)
        });

        res.json({
            success: true,
            message: 'Color HSV cambiado exitosamente',
            data: result,
            color: { h, s, v }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error cambiando color HSV',
            error: error.message
        });
    }
});

// Endpoint para cambiar brillo
app.post('/device/brightness', async (req, res) => {
    try {
        const { brightness } = req.body;

        if (brightness === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Parámetro brightness (10-1000) es requerido'
            });
        }

        // Validar rango
        if (brightness < 10 || brightness > 1000) {
            return res.status(400).json({
                success: false,
                message: 'Brillo fuera de rango: debe estar entre 10 y 1000'
            });
        }

        const result = await controlDevice(config.deviceId, 'bright_value_v2', Math.round(brightness));

        res.json({
            success: true,
            message: 'Brillo cambiado exitosamente',
            data: result,
            brightness: brightness
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error cambiando brillo',
            error: error.message
        });
    }
});

// Endpoint para cambiar temperatura de color (blanco cálido/frío)
app.post('/device/temperature', async (req, res) => {
    try {
        const { temperature } = req.body;

        if (temperature === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Parámetro temperature (0-1000) es requerido'
            });
        }

        // Validar rango
        if (temperature < 0 || temperature > 1000) {
            return res.status(400).json({
                success: false,
                message: 'Temperatura fuera de rango: debe estar entre 0 y 1000'
            });
        }

        const result = await controlDevice(config.deviceId, 'temp_value_v2', Math.round(temperature));

        res.json({
            success: true,
            message: 'Temperatura de color cambiada exitosamente',
            data: result,
            temperature: temperature
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error cambiando temperatura de color',
            error: error.message
        });
    }
});

// Endpoint para cambiar modo de color
app.post('/device/mode', async (req, res) => {
    try {
        const { mode } = req.body;

        if (!mode) {
            return res.status(400).json({
                success: false,
                message: 'Parámetro mode es requerido (white, colour, scene, music)'
            });
        }

        const validModes = ['white', 'colour', 'scene', 'music'];
        if (!validModes.includes(mode)) {
            return res.status(400).json({
                success: false,
                message: `Modo inválido. Modos válidos: ${validModes.join(', ')}`
            });
        }

        const result = await controlDevice(config.deviceId, 'work_mode', mode);

        res.json({
            success: true,
            message: 'Modo cambiado exitosamente',
            data: result,
            mode: mode
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error cambiando modo',
            error: error.message
        });
    }
});

// Endpoint para colores predefinidos
app.post('/device/color/preset', async (req, res) => {
    try {
        const { color } = req.body;

        const presetColors = {
            red: { h: 0, s: 1000, v: 1000 },
            green: { h: 120, s: 1000, v: 1000 },
            blue: { h: 240, s: 1000, v: 1000 },
            yellow: { h: 60, s: 1000, v: 1000 },
            purple: { h: 300, s: 1000, v: 1000 },
            cyan: { h: 180, s: 1000, v: 1000 },
            orange: { h: 30, s: 1000, v: 1000 },
            pink: { h: 330, s: 700, v: 1000 },
            white: { h: 0, s: 0, v: 1000 }
        };

        if (!color || !presetColors[color.toLowerCase()]) {
            return res.status(400).json({
                success: false,
                message: `Color no válido. Colores disponibles: ${Object.keys(presetColors).join(', ')}`
            });
        }

        const colorData = presetColors[color.toLowerCase()];
        const result = await controlDevice(config.deviceId, 'colour_data_v2', colorData);

        res.json({
            success: true,
            message: `Color ${color} aplicado exitosamente`,
            data: result,
            color: colorData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error aplicando color predefinido',
            error: error.message
        });
    }
});


// Middleware para manejo de errores
app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
    });
});

// Inicializar servidor
async function startServer() {
    try {
        // Validar configuración antes de iniciar
        if (!validateConfig()) {
            process.exit(1);
        }

        console.log('✅ Configuración validada');
        console.log(`🌐 Host Tuya: ${config.host}`);

        // Obtener token inicial
        await getToken();
        console.log('✅ Token inicial obtenido');

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`📋 Endpoints disponibles:`);
            console.log(`  GET  / - Interfaz web`);
            console.log(`  GET  /health - Estado del servidor`);
            console.log(`  POST /device/on - Encender dispositivo`);
            console.log(`  POST /device/off - Apagar dispositivo`);
            console.log(`  POST /device/control - Control personalizado`);
            console.log(`  POST /device/color/hsv - Cambiar color HSV`);
            console.log(`  POST /device/color/preset - Colores predefinidos`);
            console.log(`  POST /device/brightness - Cambiar brillo`);
            console.log(`  POST /device/temperature - Temperatura de color`);
            console.log(`  POST /device/mode - Cambiar modo de trabajo`);
            console.log(`  GET  /device/info - Info del dispositivo`);
            console.log(`  GET  /device/:deviceId/info - Info de dispositivo específico`);
            console.log(`  POST /token/refresh - Renovar token`);
        });
    } catch (error) {
        console.error('❌ Error iniciando servidor:', error);
        process.exit(1);
    }
}

// Renovar token cada 2 horas
setInterval(async () => {
    try {
        await getToken();
        console.log('🔄 Token renovado automáticamente');
    } catch (error) {
        console.error('❌ Error renovando token automáticamente:', error);
    }
}, 2 * 60 * 60 * 1000); // 2 horas

startServer();