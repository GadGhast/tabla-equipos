import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient('https://pcnrwrttjbwannedamki.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnJ3cnR0amJ3YW5uZWRhbWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NTkwODUsImV4cCI6MjA2NjQzNTA4NX0.j62o4rP8afaRiaMyfX-UTze5B8ftgRgpwrGLq4FEvcs'); // ← Reemplaza esto

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
let actualizandoMarcador = false;

// Cargar equipos
async function cargarEquipos() {
  const { data } = await supabase.from('equipos').select('*');
  if (data) equipos = data;
}

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

// Cargar próximos partidos
async function cargarProximosPartidos() {
  const { data } = await supabase.from('proximos_partidos').select('*').order('id');
  if (data.length === 0) {
    const ids = [...equipos.map(e => e.id)];
    const combinaciones = [];

    // Mezclar aleatoriamente el array de ids
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }

    // Tomar pares consecutivos para formar partidos
    for (let i = 0; i < Math.min(10*2, ids.length - 1); i += 2) {
      const equipo1_id = ids[i];
      const equipo2_id = ids[i+1];
      combinaciones.push({ equipo1_id, equipo2_id });
    }

    await supabase.from('proximos_partidos').insert(combinaciones);
    return combinaciones;
  }
  return data;
}



async function renderProximosPartidos() {
  const data = await cargarProximosPartidos();
  listaProximos.innerHTML = '';
  for (const partido of data) {
    const e1 = equipos.find(e => e.id === partido.equipo1_id);
    const e2 = equipos.find(e => e.id === partido.equipo2_id);
    if (!e1 || !e2) continue;
    const li = document.createElement('li');
    li.innerHTML = `<img src="${e1.image_url}" alt="Equipo 1" /> vs <img src="${e2.image_url}" alt="Equipo 2" />`;
    listaProximos.appendChild(li);
  }
}

async function renderHistorial() {
  const { data } = await supabase.from('resultados').select('*').order('id', { ascending: false }).limit(10);
  listaHistorial.innerHTML = '';
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
  timerEl.textContent = formatTiempo(temporizador.segundos_restantes);

  partidoEl.classList.remove('sin-partido');
}

