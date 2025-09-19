import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cisoewbdzdxombthxqfi.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpc29ld2JkemR4b21idGh4cWZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0NzY3MywiZXhwIjoyMDY5MjIzNjczfQ.dc0ckvRcSVxbo0OHKfTwMlOI8SI8kZSB4zXhbZ5y1yU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkMultiple() {
  console.log('🔍 Verificando múltiplos usuários com email agente.alpha.a@smooth.com.br...')
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'agente.alpha.a@smooth.com.br')
  
  if (error) {
    console.error('❌ Erro:', error.message)
  } else {
    console.log('✅ Usuários encontrados:', data.length)
    data.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id} | Email: ${user.email} | Nome: ${user.name} | Tipo: ${user.user_type}`)
    })
  }
}

checkMultiple()
