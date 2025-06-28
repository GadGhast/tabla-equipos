import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Crear instancia de Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const app = express();
const PORT = process.env.PORT || 8000;

// Resolver __dirname con ESModules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir archivos estáticos desde la raíz (donde está index.html, main.js, etc.)
app.use(express.static(__dirname));

// Ruta para index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Ruta para obtener datos desde Supabase
app.get('/data', async (req, res) => {
  const { data, error } = await supabase
    .from('equipos')
    .select('*')
    .order('value', { ascending: false });

  if (error) {
    console.error('Error al obtener datos de Supabase:', error.message);
    return res.status(500).json({ error: 'Error al obtener datos de Supabase' });
  }

  res.json(data);
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`);
});
