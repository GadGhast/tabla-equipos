require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Obtener equipos
app.get('/data', async (req, res) => {
  const { data, error } = await supabase.from('equipos').select('*').order('id');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Actualizar puntuación
app.post('/update', async (req, res) => {
  const { id, value } = req.body;
  const { error } = await supabase.from('equipos').update({ value }).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});