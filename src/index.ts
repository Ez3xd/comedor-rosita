import { timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import express, { type ErrorRequestHandler, type Request, type Response } from "express";

type MenuItem = {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  unidadesDisponibles: number;
};

type Pedido = {
  id: string;
  cliente: string;
  telefono: string;
  plato: string;
  cantidad: number;
  horaRetiro: string;
  estado: "Pendiente";
  creadoEn: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const menu: MenuItem[] = [
  {
    id: 1,
    nombre: "Pollo guisado",
    descripcion: "Receta de casa, arroz, ensalada fresca y tortillas.",
    precio: 4.5,
    categoria: "Favorito de la casa",
    unidadesDisponibles: 14,
  },
  {
    id: 2,
    nombre: "Carne asada",
    descripcion: "Carne a la parrilla, casamiento, chimol y tortillas.",
    precio: 5.25,
    categoria: "A la parrilla",
    unidadesDisponibles: 10,
  },
  {
    id: 3,
    nombre: "Sopa de gallina india",
    descripcion: "Caldo tradicional con verduras, arroz y tortillas.",
    precio: 5.5,
    categoria: "Tradición salvadoreña",
    unidadesDisponibles: 8,
  },
];

const horariosRetiro = new Set(["11:30", "12:00", "12:30", "13:00", "13:30"]);
const pedidos: Pedido[] = [];
const app = express();
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "127.0.0.1";
const adminToken = process.env.ADMIN_TOKEN;

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT debe ser un número entero entre 1 y 65535.");
}

if (!adminToken) {
  console.warn("ADMIN_TOKEN no está configurado; GET /api/pedidos responderá 503.");
}

app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));

app.get("/api/menu", (_req: Request, res: Response) => {
  res.json(
    menu.map((item) => ({
      ...item,
      disponible: item.unidadesDisponibles > 0,
    })),
  );
});

app.post("/api/pedidos", (req: Request, res: Response) => {
  const body: unknown = req.body;
  if (!isRecord(body)) {
    res.status(400).json({ error: "El cuerpo de la solicitud debe ser un objeto JSON." });
    return;
  }

  const { cliente, telefono, platoId, cantidad, horaRetiro } = body;

  if (
    typeof cliente !== "string" ||
    cliente.trim().length < 2 ||
    cliente.trim().length > 80 ||
    typeof telefono !== "string" ||
    !/^\d{4}-?\d{4}$/.test(telefono.trim()) ||
    typeof platoId !== "number" ||
    !Number.isInteger(platoId) ||
    typeof cantidad !== "number" ||
    !Number.isInteger(cantidad) ||
    typeof horaRetiro !== "string" ||
    !horariosRetiro.has(horaRetiro)
  ) {
    res.status(400).json({
      error: "Revisa el nombre, teléfono, plato, cantidad y horario del pedido.",
    });
    return;
  }

  const item = menu.find((menuItem) => menuItem.id === platoId);
  if (!item) {
    res.status(404).json({ error: "El plato seleccionado no existe en el menú." });
    return;
  }

  if (cantidad < 1 || cantidad > 5) {
    res.status(400).json({ error: "La cantidad debe estar entre 1 y 5 platos." });
    return;
  }

  if (item.unidadesDisponibles < cantidad) {
    res.status(409).json({
      error: "No hay suficientes porciones disponibles para esa cantidad.",
    });
    return;
  }

  item.unidadesDisponibles -= cantidad;
  const pedido: Pedido = {
    id: `ROS-${String(pedidos.length + 1).padStart(4, "0")}`,
    cliente: cliente.trim(),
    telefono: telefono.trim(),
    plato: item.nombre,
    cantidad,
    horaRetiro,
    estado: "Pendiente",
    creadoEn: new Date().toISOString(),
  };
  pedidos.push(pedido);

  res.status(201).json({
    mensaje: "Tu pre-pedido quedó registrado.",
    pedido: {
      id: pedido.id,
      plato: pedido.plato,
      cantidad: pedido.cantidad,
      horaRetiro: pedido.horaRetiro,
      estado: pedido.estado,
    },
  });
});

app.get("/api/pedidos", (req: Request, res: Response) => {
  if (!adminToken) {
    res.status(503).json({ error: "El acceso administrativo no está configurado." });
    return;
  }

  const authorization = req.header("authorization") ?? "";
  const providedToken = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const expected = Buffer.from(adminToken);
  const provided = Buffer.from(providedToken);

  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    res.status(401).json({ error: "Se requiere un token administrativo válido." });
    return;
  }

  res.json({ pedidos: [...pedidos].reverse() });
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    estado: "saludable",
    servicio: "comedor-rosita-api",
    fecha: new Date().toISOString(),
  });
});

app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "La ruta solicitada no existe." });
});

app.use(express.static(fileURLToPath(new URL("../public/", import.meta.url))));

const handleErrors: ErrorRequestHandler = (error, _req, res, _next) => {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = error.status;
    if (status === 400 || status === 413) {
      res.status(status).json({
        error: status === 413 ? "El contenido enviado es demasiado grande." : "El JSON enviado no es válido.",
      });
      return;
    }
  }

  console.error("Error inesperado en la API:", error);
  res.status(500).json({ error: "Ocurrió un error interno al procesar la solicitud." });
};

app.use(handleErrors);

app.listen(port, host, () => {
  console.log(`API de Comedor Rosita disponible en http://${host}:${port}`);
});
