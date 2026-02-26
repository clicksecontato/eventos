import * as React from "react"
import { useId } from 'react'

import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  /** Esconde as setas de incremento/decremento em type="number" (campos monetários) */
  hideSpinner?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, helperText, id, hideSpinner, onKeyDown, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    
    // Handler para bloquear setas do teclado quando hideSpinner está ativo
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Bloquear ArrowUp e ArrowDown quando hideSpinner está ativo e type é number
      if (hideSpinner && type === "number" && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        return;
      }
      
      // Chamar handler customizado se fornecido
      if (onKeyDown) {
        onKeyDown(e);
      }
    };
    
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            error && "form-error",
            hideSpinner && type === "number" && "input-no-spinner",
            className
          )}
          ref={ref}
          onKeyDown={handleKeyDown}
          {...props}
        />
        {error && (
          <p className="form-error-text text-sm">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-muted-foreground">{helperText}</p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
