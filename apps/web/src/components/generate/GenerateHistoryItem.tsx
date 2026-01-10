'use client'

import { useState } from 'react';
import { Copy, Trash2, Download, ChevronDown } from 'lucide-react';
import { GeneratedContent, GENERATE_TYPE_OPTIONS } from '@/types/generate';
import { toast } from 'sonner';

interface GenerateHistoryItemProps {
  item: GeneratedContent;
  onDelete: (id: string) => void;
}

export function GenerateHistoryItem({ item, onDelete }: GenerateHistoryItemProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const typeLabel = GENERATE_TYPE_OPTIONS.find(o => o.type === item.type)?.label || item.type;
  const previewLength = 200;
  const isLongContent = item.content.length > previewLength;

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });

    if (diffDays === 0) {
      if (diffHours < 1) return `Just now`;
      return `Today at ${timeStr}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${timeStr}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago at ${timeStr}`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
      }) + ` at ${timeStr}`;
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(item.content);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([item.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.type}-${new Date(item.created_at).toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Downloaded');
    } catch {
      toast.error('Failed to download');
    }
  };

  const handleDelete = () => {
    onDelete(item.id);
    setShowConfirmDelete(false);
  };

  const handleCardClick = () => {
    if (isLongContent) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div
      className="entry-card group"
      onClick={handleCardClick}
    >
      {/* Top row: timestamp and type badge */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs" style={{ color: '#5C6660' }}>
          {formatRelativeTime(item.created_at)}
        </span>
        <div className="flex items-center gap-2">
          <span className="count-badge">{typeLabel}</span>
          {/* Hover actions */}
          <div className="hover-actions flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
              className="p-1.5 rounded hover:bg-[#2A332E] transition-colors"
              title="Copy"
            >
              <Copy className="h-3.5 w-3.5" style={{ color: '#5C6660' }} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              className="p-1.5 rounded hover:bg-[#2A332E] transition-colors"
              title="Download"
            >
              <Download className="h-3.5 w-3.5" style={{ color: '#5C6660' }} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowConfirmDelete(true);
              }}
              className="p-1.5 rounded hover:bg-[#2A332E] transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" style={{ color: '#EF4444' }} />
            </button>
          </div>
          {/* Chevron indicator - only show if content is long */}
          {isLongContent && (
            <ChevronDown
              className={`expand-chevron h-4 w-4 ${isExpanded ? 'expanded' : ''}`}
              style={{ color: '#5C6660' }}
            />
          )}
        </div>
      </div>

      {/* Prompt in green italics */}
      <p className="text-sm italic mb-2" style={{ color: '#34A853' }}>
        "{item.prompt}"
      </p>

      {/* Content - show preview or full based on expanded state */}
      {isLongContent ? (
        isExpanded ? (
          <p
            className="text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: '#9CA898' }}
          >
            {item.content}
          </p>
        ) : (
          <p className="text-sm leading-relaxed" style={{ color: '#9CA898' }}>
            {item.content.slice(0, previewLength)}...
            <span className="text-xs ml-1" style={{ color: '#5C6660' }}>
              (click to expand)
            </span>
          </p>
        )
      ) : (
        <p className="text-sm leading-relaxed" style={{ color: '#9CA898' }}>
          {item.content}
        </p>
      )}

      {/* Delete confirmation */}
      {showConfirmDelete && (
        <div
          className="mt-3 p-3 rounded-lg flex items-center justify-between"
          style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-sm" style={{ color: '#EF4444' }}>Delete this content?</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfirmDelete(false)}
              className="px-3 py-1 rounded text-xs font-medium"
              style={{ color: '#9CA898' }}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1 rounded text-xs font-medium"
              style={{ background: '#EF4444', color: '#fff' }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
