#!/usr/bin/env python3
"""
Script para aplicar as migrações RLS diretamente no PostgreSQL via psycopg2
"""

import os
import sys

def install_psycopg2():
    """Instala psycopg2 se não estiver disponível"""
    try:
        import psycopg2
        return True
    except ImportError:
        print("📦 Instalando psycopg2...")
        os.system("pip3 install psycopg2-binary")
        try:
            import psycopg2
            return True
        except ImportError:
            print("❌ Falha ao instalar psycopg2")
            return False

def execute_sql_file(cursor, file_path, migration_name):
    """Executa um arquivo SQL"""
    
    print(f"\n🔄 Executando migração: {migration_name}")
    
    try:
        # Ler arquivo SQL
        with open(file_path, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        print(f"📝 SQL Length: {len(sql_content)} caracteres")
        
        # Executar SQL
        cursor.execute(sql_content)
        
        print(f"✅ {migration_name} - SUCESSO!")
        return True
        
    except Exception as e:
        print(f"❌ {migration_name} - ERRO: {str(e)}")
        return False

def main():
    """Função principal"""
    
    # Instalar psycopg2 se necessário
    if not install_psycopg2():
        return False
    
    import psycopg2
    
    print("🚀 APLICANDO MIGRAÇÕES RLS VIA CONEXÃO DIRETA")
    print("=" * 60)
    
    # String de conexão do Supabase
    # Formato: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
    connection_string = "postgresql://postgres.cisoewbdzdxombthxqfi:iCa^6Q$QF!Qmpgt0@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
    
    try:
        # Conectar ao banco
        print("🔌 Conectando ao Supabase PostgreSQL...")
        conn = psycopg2.connect(connection_string)
        conn.autocommit = True  # Para executar DDL commands
        cursor = conn.cursor()
        
        print("✅ Conexão estabelecida!")
        
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
            
            # Executar migração
            if execute_sql_file(cursor, file_path, migration_name):
                success_count += 1
            
            print("-" * 60)
        
        # Fechar conexão
        cursor.close()
        conn.close()
        
        # Resultado final
        print(f"\n🎯 RESULTADO FINAL:")
        print(f"✅ Migrações executadas com sucesso: {success_count}/{len(migrations)}")
        
        if success_count == len(migrations):
            print("🎉 TODAS AS MIGRAÇÕES RLS FORAM APLICADAS COM SUCESSO!")
            print("\n🔗 Agora você pode testar em: https://smoothdebenture.netlify.app/login")
            return True
        else:
            print("⚠️ Algumas migrações falharam. Verifique os logs acima.")
            return False
            
    except Exception as e:
        print(f"❌ Erro de conexão: {str(e)}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
