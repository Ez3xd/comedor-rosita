const categoria = document.querySelector("#categoria");
const productos = document.querySelectorAll("#menu [data-categoria]");

function filtrarMenu() {
  for (const producto of productos) {
    producto.hidden =
      categoria.value !== "todas" && producto.dataset.categoria !== categoria.value;
  }
}

categoria.addEventListener("change", filtrarMenu);
filtrarMenu();
document.querySelector("#filtros").hidden = false;
