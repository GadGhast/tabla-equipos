async function fetchEquipos() {
  try {
    const response = await fetch('/data');
    const equipos = await response.json();
    actualizarTabla(equipos);
  } catch (error) {
    console.error('Error al obtener datos:', error);
  }
}

function actualizarTabla(equipos) {
  const tbody = document.getElementById('tabla-equipos-body');
  tbody.innerHTML = '';

  equipos.forEach(equipo => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${equipo.id}</td>
      <td>${equipo.name}</td>
      <td>${equipo.value}</td>
    `;
    tbody.appendChild(tr);
  });
}

setInterval(fetchEquipos, 1000); // refresco cada 1s

fetchEquipos();
