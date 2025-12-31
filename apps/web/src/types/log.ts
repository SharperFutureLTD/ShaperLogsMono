export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type ConversationStatus = 'idle' | 'in_progress' | 'summarizing' | 'review' | 'completed';

export interface ExtractedData {
  skills: string[];
  achievements: string[];
  metrics: Record<string, unknown>;
  category: string;
}

export interface WorkEntry {
  id: string;
  user_id: string;
  redacted_summary: string;
  encrypted_original: string;
  skills: string[];
  achievements: string[];
  metrics: Record<string, unknown>;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface LogConversation {
  id: string;
  user_id: string;
  work_entry_id: string | null;
  messages: Message[];
  status: ConversationStatus;
  created_at: string;
}

export interface SmartData {
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
}

export interface TargetMapping {
  targetId: string;
  targetName: string;
  contributionValue?: number;
  contributionNote?: string;
  smart?: SmartData;
}

export interface SummaryData {
  redactedSummary: string;
  skills: string[];
  achievements: string[];
  metrics: Record<string, unknown>;
  category: string;
  targetMappings?: TargetMapping[];
}
