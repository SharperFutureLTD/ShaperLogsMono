/**
 * Query Key Factory
 *
 * Centralized query keys for consistent cache invalidation.
 * Pattern: [entity, ...identifiers, ...filters]
 *
 * Example usage:
 * - queryKeys.workEntries.all -> ['work-entries']
 * - queryKeys.workEntries.lists() -> ['work-entries', 'list']
 * - queryKeys.workEntries.detail('123') -> ['work-entries', 'detail', '123']
 */
export const queryKeys = {
  workEntries: {
    all: ['work-entries'] as const,
    lists: () => [...queryKeys.workEntries.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.workEntries.all, 'detail', id] as const,
  },
  targets: {
    all: ['targets'] as const,
    lists: () => [...queryKeys.targets.all, 'list'] as const,
    active: () => [...queryKeys.targets.all, 'list', 'active'] as const,
    inactive: () => [...queryKeys.targets.all, 'list', 'inactive'] as const,
    detail: (id: string) => [...queryKeys.targets.all, 'detail', id] as const,
    evidence: (targetId: string) => [...queryKeys.targets.all, 'evidence', targetId] as const,
  },
  profile: {
    all: ['profile'] as const,
    detail: () => [...queryKeys.profile.all, 'detail'] as const,
  },
  generatedContent: {
    all: ['generated-content'] as const,
    lists: () => [...queryKeys.generatedContent.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.generatedContent.all, 'detail', id] as const,
  },
};
