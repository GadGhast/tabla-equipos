import express from 'express';
import path from 'path';
import fetch from 'node-fetch';
import {
  createClient
} from '@supabase/supabase-js';

const app = express();
const port = process.env.PORT || 3000;

const SUPABASE_URL = 'https://pcnrwrttjbwannedamki.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnJ3cnR0amJ3YW5uZWRhbWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NTkwODUsImV4cCI6MjA2NjQzNTA4NX0.j62o4rP8afaRiaMyfX-UTze5B8ftgRgpwrGLq4FEvcs';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TEMP_ID = 1;
const MARCADOR_ID = 1;
const TIEMPO_PARTIDO = 900;

// --- Servir archivos estáticos ---
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});
app.get('/main.js', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'main.js'));
});
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

// --- Inicializa datos al iniciar ---
async function inicializarDatos() {
  const {
    data: partidos
  } = await supabase.from('proximos_partidos').select('*');
  if (!partidos || partidos.length < 1) {
    await generarPartidosAleatorios();
  }

  const {
    data: marcador,
    error: errMarcador
  } = await supabase.from('marcador').select('*').eq('id', MARCADOR_ID).single();
  if (errMarcador || !marcador) {
    const {
      data: primer
    } = await supabase.from('proximos_partidos').select('*').order('id').limit(1);
    if (!primer || primer.length === 0) return;
    await supabase.from('marcador').insert({
      id: MARCADOR_ID,
      equipo_local: primer[0].equipo1_id,
      equipo_visitante: primer[0].equipo2_id,
      marcador_local: 0,
      marcador_visitante: 0
    });
    await supabase.from('proximos_partidos').delete().eq('id', primer[0].id);
  }

  const {
    data: temp,
    error: errTemp
  } = await supabase.from('temporizador').select('*').eq('id', TEMP_ID).single();
  if (errTemp || !temp) {
    await supabase.from('temporizador').insert({
      id: TEMP_ID,
      partido_actual: MARCADOR_ID,
      segundos_restantes: TIEMPO_PARTIDO
    });
  }
}

// --- Genera 10 partidos aleatorios únicos ---
async function generarPartidosAleatorios() {
  const { data: equipos } = await supabase.from('equipos').select('id');
  if (!equipos || equipos.length < 20) {
    console.log('No hay suficientes equipos para generar partidos únicos.');
    return;
  }

  // Mezclar aleatoriamente los IDs de equipos
  const ids = equipos.map(e => e.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }

  // Formar 10 partidos con equipos únicos
  const partidos = [];
  for (let i = 0; i < 20; i += 2) {
    partidos.push({
      equipo1_id: ids[i],
      equipo2_id: ids[i + 1]
    });
  }

  await supabase.from('proximos_partidos').insert(partidos);
  console.log(`Se generaron ${partidos.length} partidos únicos sin repetir equipos.`);
}


// --- Actualiza clasificación según el resultado ---
async function actualizarClasificacion(marcador) {
  const {
    data: el
  } = await supabase.from('equipos').select('*').eq('id', marcador.equipo_local).single();
  const {
    data: ev
  } = await supabase.from('equipos').select('*').eq('id', marcador.equipo_visitante).single();

  if (marcador.marcador_local > marcador.marcador_visitante) {
    await supabase.from('equipos').update({
      puntos: el.puntos + 3,
      victorias: el.victorias + 1
    }).eq('id', el.id);
    await supabase.from('equipos').update({
      derrotas: ev.derrotas + 1
    }).eq('id', ev.id);
  } else if (marcador.marcador_local < marcador.marcador_visitante) {
    await supabase.from('equipos').update({
      puntos: ev.puntos + 3,
      victorias: ev.victorias + 1
    }).eq('id', ev.id);
    await supabase.from('equipos').update({
      derrotas: el.derrotas + 1
    }).eq('id', el.id);
  } else {
    await supabase.from('equipos').update({
      puntos: el.puntos + 1,
      empates: el.empates + 1
    }).eq('id', el.id);
    await supabase.from('equipos').update({
      puntos: ev.puntos + 1,
      empates: ev.empates + 1
    }).eq('id', ev.id);
  }
}

