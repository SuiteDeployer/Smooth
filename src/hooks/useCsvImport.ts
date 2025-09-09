import { useState } from 'react';

interface CsvImportHook {
  importFromCsv: (file: File) => Promise<void>;
  isImporting: boolean;
}

export const useCsvImport = (): CsvImportHook => {
  const [isImporting, setIsImporting] = useState(false);

  const importFromCsv = async (file: File): Promise<void> => {
    try {
      setIsImporting(true);
      
      // Validar arquivo
      if (!file.name.endsWith('.csv')) {
        throw new Error('Apenas arquivos CSV são aceitos.');
      }

      // Criar FormData para enviar arquivo
      const formData = new FormData();
      formData.append('file', file);

      // Chamar edge function de importação
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/commissions-import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: formData
      });

      const result = await response.json();
      
      if (!response.ok || result.error) {
        throw new Error(result.error?.message || 'Erro ao importar arquivo');
      }

      // Mostrar resultados da importação
      const { totalProcessed, successCount, errorCount, errors } = result.data;
      
      let message = `Importação concluída!\n`;
      message += `Total processado: ${totalProcessed}\n`;
      message += `Sucessos: ${successCount}\n`;
      message += `Erros: ${errorCount}`;
      
      if (errors && errors.length > 0) {
        message += `\n\nPrimeiros erros encontrados:\n${errors.slice(0, 3).join('\n')}`;
      }
      
      alert(message);
      
    } catch (error) {
      console.error('Erro na importação:', error);
      throw error;
    } finally {
      setIsImporting(false);
    }
  };

  return {
    importFromCsv,
    isImporting
  };
};