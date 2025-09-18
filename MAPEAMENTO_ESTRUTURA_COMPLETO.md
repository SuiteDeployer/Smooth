# 📊 MAPEAMENTO COMPLETO: ESTRUTURA ATUAL vs ESPECIFICAÇÃO

## 🎯 OBJETIVO
Mapear exatamente o que existe no banco vs o que deveria existir conforme a especificação RLS.

---

## 📋 ESTRUTURA DE TABELAS IDENTIFICADA

### **TABELAS PRINCIPAIS**
```sql
-- CONFIRMADAS pelas imagens e migrações:
✅ users (parent_id, user_type, email, name, etc.)
✅ debentures (id, name, total_amount, issuer, etc.)
✅ series (id, debenture_id, series_letter, commercial_name, etc.)
✅ investments (id, debenture_id, series_id, investor_user_id, head_user_id, escritorio_user_id, master_user_id, agente_user_id, etc.)
✅ commissions (id, investment_id, user_id, user_type, commission_amount, etc.)
✅ remuneracoes (id, investment_id, investor_user_id, remuneration_amount, etc.)
✅ hierarchy_rules (id, role_name, can_be_under, is_top_level)

-- TABELAS MANUS (NOVAS):
✅ commissions_manus (cronograma mensal de comissões)
✅ remuneracoes_manus (cronograma mensal de remunerações)
```

### **CAMPOS CRÍTICOS CONFIRMADOS**
```sql
-- TABELA users:
- id (uuid, PK)
- email (varchar)
- name (varchar)
- user_type (varchar) -- 'Global', 'Master', 'Escritório', 'Head', 'Agente', 'Investidor'
- parent_id (uuid, FK) -- ✅ HIERARQUIA

-- TABELA investments:
- id (integer, PK)
- debenture_id (uuid, FK)
- series_id (uuid, FK)
- investor_user_id (uuid, FK)
- head_user_id (uuid, FK)
- escritorio_user_id (uuid, FK)
- master_user_id (uuid, FK)
- agente_user_id (uuid, FK) -- ✅ CONFIRMADO nas imagens
- investment_amount (numeric)
- head_commission_percentage, escritorio_commission_percentage, master_commission_percentage
- head_commission_amount, escritorio_commission_amount, master_commission_amount
```

---

## ❌ PROBLEMAS IDENTIFICADOS

### **1. POLÍTICAS RLS ATIVAS INCORRETAS**
```sql
-- POLÍTICAS PROBLEMÁTICAS (ATIVAS):
"debentures_read_all" USING (true)
"series_read_all" USING (true)
"commissions_read_all" USING (true)
"investments_select_all" USING (true)
```

### **2. ESTRUTURA TYPESCRIPT DESATUALIZADA**
```typescript
// src/lib/supabase.ts (INCORRETO):
export interface Investment {
  master_user_id: string
  escritorio_user_id: string
  head_user_id: string
  // ❌ FALTA: agente_user_id (existe no banco!)
}
```

### **3. POLÍTICAS MANUS USAM CAMPOS INCORRETOS**
```sql
-- POLÍTICAS MANUS (INCORRETAS):
WHERE u.superior_user_id = cu.id  -- ❌ Campo não existe

-- DEVERIA SER:
WHERE u.parent_id = cu.id  -- ✅ Campo correto
```

### **4. FALTA DE ISOLAMENTO ENTRE REDES**
- Não existe função `get_user_network_master()`
- Políticas não verificam se usuários pertencem à mesma rede
- Master Alpha pode ver dados de Master Beta

---

## 🎯 ESPECIFICAÇÃO RLS (HIERARQUIARLS.MD)

### **HIERARQUIA CORRETA**
```
Global
├── Master1 (REDE ALPHA) - NÃO VÊ REDE BETA
│   ├── Escritório 1 (SUB-REDE ALPHA-SP)
│   │   ├── Head (SUB-REDE ALPHA-SP-A) → Investidor 1
│   │   │    └── Agente (SUB-REDE ALPHA-SP-A1) → Investidor 2
│   │   └── Investidor (direto no Escritório1)
│   └── Investidor (direto no Master1)
├── Master2 (REDE BETA) - NÃO VÊ REDE ALPHA
```

