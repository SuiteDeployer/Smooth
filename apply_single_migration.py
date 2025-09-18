#!/usr/bin/env python3
"""
Script para aplicar uma migração RLS por vez usando requests
"""

import requests
import json
import os
import sys

# Configurações do Supabase
SUPABASE_URL = "https://cisoewbdzdxombthxqfi.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpc29ld2JkemR4b21idGh4cWZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0NzY3MywiZXhwIjoyMDY5MjIzNjczfQ.dc0ckvRcSVxbo0OHKfTwMlOI8SI8kZSB4zXhbZ5y1yU"

def execute_single_command(sql_command):
    """Executa um único comando SQL"""
    
    headers = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json'
    }
    
    # Usar endpoint de query SQL
    url = f"{SUPABASE_URL}/rest/v1/rpc/query"
    
    payload = {
        'query': sql_command
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        return response.status_code in [200, 201, 204], response.text
    except Exception as e:
        return False, str(e)

def main():
    if len(sys.argv) != 2:
        print("Uso: python3 apply_single_migration.py <numero_da_migracao>")
        print("Exemplo: python3 apply_single_migration.py 1")
        return False
    
    migration_num = sys.argv[1]
    
    # Mapear número para arquivo
    migrations = {
        '1': {
            'file': 'supabase/migrations/1757700000_create_rls_hierarchy_functions.sql',
            'name': 'Funções RLS Hierárquicas'
        },
        '2': {
            'file': 'supabase/migrations/1757700001_fix_investments_rls_policies.sql',
            'name': 'Políticas RLS - Investimentos'
        },
        '3': {
            'file': 'supabase/migrations/1757700002_fix_commissions_rls_policies.sql',
            'name': 'Políticas RLS - Comissões'
        },
        '4': {
            'file': 'supabase/migrations/1757700003_fix_remuneracoes_rls_policies.sql',
            'name': 'Políticas RLS - Remunerações'
        },
        '5': {
            'file': 'supabase/migrations/1757700004_fix_debentures_series_rls_policies.sql',
            'name': 'Políticas RLS - Debêntures/Séries'
        }
    }
    
    if migration_num not in migrations:
        print(f"❌ Migração {migration_num} não encontrada")
        return False
    
    migration = migrations[migration_num]
    file_path = migration['file']
    migration_name = migration['name']
    
    print(f"🔄 Executando migração {migration_num}: {migration_name}")
    
    # Verificar se arquivo existe
    if not os.path.exists(file_path):
        print(f"❌ Arquivo não encontrado: {file_path}")
        return False
    
    # Ler arquivo
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            sql_content = f.read()
    except Exception as e:
        print(f"❌ Erro ao ler arquivo: {str(e)}")
        return False
    
    print(f"📝 Conteúdo SQL: {len(sql_content)} caracteres")
    
    # Tentar executar como um bloco único
    print("🔄 Executando SQL...")
    success, response = execute_single_command(sql_content)
    
    if success:
        print(f"✅ Migração {migration_num} executada com sucesso!")
        print(f"Response: {response}")
        return True
    else:
        print(f"❌ Erro na migração {migration_num}")
        print(f"Response: {response}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
