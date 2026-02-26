'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface Option {
  value: string;
  label: string;
  description?: string;
}

interface SelectWithSearchProps {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  onCreateNew?: (searchTerm: string) => void;
  placeholder?: string;
  error?: string;
  allowCreate?: boolean;
}

export default function SelectWithSearch({
  label,
  options,
  value,
  onChange,
  onCreateNew,
  placeholder = "Selecione uma opção...",
  error,
  allowCreate = false
}: SelectWithSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(option => option.value === value);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (option.description && option.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const showCreateOption = allowCreate && 
    onCreateNew && 
    searchTerm.trim() && 
    !options.some(option => option.label.toLowerCase() === searchTerm.toLowerCase());

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) return;

    const totalOptions = filteredOptions.length + (showCreateOption ? 1 : 0);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % totalOptions);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex(prev => prev <= 0 ? totalOptions - 1 : prev - 1);
        break;
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0) {
          if (highlightedIndex < filteredOptions.length) {
            const selectedOption = filteredOptions[highlightedIndex];
            onChange(selectedOption.value);
            setIsOpen(false);
            setSearchTerm('');
          } else if (showCreateOption && onCreateNew) {
            onCreateNew(searchTerm);
            setIsOpen(false);
            setSearchTerm('');
          }
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleOptionClick = (option: Option) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleCreateNew = () => {
    if (onCreateNew && searchTerm.trim()) {
      onCreateNew(searchTerm);
      setIsOpen(false);
      setSearchTerm('');
      setHighlightedIndex(-1);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-text-primary mb-1">
        {label}
      </label>
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          className={`
            w-full flex items-center justify-between px-3 py-2 border rounded-md shadow-sm bg-surface text-left cursor-pointer
            ${error ? 'form-error' : 'border-border focus:ring-primary focus:border-primary'}
            focus:outline-none focus:ring-1 transition-colors
          `}
        >
          <span className={`block truncate ${selectedOption ? 'text-text-primary' : error ? 'text-[var(--form-error-text)]' : 'text-text-muted'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDownIcon className={`h-5 w-5 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-border overflow-auto focus:outline-none" style={{ backgroundColor: 'var(--surface)' }}>
            {/* Campo de busca */}
            <div className="px-3 py-2 border-b border-border">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setHighlightedIndex(-1);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Buscar..."
                  className="w-full pl-9 pr-3 py-2 border border-border rounded-md text-sm text-text-primary bg-background focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            {/* Opções filtradas */}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  onClick={() => handleOptionClick(option)}
                  className={`
                    px-3 py-2 cursor-pointer select-none relative
                    ${highlightedIndex === index ? 'text-primary' : 'text-text-primary hover:bg-surface-hover'}
                  `}
                  style={{ backgroundColor: 'var(--surface)' }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    {option.description && (
                      <span className="text-sm text-text-muted">{option.description}</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-text-muted text-sm" style={{ backgroundColor: 'var(--surface)' }}>
                Nenhum tipo encontrado
              </div>
            )}

            {/* Opção de criar novo */}
            {showCreateOption && (
              <div
                onClick={handleCreateNew}
                className={`
                  px-3 py-2 cursor-pointer select-none relative border-t border-border
                  ${highlightedIndex === filteredOptions.length ? 'text-primary' : 'text-primary hover:bg-primary/10'}
                `}
                style={{ backgroundColor: 'var(--surface)' }}
              >
                <div className="flex items-center">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  <span className="font-medium">Criar &quot;{searchTerm}&quot;</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="form-error-text text-sm">{error}</p>
      )}
    </div>
  );
}
