import express from 'express';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pcnrwrttjbwannedamki.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnJ3cnR0amJ3YW5uZWRhbWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NTkwODUsImV4cCI6MjA2NjQzNTA4NX0.j62o4rP8afaRiaMyfX-UTze5B8ftgRgpwrGLq4FEvcs';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

const TEMP_ID = 1; // id fijo para temporizador
const MARCADOR_ID = 1; // id fijo para marcador
const PARTIDOS_CANTIDAD = 10;
const TIEMPO_PARTIDO = 1800; // 1800 segundos = 30 minutos

// --- Función para obtener todos los IDs de equipos
async function obtenerEquipos() {
  const { data, error } = await supabase.from('equipos').select('id');
  if (error) throw error;
  return data.map((e) => e.id);
}

// --- Genera 10 partidos aleatorios sin repetir equipos
async function generarPartidosAleatorios() {
  const equipos = await obtenerEquipos();

  if (equipos.length < 2) {
    throw new Error('No hay suficientes equipos para generar partidos');
  }

  const partidos = new Set();

  while (partidos.size < PARTIDOS_CANTIDAD) {
    const e1 = equipos[Math.floor(Math.random() * equipos.length)];
    let e2 = equipos[Math.floor(Math.random() * equipos.length)];
    while (e2 === e1) {
      e2 = equipos[Math.floor(Math.random() * equipos.length)];
    }
    const key = e1 < e2 ? `${e1}-${e2}` : `${e2}-${e1}`;
    partidos.add(key);
  }

  const arrayPartidos = Array.from(partidos).map((key) => {
    const [equipo1_id, equipo2_id] = key.split('-').map(Number);
    return { equipo1_id, equipo2_id };
  });

  const { error } = await supabase.from('proximos_partidos').insert(arrayPartidos);
  if (error) throw error;

  console.log('Partidos generados:', arrayPartidos);
}

// --- Inicializa datos: proximos_partidos, marcador y temporizador
async function inicializarDatos() {
  // Proximos partidos
  const { data: proximos, error: errProx } = await supabase.from('proximos_partidos').select('*');
  if (errProx) throw errProx;
  if (!proximos || proximos.length === 0) {
    console.log('No hay próximos partidos, generando...');
    await generarPartidosAleatorios();
  }

  // Marcador
  const { data: marcador, error: errMarc } = await supabase.from('marcador').select('*').eq('id', MARCADOR_ID).single();
  if (errMarc && errMarc.code !== 'PGRST116') throw errMarc; // ignorar no encontrado
  if (!marcador) {
    const { data: primerosPartidos, error: errPart } = await supabase.from('proximos_partidos').select('*').order('id').limit(1);
    if (errPart) throw errPart;
    if (primerosPartidos.length === 0) throw new Error('No hay partidos para inicializar marcador');

    const primerPartido = primerosPartidos[0];

    const { error: errInsertMarc } = await supabase.from('marcador').insert({
      id: MARCADOR_ID,
      equipo_local: primerPartido.equipo1_id,
      equipo_visitante: primerPartido.equipo2_id,
      marcador_local: 0,
      marcador_visitante: 0,
    });
    if (errInsertMarc) throw errInsertMarc;

    // Borrar partido usado
    const { error: errDel } = await supabase.from('proximos_partidos').delete().eq('id', primerPartido.id);
    if (errDel) throw errDel;

    console.log('Marcador inicializado con primer partido');
  }

  // Temporizador
  const { data: temp, error: errTemp } = await supabase.from('temporizador').select('*').eq('id', TEMP_ID).single();
  if (errTemp && errTemp.code !== 'PGRST116') throw errTemp;
  if (!temp) {
    const { error: errInsTemp } = await supabase.from('temporizador').insert({
      id: TEMP_ID,
      partido_actual: MARCADOR_ID,
      segundos_restantes: TIEMPO_PARTIDO,
    });
    if (errInsTemp) throw errInsTemp;
    console.log('Temporizador inicializado');
  }
}

// --- Actualiza clasificación según resultado del partido
async function actualizarClasificacion(marcador) {
  const { data: equipoLocal, error: errEl } = await supabase
    .from('equipos')
    .select('*')
    .eq('id', marcador.equipo_local)
    .single();
  if (errEl) throw errEl;

  const { data: equipoVisitante, error: errEv } = await supabase
    .from('equipos')
    .select('*')
    .eq('id', marcador.equipo_visitante)
    .single();
  if (errEv) throw errEv;

  const updates = [];
  if (marcador.marcador_local > marcador.marcador_visitante) {
    updates.push(
      supabase
        .from('equipos')
        .update({
          victorias: equipoLocal.victorias + 1,
          puntos: equipoLocal.puntos + 3,
        })
        .eq('id', equipoLocal.id),
      supabase
        .from('equipos')
        .update({
          derrotas: equipoVisitante.derrotas + 1,
        })
        .eq('id', equipoVisitante.id)
    );
  } else if (marcador.marcador_local < marcador.marcador_visitante) {
    updates.push(
      supabase
        .from('equipos')
        .update({
          victorias: equipoVisitante.victorias + 1,
          puntos: equipoVisitante.puntos + 3,
        })
        .eq('id', equipoVisitante.id),
      supabase
        .from('equipos')
        .update({
          derrotas: equipoLocal.derrotas + 1,
        })
        .eq('id', equipoLocal.id)
    );
  } else {
    updates.push(
      supabase
        .from('equipos')
        .update({
          empates: equipoLocal.empates + 1,
          puntos: equipoLocal.puntos + 1,
        })
        .eq('id', equipoLocal.id),
      supabase
        .from('equipos')
        .update({
          empates: equipoVisitante.empates + 1,
          puntos: equipoVisitante.puntos + 1,
        })
        .eq('id', equipoVisitante.id)
    );
  }
  await Promise.all(updates);
}

