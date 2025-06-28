import express from 'express'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables SUPABASE_URL o SUPABASE_ANON_KEY en .env')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

app.use(express.static('.'))

app.get('/data', async (req, res) => {
  const { data, error } = await supabase
    .from('equipos')
    .select('*')

  if (error) {
    return res.status(500).json({ error: error.message })
  }
  res.json(data)
})

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`)
})
