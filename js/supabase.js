// Usamos la URL de CDN con /+esm para que el navegador lo entienda directamente
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// Tu URL de proyecto (sacada de tu captura)
const supabaseUrl = 'https://lwdeftpkuruygiuzhdsq.supabase.co'

// AQUÍ PEGA LA CLAVE "sb_publishable_..." que copiaste de la sección "Publishable key"
const supabaseKey = 'sb_publishable_0gWfbDqndQFDZHg-sNPubw_OFbzuqtH' 

// Creamos y exportamos el cliente para que app.js y los demás archivos lo usen
export const supabase = createClient(supabaseUrl, supabaseKey)

console.log("MecSys: Conexión con Supabase configurada correctamente.");