import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cisoewbdzdxombthxqfi.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpc29ld2JkemR4b21idGh4cWZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0NzY3MywiZXhwIjoyMDY5MjIzNjczfQ.dc0ckvRcSVxbo0OHKfTwMlOI8SI8kZSB4zXhbZ5y1yU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkRLS() {
  console.log('🔍 Verificando usuário agente.alpha.a@smooth.com.br com service_role...')
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'agente.alpha.a@smooth.com.br')
    .single()
  
  if (error) {
    console.error('❌ Erro:', error.message)
  } else {
    console.log('✅ Usuário encontrado:', {
      id: data.id,
      email: data.email,
      name: data.name,
      user_type: data.user_type,
      parent_id: data.parent_id
    })
  }
}

checkRLS()
