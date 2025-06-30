import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables SUPABASE_URL o SUPABASE_ANON_KEY en .env');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Webhook de Discord
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1389365080285773845/j_6tsQa90hfHvZ5QE3yuBDHErjm5UGvPlKUcz-ScotwW3kwNpm48PffWgQqLH7Ixp8jf';

// Middleware para servir archivos estáticos y procesar JSON
app.use(express.static('.'));
app.use(express.json());

// Ruta para obtener datos de Supabase
app.get('/data', async (req, res) => {
  const { data, error } = await supabase.from('equipos').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Nueva ruta para enviar mensajes a Discord
app.post('/send-to-discord', async (req, res) => {
  const { title, description, color } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Faltan datos: title y description son requeridos' });
  }

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: title,
            description: description,
            color: color || 3447003, // Color por defecto
          },
        ],
      }),
    });

    if (!response.ok) throw new Error('Error al enviar al webhook');

    res.status(200).json({ success: true, message: 'Mensaje enviado a Discord' });
  } catch (error) {
    console.error('Error al enviar mensaje a Discord:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Función para generar valores aleatorios
function generarValorAleatorio() {
  return Math.floor(Math.random() * 6) - 2; // -2 a +3
}

// Función para actualizar valores en Supabase
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

// Intervalo para actualizar valores cada 5 segundos
setInterval(actualizarValores, 5000);

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
