// index.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8000;

// Reemplaza estas variables si no estás usando .env
const SUPABASE_URL = 'https://rzkvdvfyfsecmqlmjbqb.supabase.co';
const SUPABASE_KEY = 'DaWBjMHl7zBz8nOMgITc/PszT/RHavXypdJGP3VWTgWDrDaBVG/bGPw0ZPAzQBZZU1Yl6gpCX45AAcajUbeiiA=='; // Tu clave API

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(cors());
app.use(express.static('public'));

app.get('/data', async (req, res) => {
  const { data, error } = await supabase.from('equipos').select('*');
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

app.listen(port, () => {
  console.log(`Servidor funcionando en http://localhost:${port}`);
});