### **PERMISSÕES POR MÓDULO**

#### **USUÁRIOS**
- **Global**: Cria, edita, deleta, visualiza TODOS
- **Master**: Cria, edita Escritórios e investidores, visualiza TODA REDE abaixo
- **Escritório**: Cria, edita Head e investidores, visualiza TODA REDE abaixo
- **Head**: Cria, edita Agente e investidores, visualiza TODA REDE abaixo
- **Investidor**: Só visualiza seu próprio perfil

#### **DEBÊNTURES E SÉRIES**
- **Global**: Cria, edita, deleta, visualiza tudo
- **Master, Escritório, Head, Agente**: Visualiza debêntures e séries
- **Investidor**: ❌ NÃO deve ver a área

#### **INVESTIMENTOS**
- **Global**: Cria, edita, deleta, visualiza TODOS
- **Master**: Cria, edita, deleta, visualiza investimentos que CRIA
- **Escritório, Head, Agente**: Visualiza investimentos onde está no SPLIT
- **Investidor**: Só visualiza onde está no SPLIT

#### **COMISSÕES**
- **Global**: Visualiza TODAS
- **Master, Escritório, Head, Agente**: Visualiza comissões onde está no SPLIT
- **Investidor**: ❌ NÃO tem visualização de comissões

#### **REMUNERAÇÕES**
- **Global**: Vê TODAS
- **Master, Escritório, Head, Agente**: Vê remunerações onde participa no SPLIT
- **Investidor**: Vê apenas SUAS próprias

---

## 🔧 CORREÇÕES NECESSÁRIAS

### **FASE 1: FUNÇÕES SQL FUNDAMENTAIS**
```sql
-- 1. Função para identificar rede do usuário
CREATE OR REPLACE FUNCTION get_user_network_master(user_uuid UUID)
RETURNS UUID AS $$
DECLARE
    master_id UUID;
BEGIN
    -- Se é Global, retorna NULL (vê tudo)
    IF (SELECT user_type FROM users WHERE id = user_uuid) = 'Global' THEN
        RETURN NULL;
    END IF;
    
    -- Se é Master, retorna próprio ID
    IF (SELECT user_type FROM users WHERE id = user_uuid) = 'Master' THEN
        RETURN user_uuid;
    END IF;
    
    -- Para outros tipos, sobe na hierarquia até encontrar o Master
    WITH RECURSIVE hierarchy AS (
        SELECT id, parent_id, user_type
        FROM users 
        WHERE id = user_uuid
        
        UNION ALL
        
        SELECT u.id, u.parent_id, u.user_type
        FROM users u
        INNER JOIN hierarchy h ON u.id = h.parent_id
        WHERE u.user_type != 'Master'
    )
    SELECT id INTO master_id
    FROM hierarchy 
    WHERE user_type = 'Master'
    LIMIT 1;
    
    RETURN master_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função para verificar se usuário está no split
CREATE OR REPLACE FUNCTION user_in_investment_split(user_uuid UUID, investment_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM investments 
        WHERE id = investment_id 
        AND (
            master_user_id = user_uuid OR
            escritorio_user_id = user_uuid OR
            head_user_id = user_uuid OR
            agente_user_id = user_uuid OR
            investor_user_id = user_uuid
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Função para verificar se usuário pode ver investimento
CREATE OR REPLACE FUNCTION can_view_investment(user_uuid UUID, investment_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    user_type_val VARCHAR;
    user_network UUID;
    investment_network UUID;
BEGIN
    -- Buscar tipo do usuário
    SELECT user_type INTO user_type_val FROM users WHERE id = user_uuid;
    
    -- Global vê tudo
    IF user_type_val = 'Global' THEN
        RETURN TRUE;
    END IF;
    
    -- Verificar se está na mesma rede
    user_network := get_user_network_master(user_uuid);
    SELECT get_user_network_master(master_user_id) INTO investment_network 
    FROM investments WHERE id = investment_id;
    
    -- Se não está na mesma rede, não pode ver
    IF user_network != investment_network THEN
        RETURN FALSE;
    END IF;
    
    -- Master: vê investimentos que cria (onde ele é o master)
    IF user_type_val = 'Master' THEN
        RETURN EXISTS (
            SELECT 1 FROM investments 
            WHERE id = investment_id AND master_user_id = user_uuid
        );
    END IF;
    
    -- Outros tipos: vê apenas onde está no split
    RETURN user_in_investment_split(user_uuid, investment_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **FASE 2: POLÍTICAS RLS CORRETAS**
```sql
-- REMOVER POLÍTICAS INCORRETAS
DROP POLICY IF EXISTS "investments_select_all" ON investments;
DROP POLICY IF EXISTS "commissions_read_all" ON commissions;
DROP POLICY IF EXISTS "remunerations_read_all" ON remunerations;

-- CRIAR POLÍTICAS CORRETAS
CREATE POLICY "investments_select_hierarchy_network" ON investments
FOR SELECT 
USING (
    auth.uid() IS NOT NULL 
    AND can_view_investment(auth.uid(), id)
);

CREATE POLICY "commissions_select_hierarchy_network" ON commissions
FOR SELECT 
USING (
    auth.uid() IS NOT NULL 
    AND (
        -- Global vê tudo
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'Global')
        OR
        -- Outros veem apenas comissões de investimentos onde estão no split da mesma rede
        EXISTS (
            SELECT 1 FROM investments i
            WHERE i.id = commissions.investment_id
            AND can_view_investment(auth.uid(), i.id)
            AND user_in_investment_split(auth.uid(), i.id)
        )
    )
    -- Investidores NÃO veem comissões
    AND NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'Investidor')
);
```

### **FASE 3: CORREÇÕES FRONTEND**
```typescript
// 1. Corrigir tipos TypeScript
export interface Investment {
  id: string
  series_id: string
  investor_user_id: string
  head_user_id: string
  master_user_id: string
  escritorio_user_id: string
  agente_user_id: string  // ✅ ADICIONAR
  // ... outros campos
}

// 2. Atualizar RestrictedField
const checkUserPermission = (userProfile: any, investment: any, field?: string): boolean => {
  if (!userProfile) return false;
  
  // Global sempre vê tudo
  if (userProfile.user_type === 'Global') return true;
  
  if (!investment) return true;
  
  // Verificar se está na mesma rede
  const userNetwork = getUserNetworkMaster(userProfile);
  const investmentNetwork = getUserNetworkMaster(investment.master_user_id);
  
  if (userNetwork !== investmentNetwork) return false;
  
  // Verificar se está no split
  const userIsInSplit = 
    investment.master_user_id === userProfile.id ||
    investment.escritorio_user_id === userProfile.id ||
    investment.head_user_id === userProfile.id ||
    investment.agente_user_id === userProfile.id ||  // ✅ CORRIGIDO
    investment.investor_user_id === userProfile.id;
  
  return userIsInSplit;
};

// 3. Implementar controles de acesso por módulo
const useModuleAccess = () => {
  const { userProfile } = useAuth();
  
  return {
    canAccessDebentures: userProfile?.user_type !== 'Investidor',
    canAccessSeries: userProfile?.user_type !== 'Investidor',
    canAccessCommissions: userProfile?.user_type !== 'Investidor',
    canCreateInvestments: ['Global', 'Master', 'Escritório', 'Head'].includes(userProfile?.user_type),
    canEditInvestments: ['Global', 'Master'].includes(userProfile?.user_type)
  };
};
```

---

## ✅ RESULTADOS ESPERADOS

### **APÓS IMPLEMENTAÇÃO:**
1. ✅ Master Alpha NÃO vê dados de Master Beta
2. ✅ Escritórios de redes diferentes são isolados
3. ✅ Investidores NÃO acessam Debêntures/Séries/Comissões
4. ✅ Usuários veem apenas dados onde estão no split de sua rede
5. ✅ Controle hierárquico funciona corretamente
6. ✅ Sistema implementa 100% da especificação HirearquiaRLS.md

---

**STATUS**: 📋 MAPEAMENTO COMPLETO - Pronto para implementação
**PRÓXIMO PASSO**: Implementar correções seguindo este mapeamento
