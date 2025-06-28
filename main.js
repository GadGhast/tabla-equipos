// public/main.js
async function obtenerDatos() {
  try {
    const respuesta = await fetch('/data');
    const equipos = await respuesta.json();

    const tbody = document.querySelector('#tabla-equipos tbody');
    tbody.innerHTML = '';

    equipos.forEach(equipo => {
      const fila = document.createElement('tr');
      fila.innerHTML = `<td>${equipo.name}</td><td>${equipo.value}</td>`;
      tbody.appendChild(fila);
    });
  } catch (error) {
    console.error('Error al obtener datos:', error);
  }
}

// Actualizar cada segundo
setInterval(obtenerDatos, 1000);
obtenerDatos();
