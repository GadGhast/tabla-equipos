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

// Función para generar valores aleatorios con tendencia alcista
function generarValoresConTendenciaAlcista() {
  const baseIncremento = 2; // Incremento base para garantizar tendencia alcista
  const fluctuacion = Math.floor(Math.random() * 21) - 10; // Rango entre -10 y 10
  return baseIncremento + fluctuacion; // Resultado combinado
}

// Función para actualizar los valores de la tabla "equipos"
async function actualizarValores() {
  const { data: equipos, error } = await supabase.from('equipos').select('*');

  if (error) {
    console.error('Error al obtener equipos:', error);
    return;
  }

  for (const equipo of equipos) {
    // Incrementar valor actual con tendencia alcista
    const incremento = generarValoresConTendenciaAlcista();
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
}

// Actualizar valores cada 2 segundos
setInterval(actualizarValores, 2000);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
