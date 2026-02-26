// Tipos base para dados de gráficos
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  percentage?: number;
}

export interface ChartConfig {
  title?: string;
  subtitle?: string;
  showLegend?: boolean;
  showValues?: boolean;
  showPercentages?: boolean;
  height?: number;
  width?: number;
  colors?: string[];
}

// Tipos específicos para cada tipo de gráfico
export type PieChartData = ChartDataPoint;

export type BarChartData = ChartDataPoint;

export interface LineChartData {
  label: string;
  data: Array<{
    x: string | number;
    y: number;
  }>;
  color?: string;
}

export interface AreaChartData {
  label: string;
  data: Array<{
    x: string | number;
    y: number;
  }>;
  color?: string;
}

export interface ScatterChartData {
  label: string;
  data: Array<{
    x: number;
    y: number;
    label?: string;
  }>;
  color?: string;
}

// Tipos para componentes de visualização
export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  tooltip?: {
    title: string;
    description: string;
    calculation?: string;
  };
}

export interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  color?: string;
  showValue?: boolean;
  showPercentage?: boolean;
}

export interface TabbedChartProps {
  title: string;
  subtitle?: string;
  tabs: Array<{
    id: string;
    label: string;
    icon?: string;
    content: React.ReactNode;
  }>;
  defaultTab?: string;
  titleTooltip?: {
    title: string;
    description: string;
    calculation?: string;
  };
}

// Tipos para configurações de tema
export interface ChartTheme {
  colors: {
    primary: string[];
    success: string[];
    warning: string[];
    error: string[];
    info: string[];
    neutral: string[];
  };
  fonts: {
    title: string;
    body: string;
    numbers: string;
  };
  spacing: {
    small: number;
    medium: number;
    large: number;
  };
}

// Tipos para exportação
export interface ChartExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'csv';
  filename?: string;
  includeLegend?: boolean;
  includeTitle?: boolean;
}