// --- Actualiza marcador con valores aleatorios entre -2 y +3
async function actualizarMarcadorAleatorio() {
  try {
    const { data: marcador, error } = await supabase.from('marcador').select('*').eq('id', MARCADOR_ID).single();
    if (error) throw error;

    // Genera números aleatorios entre -2 y 3
    const randLocal = Math.floor(Math.random() * 6) - 2; // [-2,3]
    const randVisitante = Math.floor(Math.random() * 6) - 2;

    // Actualiza marcador en Supabase
    const { error: errUpdate } = await supabase
      .from('marcador')
      .update({
        marcador_local: randLocal,
        marcador_visitante: randVisitante,
      })
      .eq('id', MARCADOR_ID);

    if (errUpdate) throw errUpdate;

    console.log(`Marcador actualizado: Local ${randLocal} - Visitante ${randVisitante}`);

    // Próxima actualización entre 2 a 6 segundos
    const proximoDelay = 2000 + Math.floor(Math.random() * 4000);
    setTimeout(actualizarMarcadorAleatorio, proximoDelay);
  } catch (err) {
    console.error('Error al actualizar marcador:', err.message || err);
    // Intentar reintentar en 5 segundos
    setTimeout(actualizarMarcadorAleatorio, 5000);
  }
}

// --- Función tick que se ejecuta cada segundo (temporizador)
async function tick() {
  try {
    const { data: temporizador, error: errTemp } = await supabase
      .from('temporizador')
      .select('*')
      .eq('id', TEMP_ID)
      .single();
    if (errTemp) throw errTemp;

    const { data: marcador, error: errMarc } = await supabase
      .from('marcador')
      .select('*')
      .eq('id', MARCADOR_ID)
      .single();
    if (errMarc) throw errMarc;

    if (temporizador.segundos_restantes > 0) {
      const nuevoTiempo = temporizador.segundos_restantes - 1;
      const { error } = await supabase
        .from('temporizador')
        .update({ segundos_restantes: nuevoTiempo })
        .eq('id', TEMP_ID);
      if (error) throw error;

      console.log('Temporizador:', nuevoTiempo);
    } else {
      // Temporizador llegó a 0: guardar resultado, actualizar clasificación, siguiente partido

      // Guardar resultado
      const { error: errRes } = await supabase
        .from('resultados')
        .insert({
          equipo1_id: marcador.equipo_local,
          equipo2_id: marcador.equipo_visitante,
          marcador1: marcador.marcador_local,
          marcador2: marcador.marcador_visitante,
        });
      if (errRes) throw errRes;

      // Actualizar clasificación
      await actualizarClasificacion(marcador);

      // Obtener siguiente partido
      const { data: proximosPartidos, error: errPartidos } = await supabase
        .from('proximos_partidos')
        .select('*')
        .order('id', { ascending: true });
      if (errPartidos) throw errPartidos;

      if (!proximosPartidos || proximosPartidos.length === 0) {
        console.log('No hay más partidos próximos. Finalizó la temporada.');

        // Limpiar marcador
        await supabase
          .from('marcador')
          .update({
            equipo_local: null,
            equipo_visitante: null,
            marcador_local: 0,
            marcador_visitante: 0,
          })
          .eq('id', MARCADOR_ID);

        // Detener temporizador
        await supabase
          .from('temporizador')
          .update({ segundos_restantes: 0 })
          .eq('id', TEMP_ID);

        return;
      }

      const siguiente = proximosPartidos[0];

      // Actualizar marcador con siguiente partido 0-0
      const { error: errMarcUpdate } = await supabase
        .from('marcador')
        .update({
          equipo_local: siguiente.equipo1_id,
          equipo_visitante: siguiente.equipo2_id,
          marcador_local: 0,
          marcador_visitante: 0,
        })
        .eq('id', MARCADOR_ID);
      if (errMarcUpdate) throw errMarcUpdate;

      // Eliminar partido usado
      const { error: errDelete } = await supabase
        .from('proximos_partidos')
        .delete()
        .eq('id', siguiente.id);
      if (errDelete) throw errDelete;

      // Reiniciar temporizador a 1800
      const { error: errResetTemp } = await supabase
        .from('temporizador')
        .update({ segundos_restantes: TIEMPO_PARTIDO })
        .eq('id', TEMP_ID);
      if (errResetTemp) throw errResetTemp;

      console.log('Siguiente partido cargado y temporizador reiniciado');
    }
  } catch (error) {
    console.error('Error en tick:', error.message || error);
  }
}

// --- Función principal
async function main() {
  try {
    await inicializarDatos();
    console.log('Inicialización completada.');

    // Iniciar actualización aleatoria de marcador
    actualizarMarcadorAleatorio();

    // Iniciar tick cada segundo para temporizador
    setInterval(tick, 1000);
  } catch (error) {
    console.error('Error en inicialización:', error.message || error);
  }
}

main();
