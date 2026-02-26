"use client"

import * as React from "react"
import { InformationCircleIcon } from "@heroicons/react/24/outline"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface InfoTooltipProps {
  title: string
  description: string
  calculation?: string
  /** Rótulo exibido acima do texto de calculation. Padrão: "Como é calculado:" */
  calculationLabel?: string
  className?: string
  iconClassName?: string
}

/**
 * Componente de tooltip informativo reutilizável para explicar métricas e cálculos
 * 
 * @param title - Título da informação
 * @param description - Descrição do que a métrica significa
 * @param calculation - (Opcional) Explicação de como o cálculo é feito
 * @param calculationLabel - (Opcional) Rótulo do bloco de calculation (padrão: "Como é calculado:")
 * @param className - Classes CSS adicionais para o container
 * @param iconClassName - Classes CSS adicionais para o ícone
 */
export function InfoTooltip({ 
  title, 
  description, 
  calculation,
  calculationLabel = "Como é calculado:",
  className,
  iconClassName 
}: InfoTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full",
              "w-7 h-7",
              "bg-surface/80 hover:bg-surface border border-border hover:border-accent/50",
              "text-accent/70 hover:text-accent",
              "shadow-sm hover:shadow-md",
              "transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1",
              "cursor-help",
              "hover:scale-110",
              className
            )}
            aria-label="Informações sobre esta métrica"
          >
            <InformationCircleIcon 
              className={cn(
                "h-6 w-6 flex-shrink-0 stroke-[1.5]",
                iconClassName
              )} 
            />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className={cn(
            "max-w-xs shadow-lg p-3 border",
            "bg-surface border-border",
            "text-text-primary",
            "[&_*]:text-text-primary [&_*]:text-text-secondary"
          )}
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)'
          }}
        >
          <div className="space-y-2">
            <div>
              <h4 className="font-semibold text-sm text-text-primary mb-1">{title}</h4>
              <p className="text-xs text-text-secondary leading-relaxed">{description}</p>
            </div>
            {calculation && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-medium text-text-primary mb-1">{calculationLabel}</p>
                <p className="text-xs text-text-secondary leading-relaxed">{calculation}</p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

