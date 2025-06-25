const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const DATA_FILE = path.join(__dirname, "equipos.json");

// Cargar datos desde archivo equipos.json
let equipos = [];
if (fs.existsSync(DATA_FILE)) {
  try {
    equipos = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch (e) {
    console.error("Error leyendo equipos.json:", e);
    equipos = [];
  }
} else {
  equipos = [];
}

// Guardar datos en equipos.json
function guardarEquipos() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(equipos, null, 2));
}

app.get("/data", (req, res) => {
  res.json(equipos);
});

app.post("/data", (req, res) => {
  equipos = req.body;
  guardarEquipos();
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
