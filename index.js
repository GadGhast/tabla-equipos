const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

const DATA_FILE = path.join(__dirname, 'equipos.json');

function fluctuateValues(equipos) {
  equipos.forEach(c => {
    let delta = Math.floor(Math.random() * 21) - 10;
    if (Math.random() < 0.6) delta += Math.floor(Math.random() * 5);
    c.value = Math.max(0, c.value + delta); // evitar negativos
  });
}

function readData() {
  return new Promise((resolve, reject) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
      if (err) reject(err);
      else resolve(JSON.parse(data));
    });
  });
}

function writeData(data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), err => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Endpoint para obtener datos
app.get('/data', async (req, res) => {
  try {
    const data = await readData();
    res.json(data);
  } catch {
    res.status(500).send('Error leyendo los datos');
  }
});

// Servir index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Loop que actualiza los valores cada 1 segundo
async function updateLoop() {
  try {
    const equipos = await readData();
    fluctuateValues(equipos);
    await writeData(equipos);
  } catch (err) {
    console.error('Error en updateLoop:', err);
  }
  setTimeout(updateLoop, 1000); // Repetir cada 1 segundo
}

app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`);
  updateLoop();
});
