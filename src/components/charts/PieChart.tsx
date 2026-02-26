'use client';

import React from 'react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChartData, ChartConfig } from '@/types/charts';

interface PieChartProps {
  data: PieChartData[];
  config?: ChartConfig;
}

const DEFAULT_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
];

export function PieChart({ data, config = {} }: PieChartProps) {
  const {
    showLegend = true,
    showValues = true,
    showPercentages = true,
    height = 200,
    width = 200,
    colors = DEFAULT_COLORS
  } = config;

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Nenhum dado disponível
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  const chartData = data.map((item, index) => ({
    name: item.label,
    value: item.value,
    fill: item.color || colors[index % colors.length],
    percentage: ((item.value / total) * 100).toFixed(1)
  }));

  const chartConfig = {
    value: {
      label: "Valor",
    },
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-foreground">{total}</div>
        <div className="text-sm text-muted-foreground">Total</div>
      </div>
      
      <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
        <RechartsPieChart>
          <ChartTooltip content={<ChartTooltipContent />} />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            strokeWidth={5}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
        </RechartsPieChart>
      </ChartContainer>

      {showLegend && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {chartData.map((item, index) => {
            const percentage = ((item.value / total) * 100).toFixed(1);
            return (
              <div key={index} className="flex items-center space-x-2">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="text-sm text-foreground flex-1">{item.name}</span>
                <div className="text-sm font-medium text-foreground">
                  {showValues && `${item.value}`}
                  {showValues && showPercentages && ' • '}
                  {showPercentages && `${percentage}%`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
