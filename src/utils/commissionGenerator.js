import { supabase } from '../lib/supabase';

/**
 * Gera comissões automáticas para um investimento
 * @param {number} investmentId - ID do investimento
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function generateCommissions(investmentId) {
  try {
    console.log('🔄 Gerando comissões para investimento:', investmentId);

    // 1. Buscar dados do investimento e série
    const { data: investment, error: investmentError } = await supabase
      .from('investments')
      .select(`
        *,
        series (
          term_months
        )
      `)
      .eq('id', investmentId)
      .single();

    if (investmentError) {
      throw new Error(`Erro ao buscar investimento: ${investmentError.message}`);
    }

    if (!investment) {
      throw new Error('Investimento não encontrado');
    }

    console.log('📊 Dados do investimento:', {
      id: investment.id,
      amount: investment.investment_amount,
      termMonths: investment.series.term_months
    });

    // 2. Preparar dados dos usuários e suas comissões
    const commissionUsers = [
      {
        userId: investment.master_user_id,
        userType: 'master',
        percentage: parseFloat(investment.commission_master) || 0
      },
      {
        userId: investment.escritorio_user_id,
        userType: 'escritorio',
        percentage: parseFloat(investment.commission_escritorio) || 0
      },
      {
        userId: investment.assessor_user_id,
        userType: 'assessor',
        percentage: parseFloat(investment.commission_assessor) || 0
      },
      {
        userId: investment.global_user_id,
        userType: 'global',
        percentage: parseFloat(investment.commission_global) || 0
      }
    ];

    // 3. Filtrar apenas usuários com comissão > 0
    const activeUsers = commissionUsers.filter(user => user.percentage > 0);
    
    console.log('👥 Usuários com comissão:', activeUsers);

    // 4. Gerar registros de comissão para cada usuário
    const commissionRecords = [];
    const investmentAmount = parseFloat(investment.investment_amount);
    const termMonths = investment.series.term_months;

    for (const user of activeUsers) {
      // Calcular valor total da comissão para este usuário
      const totalCommission = (investmentAmount * user.percentage) / 100;
      
      // Calcular valor mensal (dividir igualmente pelas parcelas)
      const monthlyCommission = totalCommission / termMonths;

      console.log(`💰 ${user.userType}: ${user.percentage}% = R$ ${totalCommission.toFixed(2)} (${termMonths}x R$ ${monthlyCommission.toFixed(2)})`);

      // Gerar uma comissão para cada mês
      for (let installment = 1; installment <= termMonths; installment++) {
        const commissionDate = calculateCommissionDate(investment.investment_date, installment);
        
        commissionRecords.push({
          investment_id: investmentId,
          user_id: user.userId,
          user_type: user.userType,
          commission_amount: monthlyCommission,
          commission_date: commissionDate,
          installment_number: installment,
          status: 'pending'
        });
      }
    }

    console.log(`📋 Total de comissões a criar: ${commissionRecords.length}`);

    // 5. Inserir todas as comissões no banco
    if (commissionRecords.length > 0) {
      const { data: insertedCommissions, error: insertError } = await supabase
        .from('commissions')
        .insert(commissionRecords)
        .select();

      if (insertError) {
        throw new Error(`Erro ao inserir comissões: ${insertError.message}`);
      }

      console.log('✅ Comissões criadas com sucesso:', insertedCommissions.length);
      
      return {
        success: true,
        data: {
          commissionsCreated: insertedCommissions.length,
          totalUsers: activeUsers.length,
          termMonths: termMonths,
          commissions: insertedCommissions
        }
      };
    } else {
      console.log('⚠️ Nenhuma comissão foi criada (todos os percentuais são 0)');
      
      return {
        success: true,
        data: {
          commissionsCreated: 0,
          message: 'Nenhuma comissão criada - todos os percentuais são 0%'
        }
      };
    }

  } catch (error) {
    console.error('❌ Erro ao gerar comissões:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Calcula a data de vencimento de uma parcela de comissão
 * @param {string} investmentDate - Data do investimento (YYYY-MM-DD)
 * @param {number} installmentNumber - Número da parcela (1, 2, 3...)
 * @returns {string} Data de vencimento (YYYY-MM-DD)
 */
function calculateCommissionDate(investmentDate, installmentNumber) {
  const baseDate = new Date(investmentDate);
  
  // Primeira parcela vence 30 dias após o investimento
  // Parcelas subsequentes vencem mensalmente
  const daysToAdd = 30 + ((installmentNumber - 1) * 30);
  
  const commissionDate = new Date(baseDate);
  commissionDate.setDate(commissionDate.getDate() + daysToAdd);
  
  // Retornar no formato YYYY-MM-DD
  return commissionDate.toISOString().split('T')[0];
}

/**
 * Calcula o valor mensal de uma comissão
 * @param {number} totalAmount - Valor total da comissão
 * @param {number} months - Número de meses
 * @returns {number} Valor mensal
 */
export function calculateMonthlyCommission(totalAmount, months) {
  if (months <= 0) return 0;
  return totalAmount / months;
}

/**
 * Busca comissões de um investimento específico
 * @param {number} investmentId - ID do investimento
 * @returns {Promise<Array>} Lista de comissões
 */
export async function getCommissionsByInvestment(investmentId) {
  try {
    const { data, error } = await supabase
      .from('commissions')
      .select(`
        *,
        users (
          name,
          email,
          pix
        )
      `)
      .eq('investment_id', investmentId)
      .order('installment_number', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar comissões: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('❌ Erro ao buscar comissões:', error);
    return [];
  }
}

/**
 * Atualiza o status de uma comissão
 * @param {string} commissionId - ID da comissão
 * @param {string} status - Novo status ('pending', 'paid', 'cancelled')
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateCommissionStatus(commissionId, status) {
  try {
    const { error } = await supabase
      .from('commissions')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', commissionId);

    if (error) {
      throw new Error(`Erro ao atualizar status: ${error.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao atualizar status da comissão:', error);
    return { success: false, error: error.message };
  }
}

