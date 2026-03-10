import React from 'react';
import { render, screen } from '@testing-library/react';
import DateRangeFilter from './DateRangeFilter';

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  )
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <label>
      {label}
      <input {...props} />
    </label>
  )
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

describe('DateRangeFilter', () => {
  it('exibe filtro rápido ativo no primeiro render', () => {
    render(
      <DateRangeFilter
        onFilterChange={vi.fn()}
        initialFilter={{
          type: 'quick',
          quickFilter: 'thisWeek',
          range: {
            startDate: new Date('2026-03-01T12:00:00'),
            endDate: new Date('2026-03-07T12:00:00')
          }
        }}
      />
    );

    expect(screen.getByRole('button', { name: /Período: Esta semana/i })).toBeInTheDocument();
  });
});

