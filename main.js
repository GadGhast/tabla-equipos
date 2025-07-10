import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient('https://pcnrwrttjbwannedamki.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnJ3cnR0amJ3YW5uZWRhbWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NTkwODUsImV4cCI6MjA2NjQzNTA4NX0.j62o4rP8afaRiaMyfX-UTze5B8ftgRgpwrGLq4FEvcs');

const marcadorEl = document.getElementById('marcador');
const timerEl = document.getElementById('temporizador');
const partidoEl = document.getElementById('partido-directo');
const equipo1El = document.getElementById('equipo1');
const equipo2El = document.getElementById('equipo2');
const tablaClasificacion = document.querySelector('#tabla-clasificacion tbody');
const listaProximos = document.getElementById('proximos-partidos');
const listaHistorial = document.getElementById('historial-resultados');

let equipos = [];
let temporizador = null;
let marcador = null;

// Cargar equipos
async function cargarEquipos() {
  const { data } = await supabase.from('equipos').select('*');
  if (data) equipos = data;
}

// Generar 10 partidos si no existen
async function generarPartidosSiNoHay() {
  const { data } = await supabase.from('proximos_partidos').select('*').limit(1);
  if (!data || data.length === 0) {
    const ids = equipos.map(e => e.id);
    const combinaciones = [];

    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }

    for (let i = 0; i < Math.min(10 * 2, ids.length - 1); i += 2) {
      const equipo1_id = ids[i];
      const equipo2_id = ids[i + 1];
      combinaciones.push({ equipo1_id, equipo2_id });
    }

    await supabase.from('proximos_partidos').insert(combinaciones);
  }
}

// Mostrar clasificación
function renderClasificacion() {
  tablaClasificacion.innerHTML = '';
  const ordenados = [...equipos].sort((a, b) => b.puntos - a.puntos);
  for (const eq of ordenados) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img src="${eq.image_url}" /><span class="name">${eq.name}</span></td>
      <td>${eq.puntos}</td>
      <td>${eq.victorias}</td>
      <td>${eq.empates}</td>
      <td>${eq.derrotas}</td>
    `;
    tablaClasificacion.appendChild(tr);
  }
}

// Cargar y mostrar próximos partidos
async function renderProximosPartidos() {
  const { data } = await supabase.from('proximos_partidos').select('*').order('id');
  listaProximos.innerHTML = '';
  if (!data) return;
  for (const partido of data) {
    const e1 = equipos.find(e => e.id === partido.equipo1_id);
    const e2 = equipos.find(e => e.id === partido.equipo2_id);
    if (!e1 || !e2) continue;
    const li = document.createElement('li');
    li.innerHTML = `<img src="${e1.image_url}" alt="Equipo 1" /> vs <img src="${e2.image_url}" alt="Equipo 2" />`;
    listaProximos.appendChild(li);
  }
}

// Mostrar historial resultados
async function renderHistorial() {
  const { data } = await supabase.from('resultados').select('*').order('id', { ascending: false }).limit(10);
  listaHistorial.innerHTML = '';
  if (!data || data.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Sin resultados aún';
    li.classList.add('sin-resultados');
    listaHistorial.appendChild(li);
    return;
  }
  for (const r of data) {
    const e1 = equipos.find(e => e.id === r.equipo1_id);
    const e2 = equipos.find(e => e.id === r.equipo2_id);
    if (!e1 || !e2) continue;
    const li = document.createElement('li');
    li.innerHTML = `<img src="${e1.image_url}" alt="Equipo 1" /> ${r.marcador1} - ${r.marcador2} <img src="${e2.image_url}" alt="Equipo 2" />`;
    listaHistorial.appendChild(li);
  }
}

// Mostrar partido actual
function mostrarPartido() {
  if (!marcador?.equipo_local || !marcador?.equipo_visitante) {
    partidoEl.classList.add('sin-partido');
    return;
  }
  const e1 = equipos.find(e => e.id === marcador.equipo_local);
  const e2 = equipos.find(e => e.id === marcador.equipo_visitante);
  if (!e1 || !e2) {
    partidoEl.classList.add('sin-partido');
    return;
  }

  equipo1El.querySelector('img').src = e1.image_url;
  equipo1El.querySelector('span').textContent = e1.name;
  equipo2El.querySelector('img').src = e2.image_url;
  equipo2El.querySelector('span').textContent = e2.name;

  marcadorEl.textContent = `${marcador.marcador_local} : ${marcador.marcador_visitante}`;
  timerEl.textContent = formatTiempo(temporizador?.segundos_restantes ?? 0);

  partidoEl.classList.remove('sin-partido');
}

// Formatear tiempo
function formatTiempo(segundos) {
  const m = Math.floor(segundos / 60).toString().padStart(2, '0');
  const s = (segundos % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Cargar marcador y temporizador
async function cargarMarcadorYTemporizador() {
  const { data: marcadorData } = await supabase.from('marcador').select('*').limit(1);
  marcador = marcadorData?.[0] ?? null;

  const { data: tempData } = await supabase.from('temporizador').select('*').limit(1);
  temporizador = tempData?.[0] ?? null;
}

// Loop de actualización cada 1s
async function loop() {
  await cargarMarcadorYTemporizador();
  mostrarPartido();

  // Cambiar fondo si quedan 5 segundos o menos
  const segundos = temporizador?.segundos_restantes ?? 0;
  if (segundos <= 5) {
    partidoEl.classList.add('partido-finalizado');
  } else {
    partidoEl.classList.remove('partido-finalizado');
  }
}

async function init() {
  await cargarEquipos();
  await generarPartidosSiNoHay();
  await cargarMarcadorYTemporizador();

  mostrarPartido();
  renderClasificacion();
  renderProximosPartidos();
  renderHistorial();

  setInterval(loop, 1000);
}

init();
