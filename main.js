import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://pcnrwrttjbwannedamki.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnJ3cnR0amJ3YW5uZWRhbWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NTkwODUsImV4cCI6MjA2NjQzNTA4NX0.j62o4rP8afaRiaMyfX-UTze5B8ftgRgpwrGLq4FEvcs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1391386398539382856/A8EGXWhl2SdJHWW7pjz3VFMe1051s3-4B0l77A1M56fa90G3lmonCyQmh-xA8d2PLxMn';

let equipos = [];
let jornada = [];
let clasificacion = [];
let historialResultados = [];
let partidoActual = 0;

const DURACION_PARTIDO_SEG = 30; // 30 minutos por partido (ajusta si quieres)
let segundosRestantes = DURACION_PARTIDO_SEG;

let temporizadorInterval = null;
let actualizadorMarcadorTimeout = null;

async function cargarEquipos() {
  const { data, error } = await supabase
    .from('equipos')
    .select('id, name, image_url');

  if (error) {
    console.error('Error cargando equipos:', error);
    return [];
  }

  return data.map(e => ({
    id: e.id,
    nombre: e.name,
    imagen: e.image_url && e.image_url.trim() !== '' 
      ? e.image_url 
      : 'https://upload.wikimedia.org/wikipedia/commons/8/89/HD_transparent_picture.png'
  }));
}

function guardarEstadoLocal() {
  localStorage.setItem('jornada', JSON.stringify(jornada));
  localStorage.setItem('clasificacion', JSON.stringify(clasificacion));
  localStorage.setItem('historialResultados', JSON.stringify(historialResultados));
  localStorage.setItem('partidoActual', partidoActual);
  localStorage.setItem('segundosRestantes', segundosRestantes);
}

function cargarEstadoLocal() {
  const j = localStorage.getItem('jornada');
  jornada = j ? JSON.parse(j) : [];

  const c = localStorage.getItem('clasificacion');
  clasificacion = c ? JSON.parse(c) : equipos.map(e => ({
    id: e.id,
    puntos: 0,
    victorias: 0,
    empates: 0,
    derrotas: 0,
  }));

  const h = localStorage.getItem('historialResultados');
  historialResultados = h ? JSON.parse(h) : [];

  partidoActual = parseInt(localStorage.getItem('partidoActual')) || 0;
  segundosRestantes = parseInt(localStorage.getItem('segundosRestantes')) || DURACION_PARTIDO_SEG;
}

function generarNuevaJornada() {
  const usados = new Set();
  jornada = [];

  while (jornada.length < 10) {
    let equipo1, equipo2;

    do {
      equipo1 = equipos[Math.floor(Math.random() * equipos.length)];
      equipo2 = equipos[Math.floor(Math.random() * equipos.length)];
    } while (equipo1.id === equipo2.id || usados.has(equipo1.id) || usados.has(equipo2.id));

    usados.add(equipo1.id);
    usados.add(equipo2.id);

    jornada.push({
      equipo1,
      equipo2,
      marcador1: 0,
      marcador2: 0,
    });
  }

  partidoActual = 0;
  segundosRestantes = DURACION_PARTIDO_SEG;
  guardarEstadoLocal();
}

function animarNumeros(valor1, valor2) {
  const marcador = document.getElementById('marcador');
  marcador.innerHTML = `
    <span class="numero-animado">${valor1}</span> : <span class="numero-animado">${valor2}</span>
  `;
}

function actualizarPartidoEnDirecto() {
  const partido = jornada[partidoActual];
  if (!partido) {
    generarNuevaJornada();
    renderClasificacion();
    renderHistorial();
    renderProximosPartidos();
    actualizarPartidoEnDirecto();
    return;
  }

  const eq1 = partido.equipo1;
  const eq2 = partido.equipo2;

  document.getElementById('equipo1').innerHTML = `
    <img src="${eq1.imagen}" alt="${eq1.nombre}" style="width:40px; height:40px; object-fit:cover; border-radius:50%; vertical-align:middle; margin-right:8px;">
    <span>${eq1.nombre}</span>`;

  document.getElementById('equipo2').innerHTML = `
    <img src="${eq2.imagen}" alt="${eq2.nombre}" style="width:40px; height:40px; object-fit:cover; border-radius:50%; vertical-align:middle; margin-right:8px;">
    <span>${eq2.nombre}</span>`;

  animarNumeros(partido.marcador1, partido.marcador2);

  const minutos = Math.floor(segundosRestantes / 60);
  const segundos = segundosRestantes % 60;
  document.getElementById('temporizador').textContent = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
}

