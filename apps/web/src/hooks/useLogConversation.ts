'use client'

import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import { useAuth } from '@/hooks/useAuth';
import { useEncryption } from '@/hooks/useEncryption';
import { useProfile } from '@/hooks/useProfile';
import { useTargets } from '@/hooks/useTargets';
import { toast } from 'sonner';
import type { Message, ConversationStatus, ExtractedData, SummaryData } from '@/types/log';
import type { Json } from '@/integrations/supabase/types';

const MAX_EXCHANGES = 5;

// SECURITY: Scope storage keys by user ID to prevent data leakage between users
const getStorageKeys = (userId: string) => ({
  messages: `log-messages-${userId}`,
  status: `log-status-${userId}`,
  exchangeCount: `log-exchange-count-${userId}`,
  extractedData: `log-extracted-data-${userId}`,
  summary: `log-summary-${userId}`
});

export function useLogConversation() {
  const { user } = useAuth();
  const { encrypt } = useEncryption();
  const { profile } = useProfile();
  const { targets, updateTargetProgress } = useTargets();
  const queryClient = useQueryClient();

  // State with simple defaults - hydrated from sessionStorage after mount
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<ConversationStatus>('idle');
  const [exchangeCount, setExchangeCount] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedData>({
    skills: [],
    achievements: [],
    metrics: {},
    category: 'general'
  });
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // CRITICAL: Hydrate state from sessionStorage after mount (user-scoped)
  useEffect(() => {
    if (!user?.id) {
      setIsHydrated(true);
      return;
    }

    const keys = getStorageKeys(user.id);

    try {
      const storedMessages = sessionStorage.getItem(keys.messages);
      if (storedMessages) {
        const parsed = JSON.parse(storedMessages);
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      }

      const storedStatus = sessionStorage.getItem(keys.status);
      if (storedStatus) setStatus(JSON.parse(storedStatus));

      const storedCount = sessionStorage.getItem(keys.exchangeCount);
      if (storedCount) setExchangeCount(JSON.parse(storedCount));

      const storedData = sessionStorage.getItem(keys.extractedData);
      if (storedData) setExtractedData(JSON.parse(storedData));

      const storedSummary = sessionStorage.getItem(keys.summary);
      if (storedSummary) setSummary(JSON.parse(storedSummary));
    } catch (err) {
      console.error('Failed to hydrate state from sessionStorage:', err);
    }

    setIsHydrated(true);
  }, [user?.id]);

  // CRITICAL: Persist state to sessionStorage (user-scoped)
  useEffect(() => {
    if (!isHydrated || !user?.id) return;
    const keys = getStorageKeys(user.id);
    sessionStorage.setItem(keys.messages, JSON.stringify(messages));
  }, [messages, isHydrated, user?.id]);

  useEffect(() => {
    if (!isHydrated || !user?.id) return;
    const keys = getStorageKeys(user.id);
    sessionStorage.setItem(keys.status, JSON.stringify(status));
  }, [status, isHydrated, user?.id]);

  useEffect(() => {
    if (!isHydrated || !user?.id) return;
    const keys = getStorageKeys(user.id);
    sessionStorage.setItem(keys.exchangeCount, JSON.stringify(exchangeCount));
  }, [exchangeCount, isHydrated, user?.id]);

  useEffect(() => {
    if (!isHydrated || !user?.id) return;
    const keys = getStorageKeys(user.id);
    sessionStorage.setItem(keys.extractedData, JSON.stringify(extractedData));
  }, [extractedData, isHydrated, user?.id]);

  useEffect(() => {
    if (!isHydrated || !user?.id) return;
    const keys = getStorageKeys(user.id);
    sessionStorage.setItem(keys.summary, JSON.stringify(summary));
  }, [summary, isHydrated, user?.id]);

  // SEND MESSAGE MUTATION (migrated from Edge Function to REST API)
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const userMessage: Message = {
        role: 'user',
        content,
        timestamp: new Date()
      };

      const newMessages = [...messages, userMessage];

      // Format messages for API
      const apiMessages = newMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      // Prepare active targets for AI context
      const activeTargets = targets.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        type: t.type,
        target_value: t.target_value,
        current_value: t.current_value,
        unit: t.unit,
        deadline: t.deadline
      }));

      // Call REST API instead of Edge Function
      const response = await apiClient.logChat({
        messages: apiMessages,
        exchangeCount,
        industry: profile?.industry || 'general',
        targets: activeTargets
      });

      return { newMessages, response, userMessage };
    },

    onMutate: () => {
      setStatus('in_progress');
      setIsLoading(true);
    },

    onSuccess: (data) => {
      const { newMessages, response, userMessage } = data;

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date()
      };

      setMessages([...newMessages, assistantMessage]);
      setExchangeCount(prev => prev + 1);

      // Merge extracted data
      if (response.extractedData) {
        const extracted = response.extractedData;
        setExtractedData(prev => ({
          skills: [...new Set([...prev.skills, ...(extracted.skills || [])])],
          achievements: [...new Set([...prev.achievements, ...(extracted.achievements || [])])],
          metrics: { ...prev.metrics, ...(extracted.metrics || {}) },
          category: extracted.category || prev.category
        }));
      }

      // Check if we should summarize
      if (response.shouldSummarize || exchangeCount >= MAX_EXCHANGES - 1) {
        summarizeMutation.mutate([...newMessages, assistantMessage]);
      }

      setIsLoading(false);
    },

    onError: (err) => {
      console.error('Error in conversation:', err);
      toast.error('Failed to process message');
      setIsLoading(false);
    },
  });

  // GENERATE SUMMARY MUTATION (migrated from Edge Function to REST API)
  const summarizeMutation = useMutation({
    mutationFn: async (conversationMessages: Message[]) => {
      const conversation = conversationMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      // Prepare targets for AI context
      const activeTargets = targets.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        type: t.type,
        target_value: t.target_value,
        current_value: t.current_value,
        unit: t.unit,
        deadline: t.deadline
      }));

      // Call REST API instead of Edge Function
      const response = await apiClient.summarizeConversation({
        conversation,
        extractedData,
        industry: profile?.industry || 'general',
        targets: activeTargets,
        employmentStatus: profile?.employment_status
      });

      return response;
    },

    onMutate: () => {
      setStatus('summarizing');
      setIsLoading(true);
    },

    onSuccess: (data) => {
      setSummary(data);
      setStatus('review');
      setIsLoading(false);
    },

    onError: (err) => {
      console.error('Error generating summary:', err);
      toast.error('Failed to generate summary');
      setStatus('in_progress');
      setIsLoading(false);
    },
  });

  // ACCEPT SUMMARY MUTATION (save to database with encryption)
  const acceptSummaryMutation = useMutation({
    mutationFn: async () => {
      if (!user || !summary) {
        throw new Error('User or summary not available');
      }

      // Encrypt the original conversation
      const originalContent = JSON.stringify(messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString()
      })));

      const encryptedOriginal = await encrypt(originalContent);

      // Extract target IDs from mappings and validate UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const targetIds = (summary.targetMappings?.map(m => m.targetId) || []).filter(id => {
        if (!uuidRegex.test(id)) {
          console.warn(`Invalid target ID: ${id} - skipping`);
          return false;
        }
        return true;
      });

      // Save work entry to database
      const { data: workEntry, error } = await supabase
        .from('work_entries')
        .insert([{
          user_id: user.id,
          redacted_summary: summary.redactedSummary,
          encrypted_original: encryptedOriginal,
          skills: summary.skills,
          achievements: summary.achievements,
          metrics: summary.metrics as Json,
          category: summary.category,
          target_ids: targetIds
        }])
        .select()
        .single();

      if (error) throw error;

      // Save target mappings and update progress
      if (summary.targetMappings && summary.targetMappings.length > 0 && workEntry) {
        const mappingsToSave = summary.targetMappings.map(m => ({
          work_entry_id: workEntry.id,
          target_id: m.targetId,
          contribution_value: m.contributionValue || null,
          contribution_note: m.contributionNote || null,
          smart_data: m.smart ? {
            specific: m.smart.specific,
            measurable: m.smart.measurable,
            achievable: m.smart.achievable,
            relevant: m.smart.relevant,
            timeBound: m.smart.timeBound
          } : null
        }));

        const { error: mappingError } = await supabase
          .from('work_entry_targets')
          .insert(mappingsToSave);

        if (mappingError) {
          console.error('Error saving target mappings:', mappingError);
        }

        // Update target progress for numeric contributions
        for (const mapping of summary.targetMappings) {
          if (mapping.contributionValue && mapping.contributionValue > 0) {
            await updateTargetProgress(mapping.targetId, mapping.contributionValue);
          }
        }
      }

      return workEntry;
    },

    onMutate: () => {
      setIsLoading(true);
    },

    onSuccess: () => {
      toast.success('Work logged successfully!');
      setStatus('completed');

      // Invalidate work entries cache
      queryClient.invalidateQueries({ queryKey: queryKeys.workEntries.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.targets.all });

      // Reset conversation after a short delay
      setTimeout(() => {
        resetConversation();
      }, 1500);

      setIsLoading(false);
    },

    onError: (err) => {
      console.error('Error saving entry:', err);
      toast.error('Failed to save work entry');
      setIsLoading(false);
    },
  });

  // Backward-compatible wrappers
  const sendMessage = useCallback(async (content: string) => {
    if (!user) {
      toast.error('Please sign in to log your work');
      return;
    }
    sendMessageMutation.mutate(content);
  }, [user, sendMessageMutation]);

  const generateSummary = useCallback(async (conversationMessages: Message[]) => {
    summarizeMutation.mutate(conversationMessages);
  }, [summarizeMutation]);

  const updateSummary = useCallback((newSummary: string) => {
    if (summary) {
      setSummary({ ...summary, redactedSummary: newSummary });
    }
  }, [summary]);

  const acceptSummary = useCallback(async () => {
    acceptSummaryMutation.mutate();
  }, [acceptSummaryMutation]);

  const resetConversation = useCallback(() => {
    setMessages([]);
    setStatus('idle');
    setExchangeCount(0);
    setExtractedData({ skills: [], achievements: [], metrics: {}, category: 'general' });
    setSummary(null);
    setIsLoading(false);

    // Clear user-scoped persisted state
    if (user?.id) {
      const keys = getStorageKeys(user.id);
      Object.values(keys).forEach(key => sessionStorage.removeItem(key));
    }
  }, [user?.id]);

  const skipToSummary = useCallback(async () => {
    if (messages.length > 0) {
      await generateSummary(messages);
    }
  }, [messages, generateSummary]);

  const undoLastExchange = useCallback(() => {
    setMessages((prev) => {
      // Remove last assistant message if present
      let newMessages = [...prev];
      if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
        newMessages.pop();
      }
      // Remove last user message if present
      if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'user') {
        newMessages.pop();
      }
      return newMessages;
    });

    setExchangeCount((prev) => Math.max(0, prev - 1));
    
    // Note: We don't rollback extractedData here as it's complex to track history.
    // The final summary will be based on the remaining conversation messages primarily.
  }, []);

  // Return exact same interface
  return {
    messages,
    status,
    exchangeCount,
    maxExchanges: MAX_EXCHANGES,
    summary,
    isLoading,
    sendMessage,
    updateSummary,
    acceptSummary,
    resetConversation,
    skipToSummary,
    undoLastExchange
  };
}
