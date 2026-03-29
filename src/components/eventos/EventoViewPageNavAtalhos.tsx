'use client';

import { Button } from '@/components/ui/button';

const OFFSET_SCROLL = 120;

function rolarPara(id: string) {
  const element = document.getElementById(id);
  if (element) {
    const elementPosition = element.offsetTop - OFFSET_SCROLL;
    window.scrollTo({ top: elementPosition, behavior: 'smooth' });
  }
}

/** Submenu fixo com âncoras para secções da página de detalhe do evento. */
export function EventoViewPageNavAtalhos() {
  return (
    <div className="sticky top-16 z-30 rounded-lg border border-border bg-surface/95 p-4 shadow-sm backdrop-blur-sm">
      <div className="relative -mx-4 px-4 md:mx-0 md:px-0">
        <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-6 bg-gradient-to-r from-surface via-surface/80 to-transparent md:hidden" />
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-6 bg-gradient-to-l from-surface via-surface/80 to-transparent md:hidden" />

        <div className="scrollbar-hidden flex flex-nowrap gap-2 overflow-x-auto md:flex-wrap md:overflow-x-visible">
          {(
            [
              ['basico', 'BÁSICO'],
              ['pagamentos', 'PAGAMENTOS'],
              ['custos', 'CUSTOS'],
              ['servicos', 'SERVIÇOS'],
              ['anexos', 'ANEXOS'],
              ['contratos', 'CONTRATOS'],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              variant="outline"
              size="sm"
              type="button"
              onClick={() => rolarPara(id)}
              className="flex-shrink-0 whitespace-nowrap text-text-primary hover:bg-surface-hover"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
