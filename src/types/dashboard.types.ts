// Tipos para as métricas do dashboard
export interface DashboardUser {
  id: string;
  name: string;
  email: string;
  created_at: string;
  status: string;
}

export interface AssessorPerformance {
  assessor_id: string;
  assessor_name: string;
  total_investments: number;
  total_amount: number;
  clients_count: number;
}

export interface RecentInvestment {
  id: string;
  investor_name: string;
  assessor_name: string;
  series_name: string;
  amount: number;
  created_at: string;
}

export interface SeriesBreakdown {
  series_code: string;
  count: number;
  total_amount: number;
}

export interface InvestorBreakdown {
  investor_name: string;
  count: number;
  total_amount: number;
}

export interface RecentCommission {
  id: string;
  user_role: string;
  amount: number;
  status: string;
  created_at: string;
}

export interface DashboardMetrics {
  masters: {
    total: number;
    new_this_month: number;
    users: DashboardUser[];
  };
  escritorios: {
    total: number;
    new_this_month: number;
    users: DashboardUser[];
  };
  assessores: {
    total: number;
    new_this_month: number;
    top_performers: AssessorPerformance[];
    bottom_performers: AssessorPerformance[];
    users: DashboardUser[];
  };
  investidores: {
    total: number;
    new_this_month: number;
    recent: DashboardUser[];
    all: DashboardUser[];
  };
  investments: {
    total: number;
    new_this_month: number;
    total_amount: number;
    new_amount_this_month: number;
    recent: RecentInvestment[];
    breakdown_by_series: SeriesBreakdown[];
  };
  remuneracao: {
    total_this_month: number;
    count_this_month: number;
    pendentes: {
      count: number;
      amount: number;
    };
    pagas: {
      count: number;
      amount: number;
    };
    erro: {
      count: number;
      amount: number;
    };
    breakdown: InvestorBreakdown[];
  };
  commissions: {
    total_this_month: number;
    count_this_month: number;
    by_role: {
      Master: number;
      Escritório: number;
      Assessor: number;
    };
    recent: RecentCommission[];
  };
  summary: {
    current_month: string;
    total_network_users: number;
    total_investments: number;
    total_invested_amount: number;
    total_monthly_remuneracao: number;
    total_monthly_commissions: number;
  };
}

export type ModalType = 
  | 'masters' 
  | 'escritorios' 
  | 'assessores' 
  | 'investidores' 
  | 'investments' 
  | 'remuneracao' 
  | 'commissions' 
  | null;
