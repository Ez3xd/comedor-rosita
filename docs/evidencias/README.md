# Evidencias de Fase 3

Prueba ejecutada el 25 de noviembre de 2026 en Docker Desktop.

- `fase3-cluster-activo.png`: tres nodos saludables y Nginx publicado en 8090.
- `fase3-balanceo-nginx.png`: seis respuestas HTTP 200, en orden nodo1, nodo2, nodo3, nodo1, nodo2, nodo3.
- `fase3-failover.png`: nodo2 detenido y seis respuestas HTTP 200 de nodo1 y nodo3.
- `fase3-recuperacion.txt`: nodo2 vuelve a recibir tráfico después de iniciarlo.

Las imágenes son capturas en navegador de las salidas reales guardadas en los archivos `.txt`, no capturas de una ventana de terminal. Los archivos `.html` permiten revisar esas mismas salidas. Si la rúbrica exige específicamente una ventana de terminal, usa los comandos del README para repetir la demostración y tomar esas capturas adicionales.

Se validaron además `npm run typecheck`, `npm run build`, `docker compose config --quiet`, `nginx -t`, el sitio y `/api/menu` (HTTP 200).

La red se cambió de la propuesta `172.21.0.0/24` a `172.30.21.0/24`, porque la red Docker `bloglocal_default` ya ocupa `172.21.0.0/16`. Los archivos Compose y Nginx usan las mismas direcciones. No se eliminaron redes ni contenedores de otros proyectos. En la evidencia de failover también aparecen dos contenedores detenidos de la fase anterior.

Al finalizar quedaron los tres nodos saludables y el balanceador en ejecución.
