import { useState } from 'react';

interface CsvExportHook {
  exportToCsv: () => Promise<void>;
  isExporting: boolean;
}

export const useCsvExport = (): CsvExportHook => {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCsv = async () => {
    try {
      setIsExporting(true);
      
      // Chamar edge function de exportação
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-commissions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao exportar comissões');
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      // Criar e baixar o arquivo
      const csvContent = result.data.csv_content;
      const filename = result.data.file_name;
      
      // Adicionar BOM para UTF-8 (para Excel reconhecer acentos)
      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Criar link para download
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      // Mostrar estatísticas
      const { total_records, total_amount } = result.data;
      alert(`Exportação concluída!\nRegistros: ${total_records}\nValor total: R$ ${total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      alert(`Erro ao exportar arquivo CSV: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportToCsv,
    isExporting
  };
};