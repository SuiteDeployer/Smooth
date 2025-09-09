import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Download,
  Upload,
  Filter,
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  X,
  FileText
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../../../contexts/AuthContext';

// Adicionar CSS para animação do modal
const modalStyles = `
@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
`;

// Injetar CSS no documento
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = modalStyles;
  if (!document.head.querySelector('style[data-modal-styles]')) {
    styleElement.setAttribute('data-modal-styles', 'true');
    document.head.appendChild(styleElement);
  }
}

interface CommissionData {
  id: string;
  investorName: string;
  investmentAmount: number;
  recipientName: string;
  recipientRole: string;
  installment: string;
  monthlyCommission: number;
  pixKeyType: string;
  pixKey: string;
  dueDate: string;
  status: string;
  paymentDate: string | null;
  paymentId: string | null;
}

interface MetricCard {
  title: string;
  value: string;
  change: string;
  icon: React.ElementType;
  trend: 'up' | 'down' | 'stable';
  color: string;
}

const CommissionsDashboard: React.FC = () => {
  console.log('🚀🚀🚀 COMMISSIONS DASHBOARD CARREGADO - VERSÃO CORRIGIDA!');
  console.log('🔥 Este é o arquivo correto com o botão Importar PIX!');
  
  const [commissions, setCommissions] = useState<CommissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const { user } = useAuth();
  
  console.log('📝 Estado do modal:', showImportModal);

  // Buscar dados das comissões
  const fetchCommissions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('https://cisoewbdzdxombthxqfi.supabase.co/functions/v1/commissions-data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpc29ld2JkemR4b21idGh4cWZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NDc2NzMsImV4cCI6MjA2OTIyMzY3M30.lNvYVe8ilP-Ak0AsSv80JkLyMm_HM3rfD31EUlQF-fQ',
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar dados das comissões');
      }

      const result = await response.json();
      setCommissions(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Exportar CSV
  const handleExport = async () => {
    console.log('🚀 BOTÃO EXPORTAR CLICADO!');
    try {
      setExportLoading(true);
      console.log('✅ Export loading setado para true');
      
      // Usar mês e ano atual como padrão
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1; // Janeiro = 1
      const year = currentDate.getFullYear();
      console.log('📅 Mês/Ano para exportação:', month, year);
      
      console.log('🌐 Iniciando chamada para API...');
      const response = await fetch('https://cisoewbdzdxombthxqfi.supabase.co/functions/v1/export-commissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpc29ld2JkemR4b21idGh4cWZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NDc2NzMsImV4cCI6MjA2OTIyMzY3M30.lNvYVe8ilP-Ak0AsSv80JkLyMm_HM3rfD31EUlQF-fQ',
        },
        body: JSON.stringify({
          month: month,
          year: year
        })
      });

      console.log('📡 Resposta recebida, status:', response.status);
      
      if (!response.ok) {
        console.log('❌ Resposta não OK, processando erro...');
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error?.message || 'Erro ao exportar dados';
        console.log('🚨 Erro na exportação:', errorMessage);
        throw new Error(errorMessage);
      }

      console.log('✅ Resposta OK, processando dados...');
      const result = await response.json();
      console.log('📋 Dados recebidos:', !!result.data, !!result.data?.csv_content);
      
      // Verificar se a resposta contém os dados esperados
      if (!result.data || !result.data.csv_content) {
        console.log('❌ Dados de exportação inválidos');
        throw new Error('Dados de exportação inválidos');
      }
      
      // Criar blob com o conteúdo CSV
      const blob = new Blob([result.data.csv_content], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.data.file_name || `comissoes_${month.toString().padStart(2, '0')}_${year}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      // Toast de sucesso com estatísticas
      const { total_records, total_amount } = result.data;
      alert(`Exportação concluída!\n${total_records} registros exportados\nTotal: R$ ${total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    } catch (err) {
      console.error('Erro na exportação:', err);
      alert('Erro ao exportar: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setExportLoading(false);
    }
  };

  // Importar CSV
  const handleImport = async () => {
    if (!selectedFile) {
      alert('Selecione um arquivo CSV primeiro.');
      return;
    }

    try {
      setImporting(true);
      
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('https://cisoewbdzdxombthxqfi.supabase.co/functions/v1/commissions-import', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpc29ld2JkemR4b21idGh4cWZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NDc2NzMsImV4cCI6MjA2OTIyMzY3M30.lNvYVe8ilP-Ak0AsSv80JkLyMm_HM3rfD31EUlQF-fQ',
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Erro ao importar arquivo');
      }

      const { successCount, errorCount, errors } = result.data;
      let message = `Importação finalizada!\n${successCount} registros atualizados com sucesso.`;
      
      if (errorCount > 0) {
        message += `\n${errorCount} registros com erro.`;
        if (errors && errors.length > 0) {
          message += '\n\nPrimeiros erros:\n' + errors.slice(0, 3).join('\n');
        }
      }
      
      alert(message);
      
      // Recarregar dados
      fetchCommissions();
      
      // Fechar modal
      setShowImportModal(false);
      setSelectedFile(null);
      
    } catch (err) {
      alert('Erro ao importar: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setImporting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PAGO':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'PENDENTE':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'ERRO':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PAGO':
        return 'Pago';
      case 'PENDENTE':
        return 'Pendente';
      case 'ERRO':
        return 'Erro';
      default:
        return 'Pendente';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusUpper = status.toUpperCase();
    switch (statusUpper) {
      case 'PAGO':
        return 'bg-green-100 text-green-800';
      case 'PENDENTE':
        return 'bg-yellow-100 text-yellow-800';
      case 'ERRO':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredCommissions = commissions.filter(commission => {
    if (filter !== 'all' && commission.status.toUpperCase() !== filter.toUpperCase()) return false;
    if (searchTerm && 
        !commission.investorName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !commission.recipientName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Calcular métricas básicas
  const totalMonth = commissions
    .filter(c => new Date(c.dueDate).getMonth() === new Date().getMonth())
    .reduce((sum, c) => sum + c.monthlyCommission, 0);
    
  const pendingTotal = commissions
    .filter(c => c.status.toUpperCase() === 'PENDENTE')
    .reduce((sum, c) => sum + c.monthlyCommission, 0);
    
  const activeRecipients = new Set(commissions.map(c => c.recipientName)).size;

  const metricsCards: MetricCard[] = [
    {
      title: 'Total de Comissões do Mês',
      value: `R$ ${totalMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      change: 'Atual',
      icon: DollarSign,
      trend: 'up',
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      title: 'Comissões Pendentes',
      value: `R$ ${pendingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      change: `${commissions.filter(c => c.status.toUpperCase() === 'PENDENTE').length} transações`,
      icon: Clock,
      trend: 'stable',
      color: 'from-amber-500 to-amber-600'
    },
    {
      title: 'Beneficiários Ativos',
      value: `${activeRecipients}`,
      change: 'Total cadastrado',
      icon: Users,
      trend: 'stable',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Total de Registros',
      value: `${commissions.length}`,
      change: 'Todas as parcelas',
      icon: FileText,
      trend: 'stable',
      color: 'from-purple-500 to-purple-600'
    }
  ];

  useEffect(() => {
    fetchCommissions();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar dados</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchCommissions}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7F6' }}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b" style={{ borderColor: '#CAD3C8' }}>
        <div className="max-w-7xl mx-auto px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold" style={{ color: '#0A3D62', fontFamily: 'Inter' }}>
                  Dashboard de Comissões
                </h1>
                <p className="mt-1 text-sm" style={{ color: '#718093' }}>
                  Visão geral do desempenho e transações de comissões
                </p>
              </div>
              <div className="flex space-x-3">
                {/* Botão Atualizar */}
                <button 
                  onClick={fetchCommissions}
                  className="inline-flex items-center px-4 py-2 border rounded-lg text-sm font-semibold transition-colors hover:bg-gray-50"
                  style={{ 
                    borderColor: '#0A3D62', 
                    color: '#0A3D62',
                    backgroundColor: 'transparent'
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </button>
                
                {/* Botão Exportar */}
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔥 Clique no botão Exportar detectado!', e);
                    handleExport();
                  }}
                  disabled={exportLoading}
                  className="inline-flex items-center px-4 py-2 border rounded-lg text-sm font-semibold transition-colors hover:bg-gray-50 disabled:opacity-50"
                  style={{ 
                    borderColor: '#0A3D62', 
                    color: '#0A3D62',
                    backgroundColor: 'transparent'
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exportLoading ? 'Exportando...' : 'Exportar'}
                </button>
              </div>
              
              {/* Botão Importar PIX - Separado para garantir visibilidade */}
              <div className="mt-3">
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('📤 IMPORTANTE: Clique no botão Importar PIX detectado!', e);
                    console.log('📝 Estado atual do modal:', showImportModal);
                    alert('🚀 Botão Importar PIX foi clicado! Abrindo modal...');
                    setShowImportModal(true);
                    console.log('✅ Modal de importação deve abrir agora!');
                  }}
                  type="button"
                  className="inline-flex items-center px-6 py-3 rounded-lg text-sm font-bold text-white transition-all duration-200 transform hover:scale-105 shadow-lg"
                  style={{ 
                    backgroundColor: '#007BFF',
                    border: '2px solid #007BFF',
                    cursor: 'pointer',
                    zIndex: 1000,
                    boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Upload 
                    className="h-5 w-5 mr-2" 
                    style={{ color: 'white' }}
                  />
                  📤 IMPORTAR PIX
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metricsCards.map((metric, index) => {
            const IconComponent = metric.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow duration-200" style={{ borderColor: '#CAD3C8' }}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1" style={{ color: '#718093' }}>{metric.title}</p>
                    <p className="text-2xl font-bold mb-1" style={{ color: '#2F3640' }}>{metric.value}</p>
                    <p className="text-xs" style={{ color: '#718093' }}>
                      {metric.change}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${metric.color} flex-shrink-0`}>
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow-sm border" style={{ borderColor: '#CAD3C8' }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: '#CAD3C8' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: '#2F3640' }}>Transações de Comissões</h2>
              <div className="flex items-center space-x-4">
                {/* Search */}
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: '#718093' }} />
                  <input
                    type="text"
                    placeholder="Buscar por investidor ou beneficiário..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{ 
                      borderColor: '#CAD3C8'
                    }}
                  />
                </div>
                
                {/* Filter */}
                <div className="relative">
                  <Filter className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" style={{ color: '#718093' }} />
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="appearance-none bg-white border rounded-lg pl-10 px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{ 
                      borderColor: '#CAD3C8'
                    }}
                  >
                    <option value="all">Todos os status</option>
                    <option value="PENDENTE">Pendentes</option>
                    <option value="PAGO">Pagos</option>
                    <option value="ERRO">Erro</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead style={{ backgroundColor: '#F4F7F6' }}>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#2F3640' }}>
                    Investidor
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#2F3640' }}>
                    Valor Inv.
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#2F3640' }}>
                    Destinatário
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#2F3640' }}>
                    Parc.
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#2F3640' }}>
                    Comissão
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#2F3640' }}>
                    Tipo PIX
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#2F3640' }}>
                    Chave PIX
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#2F3640' }}>
                    Venc.
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#2F3640' }}>
                    Status
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#2F3640' }}>
                    Data Paga
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y" style={{ borderColor: '#CAD3C8' }}>
                {filteredCommissions.length > 0 ? (
                  filteredCommissions.map((commission, index) => (
                    <tr key={commission.id} className={`hover:bg-gray-50 ${index % 2 === 1 ? 'bg-gray-25' : ''}`}>
                      <td className="px-3 py-3 max-w-32">
                        <div className="text-xs font-medium truncate" style={{ color: '#2F3640' }} title={commission.investorName}>
                          {commission.investorName}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-xs font-medium" style={{ color: '#2F3640' }}>
                          R$ {commission.investmentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        </span>
                      </td>
                      <td className="px-3 py-3 max-w-28">
                        <div>
                          <div className="text-xs font-medium truncate" style={{ color: '#2F3640' }} title={commission.recipientName}>
                            {commission.recipientName}
                          </div>
                          <div className="text-xs text-gray-500">{commission.recipientRole}</div>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-xs" style={{ color: '#2F3640' }}>
                        {commission.installment}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-xs font-medium" style={{ color: '#2F3640' }}>
                          R$ {commission.monthlyCommission.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-xs" style={{ color: '#2F3640' }}>
                        {commission.pixKeyType}
                      </td>
                      <td className="px-2 py-3 max-w-24">
                        <div className="text-xs font-mono truncate" style={{ color: '#2F3640' }} title={commission.pixKey}>
                          {commission.pixKey}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-xs" style={{ color: '#2F3640' }}>
                        {new Date(commission.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center">
                          {getStatusIcon(commission.status)}
                          <span className={`ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getStatusBadge(commission.status)}`}>
                            {getStatusText(commission.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-xs" style={{ color: '#2F3640' }}>
                        {commission.paymentDate ? new Date(commission.paymentDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-sm" style={{ color: '#718093' }}>
                      Nenhuma transação encontrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Import Modal - Enhanced Visibility */}
      {showImportModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 9999,
            backdropFilter: 'blur(2px)'
          }}
          onClick={(e) => {
            console.log('🔘 Clique no overlay do modal detectado');
            if (e.target === e.currentTarget) {
              setShowImportModal(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 transform transition-all"
            style={{
              maxHeight: '90vh',
              border: '2px solid #007BFF',
              animation: 'fadeInScale 0.2s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">
                📤 Importar Comissões
              </h3>
              <button 
                onClick={() => {
                  console.log('❌ Fechando modal de importação');
                  setShowImportModal(false);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                type="button"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6">
              <div className="mb-6">
                <p className="text-sm mb-4 text-gray-600">
                  Selecione um arquivo CSV com as atualizações de status dos pagamentos PIX.
                </p>
                
                <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                  <Upload className="mx-auto h-8 w-8 text-blue-400 mb-2" />
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        console.log('📁 Arquivo selecionado:', file?.name);
                        setSelectedFile(file);
                      }}
                      className="hidden"
                    />
                    <span className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Clique aqui para selecionar arquivo
                    </span>
                  </label>
                </div>
                
                {selectedFile && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">
                      ✅ Arquivo selecionado: {selectedFile.name}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Tamanho: {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  console.log('❌ Cancelando importação');
                  setShowImportModal(false);
                  setSelectedFile(null);
                }}
                type="button"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={(e) => {
                  console.log('✅ Confirmando importação');
                  handleImport();
                }}
                disabled={!selectedFile || importing}
                type="button"
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#007BFF' }}
              >
                {importing ? (
                  <>
                    ⏳ Importando...
                  </>
                ) : (
                  '✅ Confirmar Importação'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionsDashboard;