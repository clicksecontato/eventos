'use client';

import React, { useRef, useEffect } from 'react';

interface ContractPreviewProps {
  html: string;
  className?: string;
}

/**
 * Componente para renderizar preview de contratos com formatação adequada
 * Usa iframe para isolar estilos e garantir formatação correta
 */
export default function ContractPreview({ html, className = '' }: ContractPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current && html) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                * {
                  box-sizing: border-box;
                }
                body {
                  margin: 0;
                  padding: 0;
                  font-family: Arial, sans-serif;
                  font-size: 14px;
                  line-height: 1.6;
                  color: #1f2937 !important;
                  background-color: #f3f4f6 !important;
                  white-space: pre-wrap;
                }
                .page-container {
                  /* Simular página A4: 170mm de conteúdo (642px) + 20mm padding cada lado */
                  max-width: 794px;
                  margin: 20px auto;
                  padding: 75px;
                  background-color: #ffffff !important;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08);
                }
                body * {
                  color: #1f2937 !important;
                  font-family: Arial, sans-serif;
                }
                h1 {
                  font-size: 2em;
                  font-weight: bold;
                  margin-top: 1em;
                  margin-bottom: 0.5em;
                }
                h2 {
                  font-size: 1.5em;
                  font-weight: bold;
                  margin-top: 1em;
                  margin-bottom: 0.5em;
                }
                h3 {
                  font-size: 1.25em;
                  font-weight: bold;
                  margin-top: 1em;
                  margin-bottom: 0.5em;
                }
                p {
                  margin: 0.5em 0;
                }
                ul, ol {
                  padding-left: 1.5em;
                  margin: 0.5em 0;
                }
                li {
                  margin: 0.25em 0;
                }
                strong, b {
                  font-weight: bold;
                }
                hr {
                  margin: 1em 0;
                  border: none;
                  border-top: 1px solid #d1d5db;
                }
              </style>
            </head>
            <body>
              <div class="page-container">
                ${html}
              </div>
            </body>
          </html>
        `);
        doc.close();
      }
    }
  }, [html]);

  return (
    <div 
      className={`border rounded-lg bg-white shadow-sm overflow-hidden ${className}`}
      style={{ backgroundColor: '#ffffff' }}
    >
      <iframe
        ref={iframeRef}
        className="w-full border-0"
        style={{
          minHeight: '400px',
          maxHeight: '800px',
          height: 'auto',
          display: 'block',
          backgroundColor: '#ffffff'
        }}
        title="Preview do contrato"
      />
    </div>
  );
}
