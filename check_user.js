import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cisoewbdzdxombthxqfi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpc29ld2JkemR4b21idGh4cWZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NDc2NzMsImV4cCI6MjA2OTIyMzY3M30.lNvYVe8ilP-Ak0AsSv80JkLyMm_HM3rfD31EUlQF-fQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUser() {
  console.log('🔍 Verificando usuário agente.alpha.a@smooth.com.br...')
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'agente.alpha.a@smooth.com.br')
    .single()
  
  if (error) {
    console.error('❌ Erro:', error.message)
    console.log('🔍 Listando todos os usuários com "agente" no email...')
    
    const { data: allUsers, error: listError } = await supabase
      .from('users')
      .select('email, name, user_type')
      .ilike('email', '%agente%')
    
    if (listError) {
      console.error('❌ Erro ao listar:', listError.message)
    } else {
      console.log('📋 Usuários encontrados:', allUsers)
    }
  } else {
    console.log('✅ Usuário encontrado:', data)
  }
}

checkUser()
