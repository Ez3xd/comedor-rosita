const menuGrid = document.querySelector("#menu-grid");
const menuSelect = document.querySelector("#plato");
const quantitySelect = document.querySelector("#cantidad");
const orderForm = document.querySelector("#order-form");
const formMessage = document.querySelector("#form-message");
const submitButton = orderForm.querySelector('button[type="submit"]');
const adminForm = document.querySelector("#admin-form");
const adminMessage = document.querySelector("#admin-message");
const ordersList = document.querySelector("#orders-list");

let menuItems = [];

const formatPrice = (price) =>
  new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(price);

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

function renderMenu(items) {
  menuItems = items;
  menuGrid.innerHTML = "";
  menuSelect.replaceChildren(new Option("Selecciona un plato", ""));

  for (const [index, item] of items.entries()) {
    const available = item.unidadesDisponibles > 0;
    const card = document.createElement("article");
    card.className = `dish-card${available ? "" : " unavailable"}`;
    card.innerHTML = `
      <div class="dish-art dish-art-${index + 1}" aria-hidden="true"><div class="mini-plate"></div></div>
      <div class="dish-info">
        <p class="dish-category">${escapeHtml(item.categoria)}</p>
        <h3>${escapeHtml(item.nombre)}</h3>
        <p class="dish-description">${escapeHtml(item.descripcion)}</p>
        <div class="dish-bottom">
          <span class="dish-price">${formatPrice(item.precio)}</span>
          <span class="dish-stock${available ? "" : " sold-out"}">${available ? `${item.unidadesDisponibles} porciones` : "Agotado"}</span>
        </div>
      </div>`;
    menuGrid.append(card);

    if (available) {
      menuSelect.add(new Option(`${item.nombre} — ${formatPrice(item.precio)}`, String(item.id)));
    }
  }

  menuSelect.disabled = menuSelect.options.length === 1;
  submitButton.disabled = menuSelect.disabled;
  submitButton.innerHTML = menuSelect.disabled
    ? "Menú no disponible"
    : 'Confirmar pre-pedido <span aria-hidden="true">→</span>';
}

async function loadMenu() {
  try {
    const response = await fetch("/api/menu");
    if (!response.ok) throw new Error("No pudimos consultar el menú. Intenta de nuevo en un momento.");
    const items = await response.json();
    if (!Array.isArray(items)) throw new Error("La respuesta del menú no tiene el formato esperado.");
    renderMenu(items);
    document.querySelector("#menu-date").textContent = new Intl.DateTimeFormat("es-SV", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date());
  } catch (error) {
    menuGrid.innerHTML = `<p class="menu-error">${escapeHtml(error.message)}</p>`;
    menuSelect.disabled = true;
    submitButton.disabled = true;
  }
}

menuSelect.addEventListener("change", () => {
  const selected = menuItems.find((item) => item.id === Number(menuSelect.value));
  const maxQuantity = selected ? Math.min(5, selected.unidadesDisponibles) : 1;
  quantitySelect.replaceChildren();
  for (let amount = 1; amount <= maxQuantity; amount += 1) {
    quantitySelect.add(new Option(`${amount} ${amount === 1 ? "porción" : "porciones"}`, String(amount)));
  }
});

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formMessage.className = "form-message";
  formMessage.textContent = "";
  submitButton.disabled = true;

  const data = new FormData(orderForm);
  const payload = {
    cliente: data.get("cliente"),
    telefono: data.get("telefono"),
    platoId: Number(data.get("platoId")),
    cantidad: Number(data.get("cantidad")),
    horaRetiro: data.get("horaRetiro"),
  };

  try {
    const response = await fetch("/api/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No pudimos registrar el pre-pedido.");
    formMessage.textContent = `${result.mensaje} Tu código es ${result.pedido.id}.`;
    orderForm.reset();
    await loadMenu();
  } catch (error) {
    formMessage.classList.add("error");
    formMessage.textContent = error.message;
  } finally {
    submitButton.disabled = menuSelect.disabled;
  }
});

adminForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  adminMessage.className = "admin-message";
  adminMessage.textContent = "";
  ordersList.replaceChildren();

  try {
    const token = document.querySelector("#admin-token").value;
    const response = await fetch("/api/pedidos", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No se pudieron consultar los pedidos.");

    adminMessage.textContent = result.pedidos.length
      ? `${result.pedidos.length} pedido(s) pendiente(s).`
      : "Todavía no hay pedidos registrados.";
    for (const order of result.pedidos) {
      const row = document.createElement("div");
      row.className = "order-row";
      row.innerHTML = `<span><strong>${escapeHtml(order.id)}</strong> · ${escapeHtml(order.cliente)} — ${escapeHtml(order.plato)} × ${order.cantidad}</span><span>${escapeHtml(order.horaRetiro)} · ${escapeHtml(order.telefono)}</span>`;
      ordersList.append(row);
    }
  } catch (error) {
    adminMessage.classList.add("error");
    adminMessage.textContent = error.message;
  }
});

loadMenu();
