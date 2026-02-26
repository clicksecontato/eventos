'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { StatCardProps } from '@/types/charts';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { 
  ArrowUpIcon, 
  ArrowDownIcon
} from '@heroicons/react/24/outline';

const colorClasses = {
  primary: 'bg-blue-100 text-blue-600',
  success: 'bg-green-100 text-green-600',
  warning: 'bg-yellow-100 text-yellow-600',
  error: 'bg-red-100 text-red-600',
  info: 'bg-cyan-100 text-cyan-600'
};

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  color = 'primary',
  tooltip
}: StatCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString('pt-BR');
    }
    return val;
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center">
          {Icon && (
            <div className={`flex-shrink-0 rounded-md p-3 ${colorClasses[color]}`}>
              <Icon className="h-6 w-6" />
            </div>
          )}
          <div className={`${Icon ? 'ml-4' : ''} flex-1`}>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-text-secondary">{title}</p>
              {tooltip && (
                <InfoTooltip
                  title={tooltip.title}
                  description={tooltip.description}
                  calculation={tooltip.calculation}
                  className="flex-shrink-0"
                  iconClassName="h-6 w-6"
                />
              )}
            </div>
            <p className="text-2xl font-semibold text-text-primary">
              {formatValue(value)}
            </p>
            {subtitle && (
              <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className={`flex items-center mt-2 text-sm ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.isPositive ? (
                  <ArrowUpIcon className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4 mr-1" />
                )}
                <span className="font-medium">
                  {Math.abs(trend.value)}%
                </span>
                <span className="text-text-secondary ml-1">vs período anterior</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {children}
    </div>
  );
}
