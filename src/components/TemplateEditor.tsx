'use client';

import React, { useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';

interface VariavelDisponivel {
  chave: string;
  label: string;
  tipo: 'unica' | 'multipla';
  categoria: 'configuracao' | 'customizada' | 'evento';
}

interface TemplateEditorProps {
  value: string;
  onChange: (html: string) => void;
  variaveisDisponiveis: VariavelDisponivel[];
  placeholder?: string;
  className?: string;
}

export interface TemplateEditorRef {
  inserirVariavel: (variavel: VariavelDisponivel) => void;
}

/**
 * Editor WYSIWYG para templates de contrato
 * Permite formatação visual e inserção de variáveis
 */
const TemplateEditor = forwardRef<TemplateEditorRef, TemplateEditorProps>(({
  value,
  onChange,
  variaveisDisponiveis,
  placeholder = 'Digite seu template aqui...',
  className = ''
}, ref) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
    ],
    content: mounted ? value : '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[400px] contract-editor-content',
        style: 'color: #1f2937; background-color: #ffffff;',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  }, [mounted]);

  // Atualizar conteúdo quando value mudar externamente (apenas após montagem)
  useEffect(() => {
    if (mounted && editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor, mounted]);

  const inserirVariavel = useCallback((variavel: VariavelDisponivel) => {
    if (!editor) return;

    const placeholder = variavel.tipo === 'unica' 
      ? `{{${variavel.chave}}}`
      : `[${variavel.chave}]`;

    // Inserir no cursor atual ou no final (como texto simples)
    editor.chain().focus().insertContent(placeholder).run();
  }, [editor]);

  // Expor método para uso externo via ref
  useImperativeHandle(ref, () => ({
    inserirVariavel
  }), [inserirVariavel]);

  if (!mounted || !editor) {
    return (
      <div className={`border rounded-lg p-4 min-h-[400px] bg-white ${className}`} style={{ backgroundColor: '#ffffff', color: '#1f2937' }}>
        <p className="text-text-secondary" style={{ color: '#1f2937' }}>Carregando editor...</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Barra de ferramentas */}
      <div className="border rounded-t-lg bg-gray-50 p-2 flex flex-wrap gap-1" style={{ backgroundColor: '#f9fafb' }}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive('bold')
              ? 'bg-primary text-white'
              : 'bg-white hover:bg-gray-100'
          }`}
          style={{
            backgroundColor: editor.isActive('bold') ? undefined : '#ffffff',
            color: editor.isActive('bold') ? undefined : '#1f2937',
            border: '1px solid #e5e7eb'
          }}
          title="Negrito"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive('italic')
              ? 'bg-primary text-white'
              : 'bg-white hover:bg-gray-100'
          }`}
          style={{
            backgroundColor: editor.isActive('italic') ? undefined : '#ffffff',
            color: editor.isActive('italic') ? undefined : '#1f2937',
            border: '1px solid #e5e7eb'
          }}
          title="Itálico"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive('underline')
              ? 'bg-primary text-white'
              : 'bg-white hover:bg-gray-100'
          }`}
          style={{
            backgroundColor: editor.isActive('underline') ? undefined : '#ffffff',
            color: editor.isActive('underline') ? undefined : '#1f2937',
            border: '1px solid #e5e7eb'
          }}
          title="Sublinhado"
        >
          <u>S</u>
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" style={{ backgroundColor: '#d1d5db' }} />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive('heading', { level: 1 })
              ? 'bg-primary text-white'
              : 'bg-white hover:bg-gray-100'
          }`}
          style={{
            backgroundColor: editor.isActive('heading', { level: 1 }) ? undefined : '#ffffff',
            color: editor.isActive('heading', { level: 1 }) ? undefined : '#1f2937',
            border: '1px solid #e5e7eb'
          }}
          title="Título 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-primary text-white'
              : 'bg-white hover:bg-gray-100'
          }`}
          style={{
            backgroundColor: editor.isActive('heading', { level: 2 }) ? undefined : '#ffffff',
            color: editor.isActive('heading', { level: 2 }) ? undefined : '#1f2937',
            border: '1px solid #e5e7eb'
          }}
          title="Título 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-primary text-white'
              : 'bg-white hover:bg-gray-100'
          }`}
          style={{
            backgroundColor: editor.isActive('heading', { level: 3 }) ? undefined : '#ffffff',
            color: editor.isActive('heading', { level: 3 }) ? undefined : '#1f2937',
            border: '1px solid #e5e7eb'
          }}
          title="Título 3"
        >
          H3
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" style={{ backgroundColor: '#d1d5db' }} />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive('bulletList')
              ? 'bg-primary text-white'
              : 'bg-white hover:bg-gray-100'
          }`}
          style={{
            backgroundColor: editor.isActive('bulletList') ? undefined : '#ffffff',
            color: editor.isActive('bulletList') ? undefined : '#1f2937',
            border: '1px solid #e5e7eb'
          }}
          title="Lista com marcadores"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive('orderedList')
              ? 'bg-primary text-white'
              : 'bg-white hover:bg-gray-100'
          }`}
          style={{
            backgroundColor: editor.isActive('orderedList') ? undefined : '#ffffff',
            color: editor.isActive('orderedList') ? undefined : '#1f2937',
            border: '1px solid #e5e7eb'
          }}
          title="Lista numerada"
        >
          1.
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" style={{ backgroundColor: '#d1d5db' }} />
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="px-3 py-1 rounded text-sm font-medium bg-white hover:bg-gray-100 transition-colors"
          style={{
            backgroundColor: '#ffffff',
            color: '#1f2937',
            border: '1px solid #e5e7eb'
          }}
          title="Linha horizontal"
        >
          ─
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="px-3 py-1 rounded text-sm font-medium bg-white hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: '#ffffff',
            color: '#1f2937',
            border: '1px solid #e5e7eb'
          }}
          title="Desfazer"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="px-3 py-1 rounded text-sm font-medium bg-white hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: '#ffffff',
            color: '#1f2937',
            border: '1px solid #e5e7eb'
          }}
          title="Refazer"
        >
          ↷
        </button>
      </div>

      {/* Editor */}
      <div 
        className="border border-t-0 rounded-b-lg bg-white min-h-[400px] max-h-[600px] overflow-y-auto tiptap-editor-container"
        style={{ backgroundColor: '#ffffff', color: '#1f2937' }}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Botões de variáveis rápidas */}
      {variaveisDisponiveis.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-text-secondary self-center">Inserir campo:</span>
          {variaveisDisponiveis.slice(0, 5).map((v) => (
            <button
              key={v.chave}
              type="button"
              onClick={() => inserirVariavel(v)}
              className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
              style={{
                color: '#1f2937',
                backgroundColor: '#f3f4f6'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              title={`Inserir campo ${v.chave}`}
            >
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                v.tipo === 'unica'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {v.label || v.chave.replace(/_/g, ' ')}
              </span>
            </button>
          ))}
          {variaveisDisponiveis.length > 5 && (
            <span className="text-text-secondary self-center">
              +{variaveisDisponiveis.length - 5} mais na sidebar
            </span>
          )}
        </div>
      )}
    </div>
  );
});

TemplateEditor.displayName = 'TemplateEditor';

export default TemplateEditor;
