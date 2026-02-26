'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CalendarIcon, 
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { format, startOfDay, endOfDay, subDays, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export interface DateFilter {
  type: 'custom' | 'quick';
  range: DateRange;
  quickFilter?: string;
}

interface DateRangeFilterProps {
  onFilterChange: (filter: DateFilter | null) => void;
  className?: string;
}

const QUICK_FILTERS: { key: string; label: string; description?: string }[] = [
  { key: 'today', label: 'Hoje', description: 'Eventos do dia' },
  { key: 'thisWeek', label: 'Esta semana', description: 'Seg - Dom' },
  { key: 'thisYear', label: 'Este Ano', description: 'Eventos do ano atual' },
  { key: 'next30Days', label: 'Próximos 30 dias', description: 'Agenda do mês' },
  { key: 'thisMonth', label: 'Este mês', description: '1º ao último dia' },
  { key: 'lastMonth', label: 'Mês passado', description: 'Histórico recente' },
];

export default function DateRangeFilter({ onFilterChange, className = '' }: DateRangeFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterType, setFilterType] = useState<'custom' | 'quick'>('quick');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string>('');
  const [isFilterActive, setIsFilterActive] = useState(false);

  const getQuickFilterRange = (filterKey: string): DateRange => {
    const now = new Date();
    
    switch (filterKey) {
      case 'today':
        return {
          startDate: startOfDay(now),
          endDate: endOfDay(now)
        };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return {
          startDate: startOfDay(yesterday),
          endDate: endOfDay(yesterday)
        };
      case 'tomorrow':
        const tomorrow = subDays(now, -1);
        return {
          startDate: startOfDay(tomorrow),
          endDate: endOfDay(tomorrow)
        };
      case 'thisWeek':
        return {
          startDate: startOfWeek(now, { locale: ptBR }),
          endDate: endOfWeek(now, { locale: ptBR })
        };
      case 'thisYear':
        // Filtro "Este Ano" - mostra eventos do ano atual (1º de janeiro a 31 de dezembro)
        return {
          startDate: startOfYear(now),
          endDate: endOfYear(now)
        };
      case 'next30Days':
        return {
          startDate: startOfDay(now),
          endDate: endOfDay(addDays(now, 30))
        };
      case 'lastWeek':
        const lastWeek = subWeeks(now, 1);
        return {
          startDate: startOfWeek(lastWeek, { locale: ptBR }),
          endDate: endOfWeek(lastWeek, { locale: ptBR })
        };
      case 'thisMonth':
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now)
        };
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        return {
          startDate: startOfMonth(lastMonth),
          endDate: endOfMonth(lastMonth)
        };
      case 'last7Days':
        return {
          startDate: startOfDay(subDays(now, 7)),
          endDate: endOfDay(now)
        };
      case 'last30Days':
        return {
          startDate: startOfDay(subDays(now, 30)),
          endDate: endOfDay(now)
        };
      case 'last90Days':
        return {
          startDate: startOfDay(subDays(now, 90)),
          endDate: endOfDay(now)
        };
      default:
        return { startDate: null, endDate: null };
    }
  };

  const handleQuickFilterSelect = (filterKey: string) => {
    setSelectedQuickFilter(filterKey);
    setFilterType('quick');
    const range = getQuickFilterRange(filterKey);
    setIsFilterActive(true);
    onFilterChange({
      type: 'quick',
      range,
      quickFilter: filterKey
    });
  };

  const handleCustomFilterApply = () => {
    if (customStartDate && customEndDate) {
      const startDate = parseISO(customStartDate);
      const endDate = parseISO(customEndDate);
      
      if (startDate <= endDate) {
        setFilterType('custom');
        setIsFilterActive(true);
        onFilterChange({
          type: 'custom',
          range: { startDate, endDate }
        });
      }
    }
  };

  const clearFilter = () => {
    setSelectedQuickFilter('');
    setCustomStartDate('');
    setCustomEndDate('');
    setIsFilterActive(false);
    onFilterChange(null);
  };

  const getActiveFilterLabel = () => {
    if (!isFilterActive) return 'Filtrar por período';
    
    if (filterType === 'quick' && selectedQuickFilter) {
      const filter = QUICK_FILTERS.find(f => f.key === selectedQuickFilter);
      return filter ? `Período: ${filter.label}` : 'Filtro ativo';
    }
    
    if (filterType === 'custom' && customStartDate && customEndDate) {
      const start = format(parseISO(customStartDate), 'dd/MM/yyyy', { locale: ptBR });
      const end = format(parseISO(customEndDate), 'dd/MM/yyyy', { locale: ptBR });
      return `Período: ${start} - ${end}`;
    }
    
    return 'Filtro ativo';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Botão Principal */}
      <Button
        variant="outline"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full justify-between ${isFilterActive ? 'bg-primary/10 border-primary text-primary' : ''}`}
      >
        <div className="flex items-center">
          <FunnelIcon className="h-4 w-4 mr-2" />
          {getActiveFilterLabel()}
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="h-4 w-4" />
        ) : (
          <ChevronDownIcon className="h-4 w-4" />
        )}
      </Button>

      {/* Painel Expandido */}
      {isExpanded && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2" />
              Filtros por Período
            </CardTitle>
            <CardDescription>
              Escolha um período rápido ou defina um período personalizado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filtros Rápidos */}
            <div>
              <h4 className="text-sm font-medium text-text-primary mb-3">
                Filtros rápidos essenciais
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {QUICK_FILTERS.map((filter) => (
                  <Button
                    key={filter.key}
                    variant={selectedQuickFilter === filter.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleQuickFilterSelect(filter.key)}
                    className={`w-full justify-start text-left h-auto py-3 px-4 flex-col items-start gap-1 border transition-all ${
                      selectedQuickFilter === filter.key
                        ? 'bg-primary text-primary-foreground border-primary shadow-md'
                        : 'bg-background text-text-primary border-border hover:bg-primary/5'
                    }`}
                  >
                    <span className="text-sm font-semibold leading-tight">{filter.label}</span>
                    {filter.description && (
                      <span className={`text-xs leading-tight ${
                        selectedQuickFilter === filter.key ? 'text-primary-foreground/80' : 'text-text-secondary'
                      }`}>
                        {filter.description}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {/* Separador */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-text-primary mb-3">
                Período Personalizado
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Data Inicial"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
                <Input
                  label="Data Final"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  onClick={handleCustomFilterApply}
                  disabled={!customStartDate || !customEndDate}
                  size="sm"
                >
                  Aplicar Período
                </Button>
              </div>
            </div>

            {/* Botões de Ação */}
            {isFilterActive && (
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">
                    {filterType === 'quick' ? 'Filtro rápido ativo' : 'Filtro personalizado ativo'}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilter}
                    className="text-error hover:text-error/80"
                  >
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    Limpar Filtro
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Função utilitária para verificar se uma data está dentro do filtro
export const isDateInFilter = (date: Date, filter: DateFilter | null): boolean => {
  if (!filter || !filter.range.startDate || !filter.range.endDate) {
    return true;
  }
  
  // Normalizar as datas para comparação apenas de dia/mês/ano
  const eventDate = startOfDay(date);
  const startDate = startOfDay(filter.range.startDate);
  const endDate = endOfDay(filter.range.endDate);
  
  return isWithinInterval(eventDate, {
    start: startDate,
    end: endDate
  });
};
