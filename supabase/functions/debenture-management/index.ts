Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        // Obter configurações do Supabase
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Configuração do Supabase não encontrada');
        }

        // Obter parâmetros da requisição
        const url = new URL(req.url);
        const action = url.searchParams.get('action');
        
        if (!action) {
            throw new Error('Ação não especificada');
        }

        // Obter token de autenticação
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('Token de autorização não fornecido');
        }

        const token = authHeader.replace('Bearer ', '');

        // Verificar usuário autenticado
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': serviceRoleKey
            }
        });

        if (!userResponse.ok) {
            throw new Error('Token inválido');
        }

        const userData = await userResponse.json();
        const userId = userData.id;

        let result;

        switch (action) {
            case 'get_debentures': {
                const status = url.searchParams.get('status');
                let query = `${supabaseUrl}/rest/v1/debentures?select=*,series(*)`;
                
                if (status && status !== 'all') {
                    query += `&status=eq.${status}`;
                }
                
                query += '&order=created_at.desc';

                const response = await fetch(query, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });

                if (!response.ok) {
                    throw new Error('Erro ao buscar debêntures');
                }

                const debentures = await response.json();
                result = { data: debentures };
                break;
            }

            case 'get_series': {
                const status = url.searchParams.get('status');
                const debentureId = url.searchParams.get('debenture_id');
                
                let query = `${supabaseUrl}/rest/v1/series?select=*,debentures(*)`;
                
                if (status && status !== 'all') {
                    query += `&status=eq.${status}`;
                }
                
                if (debentureId) {
                    query += `&debenture_id=eq.${debentureId}`;
                }
                
                query += '&order=created_at.desc';

                const response = await fetch(query, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });

                if (!response.ok) {
                    throw new Error('Erro ao buscar séries');
                }

                const series = await response.json();
                result = { data: series };
                break;
            }

            case 'create_debenture': {
                const requestData = await req.json();
                const { name, description, issuer_name, total_emission_value, emission_date, expiry_date, max_capacity, terms_and_conditions } = requestData;

                if (!name || !issuer_name || !total_emission_value || !emission_date) {
                    throw new Error('Campos obrigatórios não fornecidos');
                }

                const debentureData = {
                    name,
                    description: description || null,
                    issuer_name,
                    total_emission_value,
                    emission_date,
                    expiry_date: expiry_date || null,
                    max_capacity: max_capacity || null,
                    terms_and_conditions: terms_and_conditions || null,
                    status: 'active',
                    created_by: userId
                };

                const response = await fetch(`${supabaseUrl}/rest/v1/debentures`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(debentureData)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Erro ao criar debênture: ${errorText}`);
                }

                const newDebenture = await response.json();

                // Criar notificação
                await fetch(`${supabaseUrl}/functions/v1/notification-creator`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        type: 'debenture_created',
                        title: 'Nova Debênture Criada',
                        message: `A debênture "${name}" foi criada com sucesso.`,
                        data: { debenture_id: newDebenture[0].id }
                    })
                }).catch(console.error);

                result = { data: newDebenture[0] };
                break;
            }

            case 'update_debenture': {
                const requestData = await req.json();
                const { id, name, description, issuer_name, total_emission_value, expiry_date, max_capacity, terms_and_conditions, status } = requestData;

                if (!id) {
                    throw new Error('ID da debênture é obrigatório');
                }

                const updateData = {};
                if (name !== undefined) updateData.name = name;
                if (description !== undefined) updateData.description = description;
                if (issuer_name !== undefined) updateData.issuer_name = issuer_name;
                if (total_emission_value !== undefined) updateData.total_emission_value = total_emission_value;
                if (expiry_date !== undefined) updateData.expiry_date = expiry_date;
                if (max_capacity !== undefined) updateData.max_capacity = max_capacity;
                if (terms_and_conditions !== undefined) updateData.terms_and_conditions = terms_and_conditions;
                if (status !== undefined) updateData.status = status;
                updateData.updated_at = new Date().toISOString();

                const response = await fetch(`${supabaseUrl}/rest/v1/debentures?id=eq.${id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(updateData)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Erro ao atualizar debênture: ${errorText}`);
                }

                const updatedDebenture = await response.json();

                // Criar notificação
                await fetch(`${supabaseUrl}/functions/v1/notification-creator`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        type: 'debenture_updated',
                        title: 'Debênture Atualizada',
                        message: `A debênture foi atualizada com sucesso.`,
                        data: { debenture_id: id }
                    })
                }).catch(console.error);

                result = { data: updatedDebenture[0] };
                break;
            }

            case 'delete_debenture': {
                const requestData = await req.json();
                const { id } = requestData;

                if (!id) {
                    throw new Error('ID da debênture é obrigatório');
                }

                // Primeiro, verificar se existem séries associadas
                const seriesCheck = await fetch(`${supabaseUrl}/rest/v1/series?debenture_id=eq.${id}&select=id`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });

                const series = await seriesCheck.json();
                if (series.length > 0) {
                    throw new Error('Não é possível excluir debênture com séries associadas. Exclua as séries primeiro.');
                }

                const response = await fetch(`${supabaseUrl}/rest/v1/debentures?id=eq.${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Erro ao excluir debênture: ${errorText}`);
                }

                // Criar notificação
                await fetch(`${supabaseUrl}/functions/v1/notification-creator`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        type: 'debenture_deleted',
                        title: 'Debênture Excluída',
                        message: 'A debênture foi excluída com sucesso.',
                        data: { debenture_id: id }
                    })
                }).catch(console.error);

                result = { success: true, message: 'Debênture excluída com sucesso' };
                break;
            }

            case 'create_series': {
                const requestData = await req.json();
                const { debenture_id, series_code, name, description, minimum_investment, maximum_investment, max_total_captation, maturity_period_months, interest_rate, interest_type, max_commission_percentage, issue_date, expiry_date } = requestData;

                if (!debenture_id || !series_code || !name || !minimum_investment || !maturity_period_months || !interest_rate || !interest_type || !max_commission_percentage) {
                    throw new Error('Campos obrigatórios não fornecidos');
                }

                const seriesData = {
                    debenture_id,
                    series_code,
                    name,
                    description: description || null,
                    minimum_investment,
                    maximum_investment: maximum_investment || null,
                    max_total_captation: max_total_captation || null,
                    maturity_period_months,
                    interest_rate,
                    interest_type,
                    max_commission_percentage,
                    issue_date: issue_date || null,
                    expiry_date: expiry_date || null,
                    status: 'active',
                    created_by: userId
                };

                const response = await fetch(`${supabaseUrl}/rest/v1/series`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(seriesData)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Erro ao criar série: ${errorText}`);
                }

                const newSeries = await response.json();

                // Criar notificação
                await fetch(`${supabaseUrl}/functions/v1/notification-creator`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        type: 'series_created',
                        title: 'Nova Série Criada',
                        message: `A série "${name}" foi criada com sucesso.`,
                        data: { series_id: newSeries[0].id }
                    })
                }).catch(console.error);

                result = { data: newSeries[0] };
                break;
            }

            case 'update_series': {
                const requestData = await req.json();
                const { id, series_code, name, description, minimum_investment, maximum_investment, max_total_captation, maturity_period_months, interest_rate, interest_type, max_commission_percentage, issue_date, expiry_date, status } = requestData;

                if (!id) {
                    throw new Error('ID da série é obrigatório');
                }

                const updateData = {};
                if (series_code !== undefined) updateData.series_code = series_code;
                if (name !== undefined) updateData.name = name;
                if (description !== undefined) updateData.description = description;
                if (minimum_investment !== undefined) updateData.minimum_investment = minimum_investment;
                if (maximum_investment !== undefined) updateData.maximum_investment = maximum_investment;
                if (max_total_captation !== undefined) updateData.max_total_captation = max_total_captation;
                if (maturity_period_months !== undefined) updateData.maturity_period_months = maturity_period_months;
                if (interest_rate !== undefined) updateData.interest_rate = interest_rate;
                if (interest_type !== undefined) updateData.interest_type = interest_type;
                if (max_commission_percentage !== undefined) updateData.max_commission_percentage = max_commission_percentage;
                if (issue_date !== undefined) updateData.issue_date = issue_date;
                if (expiry_date !== undefined) updateData.expiry_date = expiry_date;
                if (status !== undefined) updateData.status = status;
                updateData.updated_at = new Date().toISOString();

                const response = await fetch(`${supabaseUrl}/rest/v1/series?id=eq.${id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(updateData)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Erro ao atualizar série: ${errorText}`);
                }

                const updatedSeries = await response.json();

                // Criar notificação
                await fetch(`${supabaseUrl}/functions/v1/notification-creator`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        type: 'series_updated',
                        title: 'Série Atualizada',
                        message: 'A série foi atualizada com sucesso.',
                        data: { series_id: id }
                    })
                }).catch(console.error);

                result = { data: updatedSeries[0] };
                break;
            }

            case 'delete_series': {
                const requestData = await req.json();
                const { id } = requestData;

                if (!id) {
                    throw new Error('ID da série é obrigatório');
                }

                // Verificar se existem investimentos associados
                const investmentCheck = await fetch(`${supabaseUrl}/rest/v1/investments?series_id=eq.${id}&select=id`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });

                const investments = await investmentCheck.json();
                if (investments.length > 0) {
                    throw new Error('Não é possível excluir série com investimentos associados.');
                }

                const response = await fetch(`${supabaseUrl}/rest/v1/series?id=eq.${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Erro ao excluir série: ${errorText}`);
                }

                // Criar notificação
                await fetch(`${supabaseUrl}/functions/v1/notification-creator`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        type: 'series_deleted',
                        title: 'Série Excluída',
                        message: 'A série foi excluída com sucesso.',
                        data: { series_id: id }
                    })
                }).catch(console.error);

                result = { success: true, message: 'Série excluída com sucesso' };
                break;
            }

            default:
                throw new Error(`Ação não reconhecida: ${action}`);
        }

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro na função debenture-management:', error);

        const errorResponse = {
            error: {
                code: 'DEBENTURE_MANAGEMENT_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});