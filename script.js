const tabla = document.getElementById("tabla");
const urlDatos = "/data"; // ruta backend para obtener y guardar datos

let equipos = [];

// Función para obtener datos desde el backend
async function cargarDatos() {
  try {
    const res = await fetch(urlDatos);
    equipos = await res.json();
    mostrarEquipos();
  } catch (error) {
    console.error("Error al cargar datos:", error);
  }
}

// Función para mostrar datos en la tabla
function mostrarEquipos() {
  tabla.innerHTML = `
    <tr>
      <th>ID</th>
      <th>Nombre</th>
      <th>Puntos</th>
    </tr>
  `;
  equipos.forEach(({ id, name, value }) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${id}</td>
      <td>${name}</td>
      <td>${value}</td>
    `;
    tabla.appendChild(fila);
  });
}

// Función para guardar datos al backend
async function guardarDatos() {
  try {
    await fetch(urlDatos, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(equipos),
    });
  } catch (error) {
    console.error("Error al guardar datos:", error);
  }
}

// Función para simular actualización de puntos cada segundo
function actualizarPuntos() {
  equipos.forEach((equipo) => {
    equipo.value += Math.floor(Math.random() * 10) - 5;
    if (equipo.value < 0) equipo.value = 0;
  });
  mostrarEquipos();
  guardarDatos();
}

// Cargar datos al iniciar
cargarDatos();

// Actualizar puntos cada segundo
setInterval(actualizarPuntos, 1000);
