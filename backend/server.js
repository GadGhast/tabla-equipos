const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const DB_PATH = './db.json';

function readDB() {
  const data = fs.readFileSync(DB_PATH);
  return JSON.parse(data).equipos;
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify({ equipos: data }, null, 2));
}

// Obtener datos
app.get('/equipos', (req, res) => {
  const equipos = readDB();
  res.json(equipos);
});

// Guardar datos
app.post('/equipos', (req, res) => {
  const newData = req.body;
  writeDB(newData);
  res.json({ message: 'Datos actualizados correctamente' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});