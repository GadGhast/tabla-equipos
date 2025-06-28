import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables SUPABASE_URL o SUPABASE_ANON_KEY en .env');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Servir archivos estáticos
app.use(express.static('.'));

// Endpoint para obtener datos de la tabla
app.get('/data', async (req, res) => {
  const { data, error } = await supabase.from('equipos').select('*');

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Función para generar valores aleatorios entre -2 y 3
function generarValorAleatorio() {
  return Math.floor(Math.random() * 6) - 2; // Valores entre -2 y +3
}

// Función para actualizar los valores de la tabla "equipos"
async function actualizarValores() {
  const { data: equipos, error } = await supabase.from('equipos').select('*');

  if (error) {
    console.error('Error al obtener equipos:', error);
    return;
  }

  for (const equipo of equipos) {
    const incremento = generarValorAleatorio();
    const nuevoValor = equipo.value + incremento;

    const { error: updateError } = await supabase
      .from('equipos')
      .update({ value: nuevoValor })
      .eq('id', equipo.id);

    if (updateError) {
      console.error(`Error al actualizar el equipo ${equipo.name}:`, updateError);
    } else {
      console.log(
        `El equipo ${equipo.name} ahora tiene un valor de ${nuevoValor} (Incremento: ${incremento})`
      );
    }
  }

  // Generar un nuevo intervalo aleatorio entre 2 y 6 segundos
  const nuevoIntervalo = Math.floor(Math.random() * 5 + 2) * 1000;
  console.log(`Próxima actualización en ${nuevoIntervalo / 1000} segundos`);
  setTimeout(actualizarValores, nuevoIntervalo);
}

// Iniciar la primera actualización
actualizarValores();

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
