import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Filter, X, SortAsc, SortDesc } from 'lucide-react'

interface InvestmentFilters {
  investorName?: string
  seriesId?: string
  status?: string
  minValue?: number
  maxValue?: number
  startDate?: string
  endDate?: string
  sortBy?: 'created_at' | 'invested_amount' | 'maturity_date' | 'investor_name'
  sortOrder?: 'asc' | 'desc'
}

interface Props {
  filters: InvestmentFilters
  onFiltersChange: (filters: Partial<InvestmentFilters>) => void
  onClearFilters: () => void
  availableSeries: any[]
  totalCount: number
  filteredCount: number
}

export function InvestmentFilters({ 
  filters, 
  onFiltersChange, 
  onClearFilters, 
  availableSeries,
  totalCount,
  filteredCount 
}: Props) {
  
  const statusOptions = [
    { value: 'active', label: 'Ativo' },
    { value: 'canceled', label: 'Cancelado' }
  ]

  const sortOptions = [
    { value: 'created_at', label: 'Data de Criação' },
    { value: 'invested_amount', label: 'Valor Investido' },
    { value: 'maturity_date', label: 'Data de Vencimento' },
    { value: 'investor_name', label: 'Nome do Investidor' }
  ]

  const hasActiveFilters = Object.keys(filters).length > 0

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Busca
            {hasActiveFilters && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {Object.keys(filters).length} ativo{Object.keys(filters).length > 1 ? 's' : ''}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {filteredCount} de {totalCount} investimentos
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Linha 1: Busca por Nome e Botão Limpar */}
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="investor-search">Nome Investidor</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="investor-search"
                placeholder="Nome ou email do investidor..."
                value={filters.investorName || ''}
                onChange={(e) => onFiltersChange({ investorName: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>
          
          {hasActiveFilters && (
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className="h-10"
              >
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            </div>
          )}
        </div>

        {/* Linha 2: Série e Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="series-filter">Série</Label>
            <Select
              value={filters.seriesId || ''}
              onValueChange={(value) => onFiltersChange({ seriesId: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as séries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as séries</SelectItem>
                {availableSeries.map((series) => (
                  <SelectItem key={series.id} value={series.id}>
                    {series.series_code} - {series.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="status-filter">Status</Label>
            <Select
              value={filters.status || ''}
              onValueChange={(value) => onFiltersChange({ status: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os status</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Linha 3: Valores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="min-value">Valor Mínimo (R$)</Label>
            <Input
              id="min-value"
              type="number"
              placeholder="0,00"
              value={filters.minValue || ''}
              onChange={(e) => onFiltersChange({ minValue: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>

          <div>
            <Label htmlFor="max-value">Valor Máximo (R$)</Label>
            <Input
              id="max-value"
              type="number"
              placeholder="999.999,99"
              value={filters.maxValue || ''}
              onChange={(e) => onFiltersChange({ maxValue: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
        </div>

        {/* Linha 4: Data do Investimento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start-date">Data do Investimento - Inicial</Label>
            <Input
              id="start-date"
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => onFiltersChange({ startDate: e.target.value || undefined })}
            />
          </div>

          <div>
            <Label htmlFor="end-date">Data do Investimento - Final</Label>
            <Input
              id="end-date"
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => onFiltersChange({ endDate: e.target.value || undefined })}
            />
          </div>
        </div>

        {/* Linha 5: Ordenação */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sort-by">Ordenar por</Label>
            <Select
              value={filters.sortBy || 'created_at'}
              onValueChange={(value) => onFiltersChange({ sortBy: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="sort-order">Ordem</Label>
            <div className="flex gap-2">
              <Button
                variant={filters.sortOrder === 'asc' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onFiltersChange({ sortOrder: 'asc' })}
                className="flex-1"
              >
                <SortAsc className="h-4 w-4 mr-2" />
                Crescente
              </Button>
              <Button
                variant={filters.sortOrder === 'desc' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onFiltersChange({ sortOrder: 'desc' })}
                className="flex-1"
              >
                <SortDesc className="h-4 w-4 mr-2" />
                Decrescente
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
