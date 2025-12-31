export type DateRangeFilter = 'today' | 'week' | 'month' | 'all';

export function filterByDateRange<T extends { created_at: string }>(
  items: T[],
  range: DateRangeFilter
): T[] {
  if (range === 'all') return items;

  const now = new Date();
  let startDate: Date;

  switch (range) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      return items;
  }

  return items.filter(item => new Date(item.created_at) >= startDate);
}

export const DATE_RANGE_OPTIONS = [
  { value: 'today' as const, label: 'Today' },
  { value: 'week' as const, label: 'This Week' },
  { value: 'month' as const, label: 'This Month' },
  { value: 'all' as const, label: 'All Time' },
];