function renderClasificacion() {
  const tbody = document.getElementById('tabla-clasificacion').querySelector('tbody');
  tbody.innerHTML = '';

  const equiposOrdenados = [...clasificacion].sort((a, b) => b.puntos - a.puntos);

  for (const c of equiposOrdenados) {
    const eq = equipos.find(e => e.id === c.id) || {
      nombre: 'Desconocido',
      imagen: 'https://upload.wikimedia.org/wikipedia/commons/8/89/HD_transparent_picture.png'
    };
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <img src="${eq.imagen}" alt="${eq.nombre}" style="width:30px; height:30px; object-fit:cover; border-radius:50%; vertical-align:middle; margin-right:8px;">
        ${eq.nombre}
      </td>
      <td>${c.puntos}</td>
      <td>${c.victorias}</td>
      <td>${c.empates}</td>
      <td>${c.derrotas}</td>
    `;
    tbody.appendChild(tr);
  }
}

function renderProximosPartidos() {
  const lista = document.getElementById('proximos-partidos');
  lista.innerHTML = '';

  for (let i = partidoActual + 1; i < jornada.length; i++) {
    const p = jornada[i];
    lista.innerHTML += `
      <li style="display: flex; align-items: center; gap: 8px;">
        <img src="${p.equipo1.imagen}" alt="${p.equipo1.nombre}" style="width:30px; height:30px; object-fit:cover; border-radius:50%;">
        <span style="color: #00BFFF; font-weight: bold;">VS</span>
        <img src="${p.equipo2.imagen}" alt="${p.equipo2.nombre}" style="width:30px; height:30px; object-fit:cover; border-radius:50%;">
      </li>`;
  }
}

function renderHistorial() {
  const lista = document.getElementById('historial-resultados');
  lista.innerHTML = '';

  const ultimos = historialResultados.slice(-10).reverse();

  for (const res of ultimos) {
    const eq1 = equipos.find(e => e.id === res.equipo1.id) || {
      nombre: 'Desconocido',
      imagen: 'https://upload.wikimedia.org/wikipedia/commons/8/89/HD_transparent_picture.png'
    };
    const eq2 = equipos.find(e => e.id === res.equipo2.id) || {
      nombre: 'Desconocido',
      imagen: 'https://upload.wikimedia.org/wikipedia/commons/8/89/HD_transparent_picture.png'
    };

    lista.innerHTML += `
      <li>
        <img src="${eq1.imagen}" alt="${eq1.nombre}" style="width:30px; height:30px; object-fit:cover; border-radius:50%; vertical-align:middle;">
        ${res.marcador1} - ${res.marcador2}
        <img src="${eq2.imagen}" alt="${eq2.nombre}" style="width:30px; height:30px; object-fit:cover; border-radius:50%; vertical-align:middle;">
      </li>`;
  }
}

async function enviarResultadoDiscord(resultado) {
  const embed = {
    title: `${resultado.equipo1.nombre} vs ${resultado.equipo2.nombre}`,
    description: `Marcador final: 🏆 ${resultado.marcador1} - ${resultado.marcador2}`,
    thumbnail: {
      url: resultado.equipo1.imagen || 'https://upload.wikimedia.org/wikipedia/commons/8/89/HD_transparent_picture.png'
    },
    color: 5814783,
    footer: {
      text: 'Mundial FightWars'
    }
  };

  await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] })
  });
}

async function guardarResultadoSupabase(resultado) {
  const { data, error } = await supabase.from('resultados').insert([{
    equipo1_id: resultado.equipo1.id,
    equipo2_id: resultado.equipo2.id,
    marcador1: resultado.marcador1,
    marcador2: resultado.marcador2,
    fecha: new Date().toISOString()
  }]);

  if (error) {
    console.error('Error guardando resultado en Supabase:', error);
  }
}

async function terminarPartido() {
  const partido = jornada[partidoActual];
  if (!partido) return;

  // Actualiza clasificacion local
  const eq1Id = partido.equipo1.id;
  const eq2Id = partido.equipo2.id;
  const res = {
    equipo1: partido.equipo1,
    equipo2: partido.equipo2,
    marcador1: partido.marcador1,
    marcador2: partido.marcador2,
  };

  historialResultados.push(res);

  // Actualizar puntos
  const c1 = clasificacion.find(c => c.id === eq1Id);
  const c2 = clasificacion.find(c => c.id === eq2Id);

  if (!c1 || !c2) {
    console.warn('Equipos no encontrados en clasificación');
  } else {
    if (res.marcador1 > res.marcador2) {
      c1.victorias++;
      c1.puntos += 3;
      c2.derrotas++;
    } else if (res.marcador1 < res.marcador2) {
      c2.victorias++;
      c2.puntos += 3;
      c1.derrotas++;
    } else {
      c1.empates++;
      c1.puntos += 1;
      c2.empates++;
      c2.puntos += 1;
    }
  }

  // Guardar en Supabase
  await guardarResultadoSupabase(res);

  // Enviar a Discord
  await enviarResultadoDiscord(res);

  partidoActual++;
  segundosRestantes = DURACION_PARTIDO_SEG;

  guardarEstadoLocal();

  renderClasificacion();
  renderHistorial();
  renderProximosPartidos();
  actualizarPartidoEnDirecto();
}

function actualizarMarcador() {
  const partido = jornada[partidoActual];
  if (!partido) return;

  // Cambios aleatorios en los marcadores [-2, +3]
  partido.marcador1 += Math.floor(Math.random() * 6) - 2;
  partido.marcador2 += Math.floor(Math.random() * 6) - 2;

  if (partido.marcador1 < 0) partido.marcador1 = 0;
  if (partido.marcador2 < 0) partido.marcador2 = 0;

  guardarEstadoLocal();
  actualizarPartidoEnDirecto();

  if (segundosRestantes <= 0) {
    terminarPartido();
  } else {
    // Resta 1 segundo aunque el próximo tick sea aleatorio
    segundosRestantes--;

    // Nuevo timeout entre 2 y 6 segundos
    const intervalo = Math.floor(Math.random() * 5 + 2) * 1000;

    actualizadorMarcadorTimeout = setTimeout(actualizarMarcador, intervalo);
  }
}

function iniciarTemporizador() {
  if (temporizadorInterval) clearInterval(temporizadorInterval);

  temporizadorInterval = setInterval(() => {
    segundosRestantes--;
    if (segundosRestantes < 0) {
      terminarPartido();
    } else {
      actualizarPartidoEnDirecto();
    }
    guardarEstadoLocal();
  }, 1000);
}

async function sincronizarDatos() {
  const { data: histData, error: histError } = await supabase
    .from('resultados')
    .select('*')
    .order('fecha', { ascending: false })
    .limit(10);

  if (!histError && histData) {
    historialResultados = histData.map(r => {
      const eq1 = equipos.find(e => e.id === r.equipo1_id) || {
        id: r.equipo1_id,
        nombre: 'Desconocido',
        imagen: 'https://upload.wikimedia.org/wikipedia/commons/8/89/HD_transparent_picture.png'
      };
      const eq2 = equipos.find(e => e.id === r.equipo2_id) || {
        id: r.equipo2_id,
        nombre: 'Desconocido',
        imagen: 'https://upload.wikimedia.org/wikipedia/commons/8/89/HD_transparent_picture.png'
      };
      return {
        equipo1: eq1,
        equipo2: eq2,
        marcador1: r.marcador1,
        marcador2: r.marcador2,
        fecha: r.fecha,
      };
    });

    renderHistorial();
  }
}

async function iniciarApp() {
  equipos = await cargarEquipos();
  
  cargarEstadoLocal();

  if (jornada.length === 0) {
    generarNuevaJornada();
  }

  renderClasificacion();
  renderHistorial();
  renderProximosPartidos();
  actualizarPartidoEnDirecto();

  iniciarTemporizador();
  actualizarMarcador();

  // Cada 3 segundos sincronizamos con Supabase historial y clasificación
  setInterval(sincronizarDatos, 3000);
}

window.onload = iniciarApp;
