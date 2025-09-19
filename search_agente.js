import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cisoewbdzdxombthxqfi.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpc29ld2JkemR4b21idGh4cWZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0NzY3MywiZXhwIjoyMDY5MjIzNjczfQ.dc0ckvRcSVxbo0OHKfTwMlOI8SI8kZSB4zXhbZ5y1yU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function searchAgente() {
  console.log('🔍 Buscando usuários com "agente" no email...')
  
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, user_type')
    .ilike('email', '%agente%')
  
  if (error) {
    console.error('❌ Erro:', error.message)
  } else {
    console.log('✅ Usuários encontrados:', data.length)
    data.forEach((user, index) => {
      console.log(`${index + 1}. Email: "${user.email}" | Nome: ${user.name} | Tipo: ${user.user_type}`)
    })
  }
  
  // Também buscar por "alpha"
  console.log('\n🔍 Buscando usuários com "alpha" no email...')
  
  const { data: alphaData, error: alphaError } = await supabase
    .from('users')
    .select('id, email, name, user_type')
    .ilike('email', '%alpha%')
  
  if (alphaError) {
    console.error('❌ Erro:', alphaError.message)
  } else {
    console.log('✅ Usuários Alpha encontrados:', alphaData.length)
    alphaData.forEach((user, index) => {
      console.log(`${index + 1}. Email: "${user.email}" | Nome: ${user.name} | Tipo: ${user.user_type}`)
    })
  }
}

searchAgente()
