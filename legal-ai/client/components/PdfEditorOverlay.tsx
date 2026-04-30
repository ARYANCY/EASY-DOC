'use client';

import React, { useRef, useEffect } from 'react';

export interface TextBlock {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  font_size: number;
  font_name?: string;
  editedText?: string;
}

interface PdfEditorOverlayProps {
  blocks: TextBlock[];
  scale: number;
  onBlockEdit: (index: number, newText: string) => void;
  containerWidth: number;
  containerHeight: number;
}

import { Loader2 } from 'lucide-react';

const EditableBlock = React.memo(({ 
  block, 
  index, 
  scale, 
  onBlockEdit 
}: { 
  block: TextBlock, 
  index: number, 
  scale: number, 
  onBlockEdit: (i: number, t: string) => void 
}) => {
  return (
    <div
      contentEditable
      suppressContentEditableWarning
      onFocus={(e) => {
        e.currentTarget.style.color = '#0f172a';
        e.currentTarget.style.backgroundColor = 'white';
        e.currentTarget.style.zIndex = '5000';
      }}
      onBlur={(e) => {
        const newText = e.currentTarget.textContent || '';
        if (newText !== (block.editedText || block.text)) {
          onBlockEdit(index, newText);
        }
        if (!block.editedText && newText === block.text) {
          e.currentTarget.style.color = 'transparent';
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.zIndex = '1000';
        }
      }}
      className="absolute pointer-events-auto outline-none transition-shadow rounded-sm px-1 -mx-1"
      style={{
        left: `${block.x * scale}px`,
        top: `${block.y * scale}px`,
        minWidth: `${Math.max(20, block.width * scale)}px`,
        minHeight: `${Math.max(12, block.height * scale)}px`,
        fontSize: `${block.font_size * scale}px`,
        lineHeight: 1,
        whiteSpace: 'pre-wrap',
        fontFamily: 'serif',
        color: block.editedText ? '#0f172a' : 'transparent',
        backgroundColor: block.editedText ? 'white' : 'transparent',
        cursor: 'text',
        zIndex: 1000
      }}
    >
      {block.editedText || block.text}
    </div>
  );
});

EditableBlock.displayName = 'EditableBlock';

export default function PdfEditorOverlay({ 
  blocks = [], 
  scale, 
  onBlockEdit,
  containerWidth,
  containerHeight 
}: PdfEditorOverlayProps) {
  const isParsing = blocks.length === 0;

  return (
    <div 
      className="absolute inset-0 z-[1000]" 
      style={{ 
        width: '100%', 
        height: '100%',
        pointerEvents: isParsing ? 'auto' : 'none'
      }}
    >
      {isParsing && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] z-[2000]">
           <div className="bg-white p-6 rounded-xl shadow-2xl border border-blue-100 flex flex-col items-center gap-3 max-w-[200px] text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <div>
                <p className="text-sm font-bold text-slate-800">Analyzing Layout</p>
                <p className="text-[10px] text-slate-500 mt-1">Detecting editable text regions. This takes a few seconds...</p>
              </div>
           </div>
        </div>
      )}

      {blocks.map((block, index) => (
        <EditableBlock 
          key={`${index}-${block.x}-${block.y}`}
          block={block}
          index={index}
          scale={scale}
          onBlockEdit={onBlockEdit}
        />
      ))}
      
      <style jsx>{`
        [contenteditable] {
          transition: background-color 0.2s, box-shadow 0.2s;
        }
        [contenteditable]:hover {
           background-color: rgba(59, 130, 246, 0.1) !important;
           box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.4);
        }
        [contenteditable]:focus {
          color: #0f172a !important;
          background-color: white !important;
          box-shadow: 0 0 0 3px #3b82f6, 0 20px 25px -5px rgba(0, 0, 0, 0.2) !important;
          outline: none !important;
          min-width: 50px;
        }
        /* Visual cue for editable lines */
        [contenteditable]:not(:focus)::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 100%;
          border-bottom: 1px dashed rgba(59, 130, 246, 0.3);
          opacity: 0;
        }
        [contenteditable]:hover::after {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
