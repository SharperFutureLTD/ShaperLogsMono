'use client'

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEncryption } from '@/hooks/useEncryption';
import { useProfile } from '@/hooks/useProfile';
import { useTargets } from '@/hooks/useTargets';
import { toast } from 'sonner';
import type { Message, ConversationStatus, ExtractedData, SummaryData } from '@/types/log';
import type { Json } from '@/integrations/supabase/types';

const MAX_EXCHANGES = 5;
const STORAGE_KEYS = {
  messages: 'log-messages',
  status: 'log-status',
  exchangeCount: 'log-exchange-count',
  extractedData: 'log-extracted-data',
  summary: 'log-summary'
};

export function useLogConversation() {
  const { user } = useAuth();
  const { encrypt } = useEncryption();
  const { profile } = useProfile();
  const { targets, updateTargetProgress } = useTargets();

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

  // Hydrate state from sessionStorage after mount (runs once)
  useEffect(() => {
    try {
      const storedMessages = sessionStorage.getItem(STORAGE_KEYS.messages);
      if (storedMessages) {
        const parsed = JSON.parse(storedMessages);
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      }

      const storedStatus = sessionStorage.getItem(STORAGE_KEYS.status);
      if (storedStatus) setStatus(JSON.parse(storedStatus));

      const storedCount = sessionStorage.getItem(STORAGE_KEYS.exchangeCount);
      if (storedCount) setExchangeCount(JSON.parse(storedCount));

      const storedData = sessionStorage.getItem(STORAGE_KEYS.extractedData);
      if (storedData) setExtractedData(JSON.parse(storedData));

      const storedSummary = sessionStorage.getItem(STORAGE_KEYS.summary);
      if (storedSummary) setSummary(JSON.parse(storedSummary));
    } catch (err) {
      console.error('Failed to hydrate state from sessionStorage:', err);
    }

    setIsHydrated(true);
  }, []);

  // Persist state to sessionStorage whenever it changes (only after hydration)
  useEffect(() => {
    if (!isHydrated) return;
    sessionStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(messages));
  }, [messages, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    sessionStorage.setItem(STORAGE_KEYS.status, JSON.stringify(status));
  }, [status, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    sessionStorage.setItem(STORAGE_KEYS.exchangeCount, JSON.stringify(exchangeCount));
  }, [exchangeCount, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    sessionStorage.setItem(STORAGE_KEYS.extractedData, JSON.stringify(extractedData));
  }, [extractedData, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    sessionStorage.setItem(STORAGE_KEYS.summary, JSON.stringify(summary));
  }, [summary, isHydrated]);

  const sendMessage = useCallback(async (content: string) => {
    if (!user) {
      toast.error('Please sign in to log your work');
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setStatus('in_progress');
    setIsLoading(true);

    try {
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

      const { data, error } = await supabase.functions.invoke('ai-log-chat', {
        body: {
          messages: apiMessages,
          exchangeCount,
          industry: profile?.industry || 'general',
          targets: activeTargets
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      };

      setMessages([...newMessages, assistantMessage]);
      setExchangeCount(prev => prev + 1);

      // Merge extracted data
      if (data.extractedData) {
        setExtractedData(prev => ({
          skills: [...new Set([...prev.skills, ...(data.extractedData.skills || [])])],
          achievements: [...new Set([...prev.achievements, ...(data.extractedData.achievements || [])])],
          metrics: { ...prev.metrics, ...(data.extractedData.metrics || {}) },
          category: data.extractedData.category || prev.category
        }));
      }

      // Check if we should summarize
      if (data.shouldSummarize || exchangeCount >= MAX_EXCHANGES - 1) {
        await generateSummary([...newMessages, assistantMessage]);
      }

    } catch (err) {
      console.error('Error in conversation:', err);
      toast.error('Failed to process message');
    } finally {
      setIsLoading(false);
    }
  }, [user, messages, exchangeCount, profile?.industry, targets]);

  const generateSummary = useCallback(async (conversationMessages: Message[]) => {
    setStatus('summarizing');
    setIsLoading(true);

    try {
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
        unit: t.unit
      }));

      const { data, error } = await supabase.functions.invoke('ai-summarize', {
        body: {
          conversation,
          extractedData,
          industry: profile?.industry || 'general',
          targets: activeTargets,
          employmentStatus: profile?.employment_status
        }
      });

      if (error) throw error;

      setSummary(data);
      setStatus('review');
    } catch (err) {
      console.error('Error generating summary:', err);
      toast.error('Failed to generate summary');
      setStatus('in_progress');
    } finally {
      setIsLoading(false);
    }
  }, [extractedData, targets, profile?.industry]);

  const updateSummary = useCallback((newSummary: string) => {
    if (summary) {
      setSummary({ ...summary, redactedSummary: newSummary });
    }
  }, [summary]);

  const acceptSummary = useCallback(async () => {
    if (!user || !summary) return;

    setIsLoading(true);

    try {
      // Encrypt the original conversation
      const originalContent = JSON.stringify(messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString()
      })));

      const encryptedOriginal = await encrypt(originalContent);

      // Extract target IDs from mappings
      const targetIds = summary.targetMappings?.map(m => m.targetId) || [];

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

      toast.success('Work logged successfully!');
      setStatus('completed');

      // Reset conversation after a short delay
      setTimeout(() => {
        resetConversation();
      }, 1500);

    } catch (err) {
      console.error('Error saving entry:', err);
      toast.error('Failed to save work entry');
    } finally {
      setIsLoading(false);
    }
  }, [user, summary, messages, encrypt, updateTargetProgress]);

  const resetConversation = useCallback(() => {
    setMessages([]);
    setStatus('idle');
    setExchangeCount(0);
    setExtractedData({ skills: [], achievements: [], metrics: {}, category: 'general' });
    setSummary(null);
    setIsLoading(false);

    // Clear persisted state
    Object.values(STORAGE_KEYS).forEach(key => sessionStorage.removeItem(key));
  }, []);

  const skipToSummary = useCallback(async () => {
    if (messages.length > 0) {
      await generateSummary(messages);
    }
  }, [messages, generateSummary]);

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
    skipToSummary
  };
}