// Formato del temporizador
function formatTiempo(segundos) {
  const m = Math.floor(segundos / 60).toString().padStart(2, '0');
  const s = (segundos % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Disminuir temporizador
async function tickTemporizador() {
  if (!temporizador || temporizador.segundos_restantes <= 0) return;
  temporizador.segundos_restantes--;
  timerEl.textContent = formatTiempo(temporizador.segundos_restantes);
  await supabase.from('temporizador').update({ segundos_restantes: temporizador.segundos_restantes }).eq('id', temporizador.id);
}

// Actualizar marcador aleatorio
async function actualizarMarcador() {
  if (actualizandoMarcador || !marcador?.id) return;
  actualizandoMarcador = true;
  const delay = Math.floor(Math.random() * 4000) + 2000;

  setTimeout(async () => {
    const deltaL = Math.floor(Math.random() * 6) - 2;
    const deltaV = Math.floor(Math.random() * 6) - 2;

    marcador.marcador_local += deltaL;
	marcador.marcador_visitante += deltaV;
    marcadorEl.textContent = `${marcador.marcador_local} : ${marcador.marcador_visitante}`;

    await supabase.from('marcador').update({
      marcador_local: marcador.marcador_local,
      marcador_visitante: marcador.marcador_visitante
    }).eq('id', marcador.id);

    actualizandoMarcador = false;
    actualizarMarcador();
  }, delay);
}

// Iniciar nuevo partido
async function iniciarNuevoPartido() {
  const { data: lista } = await supabase.from('proximos_partidos').select('*').order('id');
  const siguiente = lista?.[0];
  if (!siguiente) {
    await supabase.from('marcador').update({ equipo_local: null, equipo_visitante: null }).eq('id', marcador.id);
    partidoEl.classList.add('sin-partido');
    return;
  }

  marcador.equipo_local = siguiente.equipo1_id;
  marcador.equipo_visitante = siguiente.equipo2_id;
  marcador.marcador_local = 0;
  marcador.marcador_visitante = 0;
  await supabase.from('marcador').update(marcador).eq('id', marcador.id);
  await supabase.from('temporizador').update({ segundos_restantes: 1800 }).eq('id', temporizador.id);
  await supabase.from('proximos_partidos').delete().eq('id', siguiente.id);
}

// Finalizar partido y actualizar clasificación
async function finalizarPartido() {
  const e1 = equipos.find(e => e.id === marcador.equipo_local);
  const e2 = equipos.find(e => e.id === marcador.equipo_visitante);
  if (!e1 || !e2) return;

  await supabase.from('resultados').insert({
    equipo1_id: e1.id,
    equipo2_id: e2.id,
    marcador1: marcador.marcador_local,
    marcador2: marcador.marcador_visitante
  });

  if (marcador.marcador_local > marcador.marcador_visitante) {
    e1.victorias++; e1.puntos += 3;
    e2.derrotas++;
  } else if (marcador.marcador_local < marcador.marcador_visitante) {
    e2.victorias++; e2.puntos += 3;
    e1.derrotas++;
  } else {
    e1.empates++; e2.empates++;
    e1.puntos++; e2.puntos++;
  }

  await supabase.from('equipos').update(e1).eq('id', e1.id);
  await supabase.from('equipos').update(e2).eq('id', e2.id);

  await renderHistorial();
  await renderClasificacion();
  partidoEl.classList.add('partido-finalizado');
  setTimeout(() => partidoEl.classList.remove('partido-finalizado'), 3000);
}

// Loop
async function loop() {
  // 1. Recargar datos desde Supabase para sincronizar con otros clientes
  await cargarEquipos();
  await cargarMarcadorYTemporizador();
  await cargarProximosPartidos();

  // 2. Mostrar partido con datos actualizados
  mostrarPartido();
  renderClasificacion();
  renderProximosPartidos();

  // 3. Tick del temporizador (disminuir segundos y actualizar backend)
  if (temporizador && temporizador.segundos_restantes > 0) {
    await tickTemporizador();
  } else if (temporizador && temporizador.segundos_restantes === 0) {
    // Fin de partido, actualizar resultados y comenzar nuevo partido
    await finalizarPartido();
    await iniciarNuevoPartido();

    // Recargar datos luego de iniciar nuevo partido
    await cargarEquipos();
    await cargarMarcadorYTemporizador();
    await cargarProximosPartidos();

    // Renderizar todo otra vez
    mostrarPartido();
    renderClasificacion();
    renderProximosPartidos();
    renderHistorial();
  }
}


// Cargar marcador y temporizador
async function cargarMarcadorYTemporizador() {
  // Cargar marcador
  const { data: marcadorData } = await supabase.from('marcador').select('*').limit(1);
  let m = marcadorData?.[0] ?? null;

  if (!m) {
    const { data: proximos } = await supabase.from('proximos_partidos').select('*').order('id').limit(1);
    const partido = proximos?.[0];

    if (partido) {
      // Insertar marcador inicial
      const nuevoMarcador = {
        equipo_local: partido.equipo1_id,
        equipo_visitante: partido.equipo2_id,
        marcador_local: 0,
        marcador_visitante: 0
      };
      const { data: insertData, error: insertError } = await supabase
        .from('marcador')
        .insert(nuevoMarcador)
        .select()
        .single();

      if (!insertError) {
        m = insertData;
        // Eliminar ese partido de la tabla
        await supabase.from('proximos_partidos').delete().eq('id', partido.id);
      }
    }
  }

  // Cargar temporizador
  const { data: tempData } = await supabase.from('temporizador').select('*').limit(1);
  let t = tempData?.[0] ?? null;

  if (!t) {
    const { data: newTemp } = await supabase
      .from('temporizador')
      .insert({ segundos_restantes: 1800 })
      .select()
      .single();
    t = newTemp;
  }

  marcador = m;
  temporizador = t;
}



// Inicializar
async function init() {
  await cargarEquipos();
  await cargarMarcadorYTemporizador();
  await renderClasificacion();
  await renderProximosPartidos();
  await renderHistorial();
  mostrarPartido();
  actualizarMarcador();
  setInterval(loop, 1000);
}

init();
