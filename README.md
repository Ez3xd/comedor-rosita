# Comedor Rosita

Proyecto de cátedra, **Fase 2**. El sitio muestra el menú del día y permite reservar platos para recogerlos en el comedor.

## Qué se actualizó

- El menú muestra precios y existencias. El formulario permite elegir un plato, la cantidad y la hora de retiro.
- La API en Express y TypeScript valida el pedido, descuenta las unidades reservadas y permite consultar los pedidos pendientes con un token de administrador.
- La configuración de Apache sirve el sitio por HTTPS y conecta el navegador con la API. La carpeta `docs/evidencias/` queda disponible para las capturas de la entrega.

## Arquitectura

```mermaid
flowchart LR
    C[Cliente / navegador] -->|HTTPS :443| A[Apache]
    A -->|Archivos estáticos| W[public/]
    A -->|ProxyPass /api y /health| E[Express + TypeScript :4000]
    E --> M[Menú y pedidos en memoria]
```

Los pedidos y el inventario se guardan en memoria en esta fase: se reinician al detener el backend y no se comparten entre procesos. La integración con una base de datos, Docker, varios nodos y Nginx queda para fases posteriores.

La aplicación de esta fase está en `public/`; el `index.html`, `menu.js` y `estilos.css` de la raíz se conservan como prototipo anterior. La configuración de Apache incluida sirve `public/`.

## Requisitos

- Node.js 20 o superior y npm.
- Apache 2 con `mod_ssl`, `mod_proxy` y `mod_proxy_http`.
- WSL2/Ubuntu es una opción recomendada para Apache y mkcert. El backend y Apache deben poder comunicarse por `127.0.0.1:4000`.

## Ejecutar el backend

Clona el repositorio y entra a la carpeta del proyecto. Estos comandos funcionan en PowerShell:

```powershell
git clone https://github.com/Ez3xd/comedor-rosita.git
cd comedor-rosita
npm ci
$env:ADMIN_TOKEN = "cambia-esto-por-un-token-local"
npm run dev
```

Deja esa terminal abierta. Visita [el estado del servidor](http://127.0.0.1:4000/health) y [el menú de la API](http://127.0.0.1:4000/api/menu) para comprobar que arrancó. Para abrir la interfaz, sigue los pasos de Apache y HTTPS.

Para compilar y ejecutar la versión generada:

```powershell
npm run build
npm start
```

En Bash/WSL, configura el token con `export ADMIN_TOKEN='cambia-esto-por-un-token-local'` antes de iniciar el servidor. El token protege `GET /api/pedidos`; no lo compartas ni lo subas al repositorio.

`.env.example` sirve como referencia de las variables; el proyecto no carga archivos `.env` automáticamente.

El backend escucha únicamente en `127.0.0.1:4000`. Si `ADMIN_TOKEN` no está configurado, el menú y los pre-pedidos funcionan, pero la consulta administrativa responde `503`.

## API

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/menu` | Menú con precios, disponibilidad e inventario actual. |
| `POST` | `/api/pedidos` | Registra un pre-pedido y reserva las unidades disponibles. |
| `GET` | `/api/pedidos` | Lista los pedidos pendientes. Requiere `Authorization: Bearer <ADMIN_TOKEN>`. |
| `GET` | `/health` | Estado básico del backend. |

Ejemplo de pre-pedido:

```json
{
  "cliente": "Ana López",
  "telefono": "7777-1234",
  "platoId": 1,
  "cantidad": 1,
  "horaRetiro": "12:00"
}
```

El servidor valida los campos, el horario permitido y las existencias antes de aceptar cada pedido. El inventario se descuenta solo cuando el pedido queda registrado.

## Apache y HTTPS en WSL2/Ubuntu

Ejecuta estos pasos desde la raíz del proyecto en Ubuntu. Si usas WSL2, inicia también el backend en esa misma distribución y deja su terminal abierta.

1. Instala Apache y mkcert si aún no están disponibles. Habilita los módulos necesarios:

   ```bash
   sudo apt update
   sudo apt install apache2 libnss3-tools
   sudo a2enmod ssl proxy proxy_http
   ```

   Instala `mkcert` siguiendo su [guía oficial](https://github.com/FiloSottile/mkcert#installation).

2. Copia el contenido de `public/` a `/var/www/rosita.local/` y asigna los permisos de lectura a Apache:

   ```bash
   sudo mkdir -p /var/www/rosita.local
   sudo cp -r public/. /var/www/rosita.local/
   sudo chown -R www-data:www-data /var/www/rosita.local
   ```

3. Genera un certificado local de confianza. Instala la CA de mkcert en el almacén de confianza del sistema/navegador y guarda la llave privada fuera del repositorio:

   ```bash
   mkcert -install
   mkdir -p "$HOME/.local/share/rosita-certs"
   (cd "$HOME/.local/share/rosita-certs" && mkcert rosita.local)
   sudo mkdir -p /etc/apache2/ssl/rosita.local
   sudo install -m 644 "$HOME/.local/share/rosita-certs/rosita.local.pem" /etc/apache2/ssl/rosita.local/rosita.local.pem
   sudo install -m 600 "$HOME/.local/share/rosita-certs/rosita.local-key.pem" /etc/apache2/ssl/rosita.local/rosita.local-key.pem
   ```

   Si el navegador está en Windows y Apache en WSL, asegúrate también de que el certificado raíz de mkcert sea de confianza en Windows. No copies ni publiques la llave privada.

4. Copia las configuraciones incluidas, activa los sitios y valida Apache:

   ```bash
   sudo cp infra/apache/rosita.local.conf /etc/apache2/sites-available/
   sudo cp infra/apache/rosita.local-ssl.conf /etc/apache2/sites-available/
   sudo a2ensite rosita.local.conf rosita.local-ssl.conf
   sudo apache2ctl configtest
   sudo systemctl reload apache2
   ```

5. Añade `127.0.0.1 rosita.local` al archivo `hosts` del sistema donde se abre el navegador. En Windows está en `C:\Windows\System32\drivers\etc\hosts`. En WSL, confirma que Apache esté accesible desde Windows por `localhost`; si la red de WSL está configurada de otra forma, usa la dirección que corresponda en `hosts`.

6. Inicia el backend, abre `https://rosita.local` y verifica la API en `https://rosita.local/api/menu`. Para probar el proxy desde WSL:

   ```bash
   curl -i https://rosita.local/api/menu
   curl -i https://rosita.local/health
   ```

Apache redirige HTTP a HTTPS. Para probar sin Apache, consulta `http://127.0.0.1:4000/api/menu`.

## Comprobaciones

1. Abre [el sitio local](https://rosita.local) y confirma que el menú muestra los platos y sus existencias.
2. Haz un pedido de prueba con una unidad de un plato disponible. Comprueba que se confirma y que el plato queda con una unidad menos.
3. Ingresa el token configurado en el panel de administración y comprueba que aparece el pedido.

```powershell
npm run typecheck
npm run build
```

Prueba el listado administrativo enviando el token configurado:

```powershell
curl.exe -H "Authorization: Bearer cambia-esto-por-un-token-local" http://127.0.0.1:4000/api/pedidos
```

## Evidencias de la entrega

Agrega capturas reales a `docs/evidencias/` después de configurar Apache y mkcert: sitio servido por Apache, menú a través de `/api/menu` y navegador mostrando HTTPS sin advertencias. Las capturas dependen del entorno local y no se incluyen como evidencia simulada.
