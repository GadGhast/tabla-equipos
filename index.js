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

app.use(express.static('.'));

app.get('/data', async (req, res) => {
  const { data, error } = await supabase.from('equipos').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

function generarValorAleatorio() {
  return Math.floor(Math.random() * 6) - 2; // -2 a +3
}

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
      console.error(`Error al actualizar equipo ${equipo.id}:`, updateError);
    }
  }
}

setInterval(actualizarValores, 5000);

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
