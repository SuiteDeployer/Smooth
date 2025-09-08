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
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const resendApiKey = Deno.env.get('RESEND_API_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Configuração do Supabase não encontrada');
        }

        const requestData = await req.json();
        console.log('✅ Dados recebidos:', requestData);
        
        const { email, action, token, newPassword } = requestData;

        if (!email) {
            return new Response(JSON.stringify({ 
                error: { message: 'Email é obrigatório' }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        // Action: 'request' para solicitar reset, 'reset' para definir nova senha
        if (action === 'request') {
            console.log('✅ Solicitando reset de senha para:', email);

            // Verificar se o usuário existe
            const userResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!userResponse.ok) {
                throw new Error('Erro ao verificar usuário');
            }

            const usersData = await userResponse.json();
            const userExists = usersData.users?.find((u: any) => u.email === email);

            if (!userExists) {
                // Por segurança, não revelamos se o email existe ou não
                return new Response(JSON.stringify({ 
                    data: {
                        message: 'Se o email existir em nossa base, você receberá instruções para redefinir sua senha.',
                        emailSent: false
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                });
            }

            // Gerar token de reset usando Supabase Auth
            const resetResponse = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'recovery',
                    email: email,
                    options: {
                        redirect_to: 'https://smooth-platform.space.minimax.io/'
                    }
                })
            });

            if (!resetResponse.ok) {
                const resetError = await resetResponse.text();
                console.error('❌ Erro ao gerar link de reset:', resetError);
                throw new Error('Erro ao gerar link de recuperação');
            }

            const resetData = await resetResponse.json();
            console.log('✅ Link de reset gerado:', JSON.stringify(resetData, null, 2));

            // Extrair o link de reset corretamente
            const actionLink = resetData?.action_link || resetData?.properties?.action_link || resetData?.data?.action_link;
            
            if (!actionLink) {
                console.error('❌ Link de ação não encontrado na resposta:', resetData);
                throw new Error('Erro ao gerar link de recuperação');
            }

            // Enviar email com link de reset
            let emailSent = false;
            let emailError = null;

            if (resendApiKey) {
                try {
                    const emailHtml = `
                    <!DOCTYPE html>
                    <html lang="pt-BR">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Recuperação de Senha - Smooth Platform</title>
                    </head>
                    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                            <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Recuperação de Senha</h1>
                            <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Smooth Platform</p>
                        </div>
                        
                        <div style="background: #ffffff; padding: 30px; border: 1px solid #e1e1e1; border-top: none;">
                            <p style="font-size: 16px; margin-bottom: 20px;">Olá,</p>
                            
                            <p style="font-size: 16px; margin-bottom: 20px;">
                                Você solicitou a recuperação de senha para sua conta na Smooth Platform.
                                Clique no botão abaixo para redefinir sua senha:
                            </p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${actionLink}" 
                                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                          color: white; padding: 15px 30px; text-decoration: none; 
                                          border-radius: 5px; font-weight: bold; font-size: 16px;">
                                    🔑 Redefinir Senha
                                </a>
                            </div>
                            
                            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 25px 0; border-left: 4px solid #ffc107;">
                                <h4 style="margin: 0 0 10px 0; color: #856404;">⚠️ Importante:</h4>
                                <ul style="margin: 10px 0; padding-left: 20px; color: #856404;">
                                    <li>Este link é válido por 24 horas</li>
                                    <li>Se você não solicitou esta recuperação, ignore este email</li>
                                    <li>Por segurança, escolha uma senha forte</li>
                                </ul>
                            </div>
                            
                            <hr style="border: none; border-top: 1px solid #e1e1e1; margin: 30px 0;">
                            
                            <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
                                Se você não conseguir clicar no botão, copie e cole este link no seu navegador:
                            </p>
                            
                            <p style="font-size: 12px; color: #888; word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 3px;">
                                ${actionLink}
                            </p>
                            
                            <p style="font-size: 14px; color: #666; margin-top: 20px;">
                                Atenciosamente,<br>
                                <strong>Equipe Smooth Platform</strong>
                            </p>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e1e1e1; border-top: none;">
                            <p style="font-size: 12px; color: #888; margin: 0;">
                                Este email foi enviado automaticamente. Não responda a esta mensagem.
                            </p>
                        </div>
                    </body>
                    </html>
                    `;

                    const emailResponse = await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${resendApiKey}`,
                        },
                        body: JSON.stringify({
                            from: 'Smooth Platform <onboarding@resend.dev>',
                            to: [email],
                            subject: '🔐 Recuperação de Senha - Smooth Platform',
                            html: emailHtml,
                        }),
                    });

                    if (emailResponse.ok) {
                        const emailData = await emailResponse.json();
                        console.log('✅ Email de recovery enviado:', emailData);
                        emailSent = true;
                    } else {
                        const errorText = await emailResponse.text();
                        console.error('❌ Erro ao enviar email:', errorText);
                        emailError = `Erro ${emailResponse.status}: ${errorText}`;
                    }
                } catch (error) {
                    console.error('❌ Erro na requisição de email:', error.message);
                    emailError = error.message;
                }
            }

            return new Response(JSON.stringify({ 
                data: {
                    message: 'Se o email existir em nossa base, você receberá instruções para redefinir sua senha.',
                    emailSent: emailSent,
                    emailError: emailError,
                    resetLink: actionLink // Para debug/teste
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });

        } else if (action === 'confirm') {
            // Esta action será tratada pelo frontend via Supabase Auth
            // A confirmação de reset é feita automaticamente pelo Supabase
            return new Response(JSON.stringify({ 
                data: {
                    message: 'Use o Supabase Auth para confirmar o reset de senha'
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });

        } else {
            return new Response(JSON.stringify({ 
                error: { message: 'Action inválida. Use "request" ou "confirm"' }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

    } catch (error) {
        console.error('❌ Erro final:', error.message);
        
        return new Response(JSON.stringify({
            error: {
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
