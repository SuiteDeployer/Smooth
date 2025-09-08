CREATE TABLE remuneracoes (
    id_pagamento VARCHAR(255) PRIMARY KEY,
    nome_investidor TEXT NOT NULL,
    debenture TEXT NOT NULL,
    serie TEXT NOT NULL,
    valor_remuneracao DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    pix TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID NOT NULL
);