// --- TICK de 1 segundo: decrementa temporizador y controla fin partido ---
async function tick() {
  try {
    const {
      data: temp
    } = await supabase.from('temporizador').select('*').eq('id', TEMP_ID).single();
    const {
      data: marcador
    } = await supabase.from('marcador').select('*').eq('id', MARCADOR_ID).single();

    if (temp.segundos_restantes > 0) {
      const nuevosSegundos = temp.segundos_restantes - 1;
      await supabase.from('temporizador').update({
        segundos_restantes: nuevosSegundos
      }).eq('id', TEMP_ID);
      console.log(`Tick: ${nuevosSegundos}s restantes`);
    } else {
      // Fin partido: guardar resultado y actualizar clasificación
      // Insertar resultado en Supabase
      await supabase.from('resultados').insert({
        equipo1_id: marcador.equipo_local,
        equipo2_id: marcador.equipo_visitante,
        marcador1: marcador.marcador_local,
        marcador2: marcador.marcador_visitante
      });

      // Obtener nombres e imágenes de equipos
      const {
        data: equipoLocal
      } = await supabase
        .from('equipos')
        .select('name, image_url')
        .eq('id', marcador.equipo_local)
        .single();

      const {
        data: equipoVisitante
      } = await supabase
        .from('equipos')
        .select('name, image_url')
        .eq('id', marcador.equipo_visitante)
        .single();

      // Determinar ganador (o empate)
      let thumbnailUrl = '';
      if (marcador.marcador_local > marcador.marcador_visitante) {
        thumbnailUrl = equipoLocal.image_url;
      } else if (marcador.marcador_local < marcador.marcador_visitante) {
        thumbnailUrl = equipoVisitante.image_url;
      }

      // Enviar mensaje embed a Discord
      const webhookURL = 'https://discord.com/api/webhooks/1391386398539382856/A8EGXWhl2SdJHWW7pjz3VFMe1051s3-4B0l77A1M56fa90G3lmonCyQmh-xA8d2PLxMn';

      // Construir el payload del embed
      const payload = {
        embeds: [{
          title: `**${equipoLocal.name} - ${equipoVisitante.name}**`,
          description: `**${marcador.marcador_local} : ${marcador.marcador_visitante}**`,
          color: 65321,
          ...(thumbnailUrl ? {
            thumbnail: {
              url: thumbnailUrl
            }
          } : {})
        }]
      };

      // Enviar a Discord
      await fetch(webhookURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });




      await actualizarClasificacion(marcador);

      // Obtener siguiente partido o generar nuevos
      let {
        data: siguiente
      } = await supabase.from('proximos_partidos').select('*').order('id').limit(1);
      if (!siguiente || siguiente.length === 0) {
		await generarPartidosAleatorios();
		// Esperar unos milisegundos por si hay un pequeño delay de escritura
		await new Promise(resolve => setTimeout(resolve, 300));
		const { data: nuevos } = await supabase.from('proximos_partidos').select('*').order('id').limit(1);
		siguiente = nuevos;
	  }

      // Actualizar marcador y temporizador para el nuevo partido
      await supabase.from('marcador').update({
        equipo_local: siguiente[0].equipo1_id,
        equipo_visitante: siguiente[0].equipo2_id,
        marcador_local: 0,
        marcador_visitante: 0
      }).eq('id', MARCADOR_ID);

      await supabase.from('temporizador').update({
        segundos_restantes: TIEMPO_PARTIDO
      }).eq('id', TEMP_ID);

      await supabase.from('proximos_partidos').delete().eq('id', siguiente[0].id);

      console.log('Partido finalizado. Iniciado nuevo partido.');
    }
  } catch (err) {
    console.error('[TICK ERROR]', err.message || err);
  }
}

// --- Actualiza marcador local independientemente cada 2-6 segundos ---
async function actualizarMarcadorLocal() {
  try {
    const {
      data: temp
    } = await supabase.from('temporizador').select('*').eq('id', TEMP_ID).single();
    if (!temp || temp.segundos_restantes <= 5) return;

    const {
      data: marcador
    } = await supabase.from('marcador').select('*').eq('id', MARCADOR_ID).single();
    if (!marcador) return;

    const deltaLocal = Math.floor(Math.random() * 6) - 2; // [-2..3]

    await supabase.from('marcador').update({
      marcador_local: marcador.marcador_local + deltaLocal
    }).eq('id', MARCADOR_ID);

    console.log(`Marcador local actualizado: ${marcador.marcador_local + deltaLocal}`);
  } catch (err) {
    console.error('[MARCADOR LOCAL ERROR]', err.message || err);
  }
}

// --- Actualiza marcador visitante independientemente cada 2-6 segundos ---
async function actualizarMarcadorVisitante() {
  try {
    const {
      data: temp
    } = await supabase.from('temporizador').select('*').eq('id', TEMP_ID).single();
    if (!temp || temp.segundos_restantes <= 5) return;

    const {
      data: marcador
    } = await supabase.from('marcador').select('*').eq('id', MARCADOR_ID).single();
    if (!marcador) return;

    const deltaVisitante = Math.floor(Math.random() * 6) - 2; // [-2..3]

    await supabase.from('marcador').update({
      marcador_visitante: marcador.marcador_visitante + deltaVisitante
    }).eq('id', MARCADOR_ID);

    console.log(`Marcador visitante actualizado: ${marcador.marcador_visitante + deltaVisitante}`);
  } catch (err) {
    console.error('[MARCADOR VISITANTE ERROR]', err.message || err);
  }
}

// --- Función recursiva para actualizar marcador local cada 2-6 segundos ---
function iniciarActualizacionesMarcadorLocal() {
  const delay = Math.floor(Math.random() * 5 + 2) * 1000; // 2000 a 6000 ms
  setTimeout(async () => {
    await actualizarMarcadorLocal();
    iniciarActualizacionesMarcadorLocal();
  }, delay);
}

// --- Función recursiva para actualizar marcador visitante cada 2-6 segundos ---
function iniciarActualizacionesMarcadorVisitante() {
  const delay = Math.floor(Math.random() * 5 + 2) * 1000; // 2000 a 6000 ms
  setTimeout(async () => {
    await actualizarMarcadorVisitante();
    iniciarActualizacionesMarcadorVisitante();
  }, delay);
}

// --- Iniciar todo ---
async function iniciarTick() {
  await tick();
  setTimeout(iniciarTick, 1000); // No se solapa, evita doble decremento
}

(async () => {
  await inicializarDatos();
  iniciarTick(); // reemplaza a setInterval
  iniciarActualizacionesMarcadorLocal();
  iniciarActualizacionesMarcadorVisitante();
})();

app.listen(port, () => {
  console.log(`Servidor activo en http://localhost:${port}`);
});
