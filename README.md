# 🏠 Tuya Control Panel

Panel de control web para dispositivos Tuya Smart usando la API oficial de Tuya Cloud.

## ✨ Características

- 🌐 Interfaz web moderna y responsiva
- 🔧 Control básico de dispositivos (encender/apagar)
- ⚡ Control personalizado con comandos y valores específicos
- 📊 Información detallada del dispositivo
- 🔄 Renovación automática de tokens
- 📱 Diseño adaptable para móviles
- 🔒 Configuración segura con variables de entorno

## 🚀 Instalación

### Prerrequisitos

- Node.js (versión 14 o superior)
- npm o yarn
- Cuenta en [Tuya IoT Platform](https://iot.tuya.com/)

### Pasos de instalación

1. **Clona el repositorio:**
   ```bash
   git clone <tu-repositorio>
   cd tuya-control-panel
   ```

2. **Instala las dependencias:**
   ```bash
   npm install
   ```

3. **Configura las variables de entorno:**
   ```bash
   cp .env.example .env
   ```

   Edita el archivo `.env` con tus credenciales:
   ```bash
   TUYA_ACCESS_KEY=tu_access_key_aqui
   TUYA_SECRET_KEY=tu_secret_key_aqui
   TUYA_DEVICE_ID=tu_device_id_aqui
   ```

4. **Inicia el servidor:**
   ```bash
   npm start
   ```

5. **Abre tu navegador:**
   ```
   http://localhost:3000
   ```

## 🔑 Configuración de Tuya IoT Platform

### Paso 1: Crear un proyecto
1. Ve a [Tuya IoT Platform](https://iot.tuya.com/)
2. Inicia sesión o crea una cuenta
3. Crea un nuevo proyecto en "Cloud" → "Development"

### Paso 2: Obtener credenciales
1. En tu proyecto, ve a "Overview"
2. Copia el **Access ID** (TUYA_ACCESS_KEY)
3. Copia el **Access Secret** (TUYA_SECRET_KEY)

### Paso 3: Vincular dispositivo
1. Ve a "Devices" → "Link Tuya App Account"
2. Escanea el código QR con la app Tuya Smart
3. Copia el **Device ID** de tu dispositivo

### Paso 4: Configurar APIs
1. Ve a "Service API" → "Go to Authorize"
2. Suscríbete a las APIs necesarias:
    - **IoT Core** (gratuita)
    - **Authorization management** (gratuita)

## 📖 Uso

### Interfaz Web

La interfaz incluye las siguientes funciones:

- **🔧 Verificar Estado**: Comprueba la conexión con la API de Tuya
- **💡 Encender Dispositivo**: Activa el dispositivo principal
- **🌙 Apagar Dispositivo**: Desactiva el dispositivo principal
- **📊 Obtener Información**: Muestra el estado actual del dispositivo
- **🔄 Renovar Token**: Actualiza manualmente el token de acceso
- **⚡ Control Personalizado**: Envía comandos específicos al dispositivo

### API Endpoints

#### GET /health
Verifica el estado del servidor y la configuración.

#### POST /device/on
Enciende el dispositivo principal.

#### POST /device/off
Apaga el dispositivo principal.

#### GET /device/info
Obtiene información del dispositivo principal.

#### POST /device/control
Envía comandos personalizados al dispositivo.

**Body:**
```json
{
  "command": "switch_led",
  "value": true,
  "deviceId": "opcional_device_id"
}
```

#### POST /token/refresh
Renueva manualmente el token de acceso.

## 🔧 Comandos Comunes

### Para dispositivos de iluminación:
```javascript
// Encender/apagar
{ "command": "switch_led", "value": true }
{ "command": "switch_led", "value": false }

// Cambiar brillo (0-1000)
{ "command": "bright_value", "value": 500 }

// Cambiar color (HSV)
{ "command": "colour_data", "value": {"h": 120, "s": 100, "v": 100} }
```

### Para dispositivos de clima:
```javascript
// Cambiar temperatura
{ "command": "temp_set", "value": 24 }

// Cambiar modo
{ "command": "mode", "value": "cold" }
```

## 🛠️ Desarrollo

### Estructura del proyecto
```
├── public/
│   └── index.html          # Interfaz web
├── servidor-tuya-express.js # Servidor principal
├── .env                    # Variables de entorno
├── .gitignore             # Archivos ignorados por Git
├── package.json           # Dependencias y scripts
└── README.md              # Este archivo
```

### Scripts disponibles
```bash
npm start          # Iniciar servidor
npm run dev        # Modo desarrollo con nodemon
npm test           # Ejecutar tests
```

## 🔒 Seguridad

- ✅ Las credenciales se almacenan en variables de entorno
- ✅ El archivo `.env` está excluido del control de versiones
- ✅ Los tokens se renuevan automáticamente cada 2 horas
- ✅ Validación de configuración al iniciar el servidor

## 🐛 Solución de problemas

### Error: "Variables de entorno faltantes"
Asegúrate de que el archivo `.env` existe y contiene todas las variables requeridas.

### Error: "Token inválido"
1. Verifica que tus credenciales sean correctas
2. Asegúrate de que las APIs estén habilitadas en Tuya IoT Platform
3. Usa el botón "Renovar Token" en la interfaz

### Error: "Dispositivo no encontrado"
1. Verifica que el Device ID sea correcto
2. Asegúrate de que el dispositivo esté vinculado a tu cuenta de Tuya
3. Comprueba que el dispositivo esté online

### Error de conexión
1. Verifica tu conexión a internet
2. Comprueba que el host de Tuya sea correcto para tu región
3. Revisa si hay restricciones de firewall

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📞 Soporte

Si tienes problemas o preguntas:

1. Revisa la [documentación oficial de Tuya](https://developer.tuya.com/)
2. Crea un issue en este repositorio
3. Consulta la [comunidad de desarrolladores de Tuya](https://www.tuyaos.com/)

---

**⚠️ Nota importante:** Este proyecto es solo para propósitos educativos y de desarrollo. Asegúrate de cumplir con los términos de servicio de Tuya al usar la API.