import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cisoewbdzdxombthxqfi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpc29ld2JkemR4b21idGh4cWZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NDc2NzMsImV4cCI6MjA2OTIyMzY3M30.lNvYVe8ilP-Ak0AsSv80JkLyMm_HM3rfD31EUlQF-fQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function listUsers() {
  console.log('📋 Listando todos os usuários...')
  
  const { data, error } = await supabase
    .from('users')
    .select('email, name, user_type, parent_id')
    .order('email')
  
  if (error) {
    console.error('❌ Erro:', error.message)
  } else {
    console.log('✅ Usuários encontrados:', data.length)
    data.forEach(user => {
      console.log(`- ${user.email} | ${user.name} | ${user.user_type}`)
    })
  }
}

listUsers()
