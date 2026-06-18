import 'dotenv/config'
import app from './app.js'
import { config } from './config/index.js'

app.listen(config.port, () => {
  console.log(`Reef Pilot API läuft auf Port ${config.port}`)
})
