# Comedor Rosita

Proyecto de cátedra, **Fase 2**. El sitio muestra el menú del día y permite reservar platos para recogerlos en el comedor.

## Qué se actualizó

- El menú muestra precios y existencias. El formulario permite elegir un plato, la cantidad y la hora de retiro.
- La API en Express y TypeScript valida el pedido, descuenta las unidades reservadas y permite consultar los pedidos pendientes con un token de administrador.
- Docker Compose inicia el sitio en Apache y la API en Express en dos contenedores. Cada compañero puede ejecutarlos en su computadora.
- La configuración de Apache para HTTPS sigue disponible para la entrega. Guarda las capturas en `docs/evidencias/`.

## Abrir el proyecto con Docker

Instala Git y abre Docker Desktop. En PowerShell:

```powershell
git clone https://github.com/Ez3xd/comedor-rosita.git
cd comedor-rosita
Copy-Item .env.example .env
notepad .env
```

En `.env`, reemplaza `ADMIN_TOKEN` por un valor privado, guarda el archivo y ejecuta:

```powershell
docker compose up --build -d
```

Abre [Comedor Rosita](http://localhost:8080). Haz un prepedido y usa el mismo token en el panel de cocina para comprobar que aparece. Cada equipo tiene su propio inventario y sus propios pedidos de prueba. Los datos se reinician al reiniciar la API.

Si ya clonaste el proyecto, ejecuta `git pull` y sigue los pasos desde la copia de `.env.example`. Si ya tienes un `.env`, conserva tu token.

Para ver el estado de los contenedores, consultar sus registros o detenerlos:

```powershell
docker compose ps
docker compose logs
docker compose down
```

## Ejecutar sin Docker (desarrollo)

Con Node.js 20 o superior, ejecuta estos comandos desde la carpeta del proyecto:

```powershell
npm ci
$env:ADMIN_TOKEN = "elige-un-token-local"
npm run dev
```

Deja esa terminal abierta y visita **http://127.0.0.1:4000** en el navegador. Desde ahí podrás consultar el menú y probar un pre-pedido. El panel de cocina usa el token que configuraste en `ADMIN_TOKEN`. La página y la API se sirven juntas en el puerto `4000`.

Para detener el servidor, vuelve a la terminal y presiona `Ctrl+C`.

Para probar la configuración HTTPS de la entrega, sigue los pasos de Ubuntu.

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

Ejecuta estos pasos desde la raíz del proyecto en Ubuntu. En una terminal de esa misma distribución, inicia el backend con `npm ci`, `export ADMIN_TOKEN='elige-un-token-local'` y `npm run dev`. Deja esa terminal abierta para que Apache pueda acceder a la API en `127.0.0.1:4000`.

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

6. Abre `https://rosita.local` y verifica la API en `https://rosita.local/api/menu`. Para probar el proxy y el backend desde WSL:

   ```bash
   curl -i https://rosita.local/api/menu
   curl -i https://rosita.local/health
   curl -i http://127.0.0.1:4000/health
   ```

Apache redirige HTTP a HTTPS. Para probar sin Apache, consulta `http://127.0.0.1:4000/api/menu`.

## Comprobaciones

1. Abre [el sitio en Docker](http://localhost:8080) o [el sitio con HTTPS](https://rosita.local) y confirma que el menú muestra los platos y sus existencias.
2. Haz un pedido de prueba con una unidad de un plato disponible. Comprueba que se confirma y que el plato queda con una unidad menos.
3. Ingresa el token configurado en el panel de administración y comprueba que aparece el pedido.

```powershell
npm run typecheck
npm run build
```

Prueba el listado administrativo enviando el token configurado:

```powershell
curl.exe -H "Authorization: Bearer TU_TOKEN" http://localhost:8080/api/pedidos
```

## Evidencias de la entrega

Agrega capturas reales a `docs/evidencias/` después de configurar Apache y mkcert: sitio servido por Apache, menú a través de `/api/menu` y navegador mostrando HTTPS sin advertencias. Las capturas dependen del entorno local y no se incluyen como evidencia simulada.
