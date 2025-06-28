const API_URL = "https://round-aardvark-gadghast-f3174c45.koyeb.app/data"; // Usa aquí tu URL pública de backend

document.addEventListener("DOMContentLoaded", () => {
  fetch(API_URL)
    .then(response => {
      if (!response.ok) throw new Error("Respuesta no OK");
      return response.json();
    })
    .then(data => {
      updateTable(data);
    })
    .catch(error => {
      console.error("Error al cargar datos desde el backend:", error);
    });
});

function updateTable(equipos) {
  const tabla = document.getElementById("tabla-equipos");
  tabla.innerHTML = "";

  equipos.forEach(equipo => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${equipo.name}</td>
      <td>${equipo.value}</td>
    `;
    tabla.appendChild(fila);
  });
}
