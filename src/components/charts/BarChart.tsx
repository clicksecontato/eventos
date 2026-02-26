'use client';

import React from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChartData, ChartConfig } from '@/types/charts';

interface BarChartProps {
  data: BarChartData[];
  config?: ChartConfig;
  orientation?: 'horizontal' | 'vertical';
}

const DEFAULT_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
];

export function BarChart({ 
  data, 
  config = {}, 
  orientation = 'horizontal' 
}: BarChartProps) {
  const {
    showValues = true,
    showPercentages = true,
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

  if (orientation === 'horizontal') {
    return (
      <ChartContainer config={chartConfig} className="h-[300px]">
        <RechartsBarChart
          data={chartData}
          layout="horizontal"
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" width={100} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="value" fill="#3B82F6" />
        </RechartsBarChart>
      </ChartContainer>
    );
  }

  // Vertical bars
  return (
    <ChartContainer config={chartConfig} className="h-[300px]">
      <RechartsBarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="#3B82F6" />
      </RechartsBarChart>
    </ChartContainer>
  );
}
