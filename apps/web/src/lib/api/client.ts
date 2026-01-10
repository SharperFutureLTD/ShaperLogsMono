import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// Type definitions
type WorkEntry = Database['public']['Tables']['work_entries']['Row'];
type Target = Database['public']['Tables']['targets']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type GeneratedContent = Database['public']['Tables']['generated_content']['Row'];

interface APIError {
  error: string;
  message?: string;
  status: number;
}

class APIClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string
  ) {
    super(message);
    this.name = 'APIClientError';
  }
}

/**
 * REST API Client for Sharper-Logs
 *
 * Handles all communication with the Hono REST API server.
 * Automatically extracts JWT tokens from Supabase session for authentication.
 */
class APIClient {
  private baseURL: string;

  constructor() {
    let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    // Remove trailing slash if present to avoid double slashes
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    this.baseURL = url;
  }

  /**
   * Extract JWT token from Supabase session
   * Tokens are stored in httpOnly cookies via @supabase/ssr
   */
  private async getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  /**
   * Make authenticated request to REST API
   * Includes timeout handling to prevent mobile browsers from silently killing requests
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAuthToken();

    if (!token) {
      throw new APIClientError('No authentication token', 401, 'UNAUTHORIZED');
    }

    // Add timeout - longer for AI endpoints (60s), shorter for others (30s)
    const isAIEndpoint = endpoint.startsWith('/api/ai/');
    const timeout = isAIEndpoint ? 60000 : 30000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);

    // Only set Content-Type for non-FormData requests
    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData: APIError = await response.json().catch(() => ({
          error: 'Unknown Error',
          message: response.statusText,
          status: response.status,
        }));

        throw new APIClientError(
          errorData.message || errorData.error,
          errorData.status,
          errorData.error
        );
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new APIClientError('Request timed out. Please try again.', 408, 'TIMEOUT');
      }
      throw error;
    }
  }

  // ========================================
  // Work Entries
  // ========================================

  async getWorkEntries(page?: number, limit?: number) {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    return this.request<{ 
      entries: WorkEntry[]; 
      meta?: { total: number; page: number; limit: number; totalPages: number } 
    }>(`/api/work-entries?${params.toString()}`);
  }

  async createWorkEntry(data: {
    redacted_summary: string;
    encrypted_original: string;
    skills?: string[];
    achievements?: string[];
    metrics?: Record<string, unknown>;
    category?: string;
    target_ids?: string[];
  }) {
    return this.request<WorkEntry>('/api/work-entries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getWorkEntry(id: string) {
    return this.request<{ entry: WorkEntry }>(`/api/work-entries/${id}`);
  }

  async deleteWorkEntry(id: string) {
    return this.request<{ success: boolean; message: string }>(`/api/work-entries/${id}`, {
      method: 'DELETE',
    });
  }

  // ========================================
  // Targets
  // ========================================

  async getTargets(isActive?: boolean) {
    const params = isActive !== undefined ? `?is_active=${isActive}` : '';
    return this.request<{ data: Target[] }>(`/api/targets${params}`);
  }

  async createTarget(data: {
    name: string;
    description?: string;
    type?: 'kpi' | 'ksb' | 'sales_target' | 'goal';
    target_value?: number;
    current_value?: number;
    unit?: string;
    currency_code?: string;
    deadline?: string;
    source_document_id?: string;
  }) {
    return this.request<Target>('/api/targets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createTargetsBulk(targets: Array<{
    name: string;
    description?: string;
    type?: 'kpi' | 'ksb' | 'sales_target' | 'goal';
    target_value?: number;
    current_value?: number;
    unit?: string;
    currency_code?: string;
    deadline?: string;
    source_document_id?: string;
  }>) {
    return this.request<{ data: Target[]; count: number }>('/api/targets/bulk', {
      method: 'POST',
      body: JSON.stringify({ targets }),
    });
  }

  async updateTarget(id: string, data: {
    name?: string;
    description?: string;
    type?: 'kpi' | 'ksb' | 'sales_target' | 'goal';
    target_value?: number;
    current_value?: number;
    unit?: string;
    deadline?: string;
    is_active?: boolean;
  }) {
    return this.request<Target>(`/api/targets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async incrementTargetProgress(id: string, incrementBy: number = 1) {
    return this.request<{ id: string; current_value: number; message: string }>(
      `/api/targets/${id}/progress`,
      {
        method: 'PATCH',
        body: JSON.stringify({ incrementBy }),
      }
    );
  }

  async softDeleteTarget(id: string) {
    return this.request<{ success: boolean; message: string }>(
      `/api/targets/${id}/soft-delete`,
      { method: 'PATCH' }
    );
  }

  async restoreTarget(id: string) {
    return this.request<Target>(`/api/targets/${id}/restore`, { method: 'PATCH' });
  }

  async archiveTarget(id: string) {
    return this.request<{ success: boolean; message: string }>(
      `/api/targets/${id}/archive`,
      { method: 'PATCH' }
    );
  }

  async unarchiveTarget(id: string) {
    return this.request<Target>(`/api/targets/${id}/unarchive`, { method: 'PATCH' });
  }

  async getTargetEvidence(targetId: string) {
    return this.request<{ data: any[] }>(`/api/targets/${targetId}/evidence`);
  }

  // ========================================
  // Profile
  // ========================================

  async getProfile() {
    return this.request<Profile>('/api/profile');
  }

  async updateProfile(data: {
    employmentStatus?: 'employed' | 'job_seeking' | 'student' | 'apprentice';
    industry?: string;
    studyField?: string;
    displayName?: string;
  }) {
    return this.request<Profile>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateIndustry(industry: string) {
    return this.request<Profile>('/api/profile/industry', {
      method: 'PATCH',
      body: JSON.stringify({ industry }),
    });
  }

  async updateEmploymentStatus(employmentStatus: 'employed' | 'job_seeking' | 'student' | 'apprentice') {
    return this.request<Profile>('/api/profile/employment-status', {
      method: 'PATCH',
      body: JSON.stringify({ employmentStatus }),
    });
  }

  async updateStudyField(studyField: string) {
    return this.request<Profile>('/api/profile/study-field', {
      method: 'PATCH',
      body: JSON.stringify({ studyField }),
    });
  }

  async completeOnboarding(data: {
    employmentStatus: 'employed' | 'job_seeking' | 'student' | 'apprentice';
    industry: string;
    studyField?: string;
  }) {
    return this.request<Profile>('/api/profile/onboarding', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ========================================
  // Generated Content
  // ========================================

  async getGeneratedContent() {
    return this.request<{ data: GeneratedContent[] }>('/api/generated-content');
  }

  async saveGeneratedContent(data: {
    type: string;
    prompt: string;
    content: string;
    work_entry_ids?: string[];
  }) {
    return this.request<GeneratedContent>('/api/generated-content', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteGeneratedContent(id: string) {
    return this.request<{ success: boolean }>(`/api/generated-content/${id}`, {
      method: 'DELETE',
    });
  }

  // ========================================
  // Saved Prompts
  // ========================================

  async getSavedPrompts() {
    return this.request<{ data: Array<{
      id: string;
      user_id: string;
      name: string;
      prompt_text: string;
      created_at: string;
      updated_at: string;
    }> }>('/api/saved-prompts');
  }

  async createSavedPrompt(data: { name: string; prompt_text: string }) {
    return this.request<{
      id: string;
      user_id: string;
      name: string;
      prompt_text: string;
      created_at: string;
      updated_at: string;
    }>('/api/saved-prompts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteSavedPrompt(id: string) {
    return this.request<{ success: boolean }>(`/api/saved-prompts/${id}`, {
      method: 'DELETE',
    });
  }

  // ========================================
  // Work Entry Targets
  // ========================================

  async linkWorkEntryToTarget(data: {
    work_entry_id: string;
    target_id: string;
    contribution_value?: number;
    contribution_note?: string;
    smart_data?: {
      specific?: string;
      measurable?: string;
      achievable?: string;
      relevant?: string;
      timeBound?: string;
    };
  }) {
    return this.request<any>('/api/work-entry-targets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ========================================
  // AI Operations
  // ========================================

  async uploadDocument(file: File, documentType: string = 'generation_context') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);

    return this.request<{
      id: string;
      parsed_content: string | null;
    }>('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async generateContent(data: {
    prompt: string;
    type: string;
    workEntries?: Array<Pick<WorkEntry, 'redacted_summary' | 'skills' | 'achievements' | 'metrics' | 'category' | 'created_at'>>;
    industry: string;
    contextDocument?: string;
  }) {
    return this.request<{ content: string; error?: string }>('/api/ai/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logChat(data: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    exchangeCount?: number;
    industry: string;
    targets?: Array<Pick<Target, 'id' | 'name' | 'description' | 'type' | 'target_value' | 'current_value' | 'unit' | 'deadline'>>;
  }) {
    return this.request<{
      message: string;
      extractedData?: {
        skills?: string[];
        achievements?: string[];
        metrics?: Record<string, unknown>;
        category?: string;
      };
      shouldSummarize?: boolean;
    }>('/api/ai/log-chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async summarizeConversation(data: {
    conversation: Array<{ role: 'user' | 'assistant'; content: string }>;
    extractedData?: {
      skills?: string[];
      achievements?: string[];
      metrics?: Record<string, unknown>;
      category?: string;
    };
    industry: string;
    targets?: Array<Pick<Target, 'id' | 'name' | 'description' | 'type' | 'target_value' | 'current_value' | 'unit' | 'deadline'>>;
    employmentStatus?: string;
  }) {
    return this.request<{
      redactedSummary: string;
      skills: string[];
      achievements: string[];
      metrics: Record<string, unknown>;
      category: string;
      targetMappings?: Array<{
        targetId: string;
        targetName?: string;
        contributionValue?: number;
        contributionNote?: string;
        smart?: {
          specific: string;
          measurable: string;
          achievable: string;
          relevant: string;
          timeBound: string;
        };
      }>;
    }>('/api/ai/summarize', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async extractTargets(filePath: string) {
    return this.request<{
      targets: Array<{
        title: string;
        description: string;
        type: string;
        target_value?: number;
      }>;
    }>('/api/ai/extract-targets', {
      method: 'POST',
      body: JSON.stringify({ filePath }),
    });
  }

  // ========================================
  // Billing
  // ========================================

  async createCheckoutSession() {
    return this.request<{ clientSecret: string }>('/api/billing/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async createPortalSession() {
    return this.request<{ url: string }>('/api/billing/portal', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async createSubscription() {
    return this.request<{ clientSecret: string; subscriptionId: string }>('/api/billing/create-subscription', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getSubscriptionStatus() {
    return this.request<{
      hasSubscription: boolean;
      status?: string;
      currentPeriodEnd?: number;
      cancelAtPeriodEnd?: boolean;
      subscriptionId?: string;
    }>('/api/billing/subscription', {
      method: 'GET',
    });
  }

  async cancelSubscription() {
    return this.request<{
      success: boolean;
      cancelAtPeriodEnd: boolean;
    }>('/api/billing/cancel-subscription', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getBillingHistory() {
    return this.request<{
      invoices: Array<{
        id: string;
        amountPaid: number;
        currency: string;
        created: number;
        status: string;
        invoicePdf?: string;
      }>;
    }>('/api/billing/invoices', {
      method: 'GET',
    });
  }

  // ========================================
  // Career History
  // ========================================

  async getCareerHistory() {
    return this.request<{ data: any[] }>('/api/career');
  }

  async addCareerHistory(data: any) {
    return this.request<any>('/api/career', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteCareerHistory(id: string) {
    return this.request<{ success: boolean }>(`/api/career/${id}`, {
      method: 'DELETE',
    });
  }

  async createCareerHistoryBulk(items: Array<{
    title: string;
    company: string;
    start_date?: string | null;
    end_date?: string | null;
    is_current?: boolean;
    description?: string | null;
    skills?: string[];
  }>) {
    return this.request<{ data: any[]; count: number }>('/api/career/bulk', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  async uploadResume(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<{ history: any[] }>('/api/career/upload-resume', {
      method: 'POST',
      body: formData,
    });
  }
}

// Export singleton instance
export const apiClient = new APIClient();

// Export error class for error handling
export { APIClientError };
