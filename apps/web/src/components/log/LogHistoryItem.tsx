'use client'

import { useState } from "react";
import { Copy, Trash2, ChevronDown, Eye, EyeOff, Loader2, Tag } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useEncryption } from "@/hooks/useEncryption";

type WorkEntry = Database['public']['Tables']['work_entries']['Row'];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface LogHistoryItemProps {
  entry: WorkEntry;
  onDelete?: (id: string) => void;
}

export function LogHistoryItem({ entry, onDelete }: LogHistoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [decryptedOriginal, setDecryptedOriginal] = useState<Message[] | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const { decrypt } = useEncryption();

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
      await navigator.clipboard.writeText(entry.redacted_summary || '');
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleReveal = async () => {
    // Toggle off if already revealed
    if (isRevealed) {
      setIsRevealed(false);
      return;
    }

    // Use cached decrypted content if available
    if (decryptedOriginal) {
      setIsRevealed(true);
      return;
    }

    // No encrypted content available
    if (!entry.encrypted_original) {
      toast.error('Original content not available');
      return;
    }

    // Decrypt for the first time
    setIsDecrypting(true);
    try {
      const result = await decrypt(entry.encrypted_original);
      if (result) {
        const messages = JSON.parse(result) as Message[];
        setDecryptedOriginal(messages);
        setIsRevealed(true);
      } else {
        toast.error('Failed to decrypt content');
      }
    } catch (error) {
      console.error('Decryption error:', error);
      toast.error('Failed to decrypt content');
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleCardClick = () => {
    setIsExpanded(!isExpanded);
  };

  const skillCount = entry.skills?.length || 0;
  const hasAchievements = entry.achievements && entry.achievements.length > 0;
  const hasMetrics = entry.metrics && Object.keys(entry.metrics).length > 0;
  const hasCategory = entry.category;
  const hasExpandableContent = hasAchievements || hasMetrics || hasCategory || entry.encrypted_original;

  return (
    <div
      className="entry-card group"
      onClick={handleCardClick}
    >
      {/* Top row: timestamp and badges */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#5C6660' }}>
            {formatRelativeTime(entry.created_at)}
          </span>
          {isRevealed && (
            <span className="badge-unredacted">Unredacted</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {skillCount > 0 && (
            <span className="count-badge">
              {skillCount} skill{skillCount !== 1 ? 's' : ''}
            </span>
          )}
          {/* Action buttons */}
          <div className="hover-actions flex items-center gap-1">
            {/* Reveal button - only show if encrypted_original exists */}
            {entry.encrypted_original && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReveal();
                }}
                className="p-1.5 rounded hover:bg-[#2A332E] transition-colors"
                title={isRevealed ? "Hide original" : "Reveal original"}
              >
                {isDecrypting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: '#F59E0B' }} />
                ) : isRevealed ? (
                  <EyeOff className="h-3.5 w-3.5" style={{ color: '#F59E0B' }} />
                ) : (
                  <Eye className="h-3.5 w-3.5" style={{ color: '#F59E0B' }} />
                )}
              </button>
            )}
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
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(entry.id);
                }}
                className="p-1.5 rounded hover:bg-[#2A332E] transition-colors"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" style={{ color: '#EF4444' }} />
              </button>
            )}
          </div>
          {/* Chevron indicator */}
          {hasExpandableContent && (
            <ChevronDown
              className={`expand-chevron h-4 w-4 ${isExpanded ? 'expanded' : ''}`}
              style={{ color: '#5C6660' }}
            />
          )}
        </div>
      </div>

      {/* Summary text */}
      <p className="text-sm leading-relaxed mb-3" style={{ color: '#F1F5F3' }}>
        {entry.redacted_summary}
      </p>

      {/* Skill tags */}
      {entry.skills && entry.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {entry.skills.map((skill, i) => (
            <span key={i} className="skill-badge">
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Expandable content section */}
      {hasExpandableContent && (
        <div className={`expandable-content ${isExpanded ? 'expanded' : ''}`}>
          <div className="expandable-inner">
            <div className="pt-3 border-t" style={{ borderColor: '#2A332E' }}>

              {/* Category */}
              {hasCategory && (
                <div className="mb-3">
                  <span className="category-badge">
                    <Tag className="h-3 w-3" />
                    {entry.category}
                  </span>
                </div>
              )}

              {/* Achievements */}
              {hasAchievements && (
                <div className="mb-3">
                  <p className="text-xs font-medium mb-2" style={{ color: '#5C6660' }}>
                    Achievements
                  </p>
                  <div>
                    {entry.achievements!.map((achievement, i) => (
                      <div key={i} className="achievement-item">
                        <div className="achievement-bullet" />
                        <span style={{ color: '#9CA898' }}>{achievement}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metrics */}
              {hasMetrics && (
                <div className="mb-3">
                  <p className="text-xs font-medium mb-2" style={{ color: '#5C6660' }}>
                    Metrics
                  </p>
                  <div className="rounded-lg p-2" style={{ background: '#1C2420' }}>
                    {Object.entries(entry.metrics as Record<string, unknown>).map(([key, value]) => (
                      <div key={key} className="metric-row">
                        <span className="metric-key">{key}</span>
                        <span className="metric-value">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Original conversation (when revealed) */}
              {isRevealed && decryptedOriginal && (
                <div className="mb-3">
                  <p className="text-xs font-medium mb-2" style={{ color: '#F59E0B' }}>
                    Original Conversation
                  </p>
                  <div>
                    {decryptedOriginal.map((message, i) => (
                      <div
                        key={i}
                        className={`original-message ${message.role}`}
                      >
                        <span
                          className="text-xs font-medium block mb-1"
                          style={{ color: message.role === 'user' ? '#34A853' : '#5C6660' }}
                        >
                          {message.role === 'user' ? 'You' : 'Assistant'}
                        </span>
                        <span style={{ color: '#9CA898' }}>{message.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
