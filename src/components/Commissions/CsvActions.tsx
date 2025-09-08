import React, { useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import { useCsvExport } from '../../hooks/useCsvExport';
import { useCsvImport } from '../../hooks/useCsvImport';

interface CommissionDetailed {
  id: string;
  beneficiary_name: string;
  beneficiary_pix?: string;
  pix_key_type: string;
  commission_amount: number;
  monthly_commission: number;
  paid_installments: number;
  pending_installments: number;
  payment_status: string;
  series_name: string;
  series_code: string;
  created_at: string;
  paid_at?: string;
}

interface CsvActionsProps {
  commissions: CommissionDetailed[];
  onImportComplete: () => void;
}

export const CsvActions: React.FC<CsvActionsProps> = ({ commissions, onImportComplete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { exportToCsv, isExporting } = useCsvExport();
  const { importFromCsv, isImporting } = useCsvImport();

  const handleExport = async () => {
    try {
      await exportToCsv();
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('Erro ao exportar arquivo CSV. Tente novamente.');
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await importFromCsv(file);
      onImportComplete();
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Erro ao importar CSV:', error);
      alert('Erro ao importar arquivo CSV. Verifique o formato e tente novamente.');
    }
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Download className="w-4 h-4 mr-2" />
        {isExporting ? 'Exportando...' : 'Exportar CSV'}
      </button>
      
      <button
        onClick={handleImport}
        disabled={isImporting}
        className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Upload className="w-4 h-4 mr-2" />
        {isImporting ? 'Importando...' : 'Importar CSV'}
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};