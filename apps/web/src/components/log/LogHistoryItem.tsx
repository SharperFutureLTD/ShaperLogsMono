'use client'

import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2, Eye, EyeOff, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEncryption } from "@/hooks/useEncryption";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type WorkEntry = Database['public']['Tables']['work_entries']['Row'];

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface LogHistoryItemProps {
  entry: WorkEntry;
  onDelete?: (id: string) => void;
}

export function LogHistoryItem({ entry, onDelete }: LogHistoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [decryptedMessages, setDecryptedMessages] = useState<Message[] | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const { decrypt } = useEncryption();

  const formattedDate = new Date(entry.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  const formattedTime = new Date(entry.created_at).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  });

  const handlePrivacyToggle = async () => {
    if (isPrivacyMode) {
      // Turning off - clear decrypted data
      setIsPrivacyMode(false);
      setDecryptedMessages(null);
      return;
    }

    if (!entry.encrypted_original) {
      return;
    }

    setIsDecrypting(true);
    try {
      const decrypted = await decrypt(entry.encrypted_original);
      if (decrypted) {
        const messages = JSON.parse(decrypted) as Message[];
        setDecryptedMessages(messages);
        setIsPrivacyMode(true);
      }
    } catch (error) {
      console.error("Failed to decrypt:", error);
    } finally {
      setIsDecrypting(false);
    }
  };

  // Clear decrypted content when collapsing
  const handleToggleExpand = () => {
    if (isExpanded) {
      setIsPrivacyMode(false);
      setDecryptedMessages(null);
    }
    setIsExpanded(!isExpanded);
  };

  const handleDownload = () => {
    try {
      // Build export content
      let exportContent = `Date: ${formattedDate} ${formattedTime}\n`;
      exportContent += `Category: ${entry.category || 'General'}\n`;
      exportContent += `\nSummary:\n${entry.redacted_summary}\n`;

      if (entry.skills && entry.skills.length > 0) {
        exportContent += `\nSkills:\n${entry.skills.map(s => `- ${s}`).join('\n')}\n`;
      }

      if (entry.achievements && entry.achievements.length > 0) {
        exportContent += `\nAchievements:\n${entry.achievements.map(a => `- ${a}`).join('\n')}\n`;
      }

      const blob = new Blob([exportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `work-entry-${new Date(entry.created_at).toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Work entry downloaded!');
    } catch {
      toast.error('Failed to download');
    }
  };

  // Highlight redacted placeholders
  const highlightRedactions = (text: string) => {
    const parts = text.split(/(\[(?:CLIENT|AMOUNT|NAME|EMAIL|PHONE|PROJECT|REDACTED)\])/g);
    return parts.map((part, i) => {
      if (part.match(/^\[(?:CLIENT|AMOUNT|NAME|EMAIL|PHONE|PROJECT|REDACTED)\]$/)) {
        return (
          <span key={i} className="text-primary font-bold">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-card transition-all duration-200",
        "hover:border-primary/30"
      )}
    >
      {/* Header - always visible */}
      <button
        onClick={handleToggleExpand}
        className="w-full p-4 text-left flex items-start justify-between gap-4"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-muted-foreground">
              {formattedDate} • {formattedTime}
            </span>
            <span className="px-2 py-0.5 bg-primary/20 rounded text-xs font-mono text-primary">
              {entry.category}
            </span>
            {isPrivacyMode && (
              <span className="px-2 py-0.5 bg-destructive/20 rounded text-xs font-mono text-destructive">
                UNREDACTED
              </span>
            )}
          </div>
          <p className="font-mono text-sm text-foreground truncate">
            {entry.redacted_summary}
          </p>
        </div>
        <div className="flex-shrink-0 text-muted-foreground">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 animate-fade-in">
          <div className="border-t border-border pt-4">
            {/* Privacy toggle and content */}
            {isPrivacyMode && decryptedMessages ? (
              <div className="mb-4 p-3 rounded-md bg-muted/50 border border-destructive/20">
                <span className="font-mono text-xs text-muted-foreground block mb-2">
                  // original conversation
                </span>
                <div className="space-y-2">
                  {decryptedMessages.map((msg, i) => (
                    <div key={i} className="font-mono text-sm">
                      <span className={cn(
                        "font-bold",
                        msg.role === "user" ? "text-primary" : "text-muted-foreground"
                      )}>
                        {msg.role === "user" ? "You" : "Assistant"}:
                      </span>{" "}
                      <span className="text-foreground">{msg.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="font-mono text-sm text-foreground mb-4 leading-relaxed">
                {highlightRedactions(entry.redacted_summary)}
              </p>
            )}

            {/* Skills */}
            {entry.skills && entry.skills.length > 0 && (
              <div className="mb-3">
                <span className="font-mono text-xs text-muted-foreground block mb-1">
                  // skills
                </span>
                <div className="flex flex-wrap gap-1">
                  {entry.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-muted rounded text-xs font-mono"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Achievements */}
            {entry.achievements && entry.achievements.length > 0 && (
              <div className="mb-3">
                <span className="font-mono text-xs text-muted-foreground block mb-1">
                  // achievements
                </span>
                <ul className="space-y-1">
                  {entry.achievements.map((achievement, i) => (
                    <li key={i} className="font-mono text-sm text-foreground">
                      <span className="text-primary mr-2">•</span>
                      {achievement}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap justify-end gap-2 mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                className="font-mono text-xs"
              >
                <Download className="h-3 w-3 sm:mr-1" />
                <span className="hidden sm:inline">[DOWNLOAD]</span>
              </Button>
              {entry.encrypted_original && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrivacyToggle();
                  }}
                  disabled={isDecrypting}
                  className={cn(
                    "font-mono text-xs",
                    isPrivacyMode && "text-destructive hover:text-destructive"
                  )}
                >
                  {isDecrypting ? (
                    <Loader2 className="h-3 w-3 sm:mr-1 animate-spin" />
                  ) : isPrivacyMode ? (
                    <EyeOff className="h-3 w-3 sm:mr-1" />
                  ) : (
                    <Eye className="h-3 w-3 sm:mr-1" />
                  )}
                  <span className="hidden sm:inline">{isPrivacyMode ? "[HIDE]" : "[REVEAL]"}</span>
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(entry.id);
                  }}
                  className="font-mono text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">[DELETE]</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
