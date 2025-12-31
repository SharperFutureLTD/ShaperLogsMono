export interface Target {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  type: 'kpi' | 'ksb' | 'sales_target' | 'goal';
  target_value: number | null;
  current_value: number;
  unit: string | null;
  currency_code: string;
  deadline: string | null;
  source_document_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TargetDocument {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  parsed_content: string | null;
  document_type: string;
  created_at: string;
}

export interface WorkEntryTarget {
  id: string;
  work_entry_id: string;
  target_id: string;
  contribution_value: number | null;
  contribution_note: string | null;
  created_at: string;
}

export interface TargetMapping {
  targetId: string;
  targetName: string;
  contributionValue?: number;
  contributionNote: string;
}

export interface ExtractedTarget {
  name: string;
  description?: string;
  type: 'kpi' | 'ksb' | 'sales_target' | 'goal';
  target_value?: number;
  unit?: string;
  currency_code?: string;
  deadline?: string;
}
