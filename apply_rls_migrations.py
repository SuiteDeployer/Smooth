#!/usr/bin/env python3
"""
Script para aplicar as migrações RLS no Supabase via API
Aplica as 5 migrações criadas na ordem correta
"""

import requests
import json
import os
import sys

# Configurações do Supabase
SUPABASE_URL = "https://cisoewbdzdxombthxqfi.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpc29ld2JkemR4b21idGh4cWZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0NzY3MywiZXhwIjoyMDY5MjIzNjczfQ.dc0ckvRcSVxbo0OHKfTwMlOI8SI8kZSB4zXhbZ5y1yU"

def execute_sql(sql_content, migration_name):
    """Executa SQL no Supabase via API REST"""
    
    headers = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    # Endpoint para executar SQL
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    
    # Payload com o SQL
    payload = {
        'sql': sql_content
    }
    
    print(f"\n🔄 Executando migração: {migration_name}")
    print(f"📝 SQL Length: {len(sql_content)} caracteres")
    
    try:
        # Fazer requisição POST
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print(f"✅ {migration_name} - SUCESSO!")
            return True
        else:
            print(f"❌ {migration_name} - ERRO!")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ {migration_name} - EXCEÇÃO: {str(e)}")
        return False

def execute_sql_direct(sql_content, migration_name):
    """Executa SQL diretamente via endpoint SQL do Supabase"""
    
    headers = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
        'Content-Type': 'application/vnd.pgrst.object+json',
    }
    
    # Endpoint direto para SQL
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec"
    
    print(f"\n🔄 Executando migração: {migration_name}")
    
    try:
        # Dividir SQL em comandos individuais
        commands = [cmd.strip() for cmd in sql_content.split(';') if cmd.strip()]
        
        success_count = 0
        total_commands = len(commands)
        
        for i, command in enumerate(commands):
            if not command:
                continue
                
            print(f"  📝 Comando {i+1}/{total_commands}")
            
            # Fazer requisição para cada comando
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/rpc/exec",
                headers=headers,
                json={'sql': command + ';'},
                timeout=30
            )
            
            if response.status_code in [200, 201, 204]:
                success_count += 1
                print(f"    ✅ Sucesso")
            else:
                print(f"    ❌ Erro: {response.status_code} - {response.text}")
        
        if success_count == total_commands:
            print(f"✅ {migration_name} - TODOS OS COMANDOS EXECUTADOS!")
            return True
        else:
            print(f"⚠️ {migration_name} - {success_count}/{total_commands} comandos executados")
            return False
            
    except Exception as e:
        print(f"❌ {migration_name} - EXCEÇÃO: {str(e)}")
        return False

def main():
    """Função principal para aplicar todas as migrações"""
    
    print("🚀 INICIANDO APLICAÇÃO DAS MIGRAÇÕES RLS")
    print("=" * 60)
    
    # Lista das migrações na ordem correta
    migrations = [
        {
            'file': 'supabase/migrations/1757700000_create_rls_hierarchy_functions.sql',
            'name': '1. Funções RLS Hierárquicas'
        },
        {
            'file': 'supabase/migrations/1757700001_fix_investments_rls_policies.sql',
            'name': '2. Políticas RLS - Investimentos'
        },
        {
            'file': 'supabase/migrations/1757700002_fix_commissions_rls_policies.sql',
            'name': '3. Políticas RLS - Comissões'
        },
        {
            'file': 'supabase/migrations/1757700003_fix_remuneracoes_rls_policies.sql',
            'name': '4. Políticas RLS - Remunerações'
        },
        {
            'file': 'supabase/migrations/1757700004_fix_debentures_series_rls_policies.sql',
            'name': '5. Políticas RLS - Debêntures/Séries'
        }
    ]
    
    success_count = 0
    
    for migration in migrations:
        file_path = migration['file']
        migration_name = migration['name']
        
        # Verificar se arquivo existe
        if not os.path.exists(file_path):
            print(f"❌ Arquivo não encontrado: {file_path}")
            continue
        
        # Ler conteúdo do arquivo
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                sql_content = f.read()
        except Exception as e:
            print(f"❌ Erro ao ler arquivo {file_path}: {str(e)}")
            continue
        
        # Executar migração
        if execute_sql_direct(sql_content, migration_name):
            success_count += 1
        
        print("-" * 60)
    
    # Resultado final
    print(f"\n🎯 RESULTADO FINAL:")
    print(f"✅ Migrações executadas com sucesso: {success_count}/{len(migrations)}")
    
    if success_count == len(migrations):
        print("🎉 TODAS AS MIGRAÇÕES RLS FORAM APLICADAS COM SUCESSO!")
        print("\n🔗 Agora você pode testar em: https://smoothdebenture.netlify.app/login")
    else:
        print("⚠️ Algumas migrações falharam. Verifique os logs acima.")
    
    return success_count == len(migrations)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
