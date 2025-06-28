// ✅ Reemplaza con los datos reales de tu proyecto Supabase:
const SUPABASE_URL = 'https://pcnrwrttjbwannedamki.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnJ3cnR0amJ3YW5uZWRhbWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NTkwODUsImV4cCI6MjA2NjQzNTA4NX0.j62o4rP8afaRiaMyfX-UTze5B8ftgRgpwrGLq4FEvcs';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchEquipos() {
  try {
    const { data: equipos, error } = await client
      .from('equipos')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error al obtener datos de Supabase:', error);
      return;
    }

    actualizarTabla(equipos);
  } catch (error) {
    console.error('Error inesperado:', error);
  }
}

function actualizarTabla(equipos) {
  const tbody = document.getElementById('tabla-equipos-body');
  tbody.innerHTML = '';

  // Crear un formateador para números con separadores de miles
  const formateador = new Intl.NumberFormat('es-ES');

  // Ordenar equipos por puntuación de mayor a menor
  const equiposOrdenados = [...equipos].sort((a, b) => b.value - a.value);

  equiposOrdenados.forEach((equipo, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}</td> <!-- Posición calculada tras ordenar -->
      <td>${equipo.name}</td>
      <td>${formateador.format(equipo.value)}</td> <!-- Formatear valor -->
    `;
    tbody.appendChild(tr);
  });
}

// 🔁 Refrescar cada segundo
setInterval(fetchEquipos, 1000);
fetchEquipos();
