// @ts-nocheck - Regex capture groups can't be typed precisely
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  subQuarters,
  subYears,
  parse,
  isValid,
} from 'date-fns';

export interface TimeRange {
  start: Date;
  end: Date;
  description: string;
}

export interface ParseResult {
  timeRange: TimeRange | null;
  cleanedPrompt: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
}

interface PatternDefinition {
  pattern: RegExp;
  handler: (match: RegExpMatchArray, now: Date) => { start: Date; end: Date } | null;
  confidence: 'high' | 'medium' | 'low';
}

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function handleQuarter(q: number, year: number): { start: Date; end: Date } {
  const quarterStart = new Date(year, (q - 1) * 3, 1);
  return {
    start: startOfQuarter(quarterStart),
    end: endOfQuarter(quarterStart),
  };
}

function handleYear(year: number): { start: Date; end: Date } {
  const yearDate = new Date(year, 0, 1);
  return {
    start: startOfYear(yearDate),
    end: endOfYear(yearDate),
  };
}

function handleNamedMonth(
  monthName: string,
  year?: number
): { start: Date; end: Date } | null {
  const monthNum = MONTHS[monthName.toLowerCase()];
  if (monthNum === undefined) return null;

  const targetYear = year ?? new Date().getFullYear();
  const monthDate = new Date(targetYear, monthNum, 1);
  return {
    start: startOfMonth(monthDate),
    end: endOfMonth(monthDate),
  };
}

const TIME_PATTERNS: PatternDefinition[] = [
  // === HIGH CONFIDENCE - Explicit time references ===

  // Today
  {
    pattern: /\b(today'?s?)\b/i,
    handler: (_, now) => ({
      start: startOfDay(now),
      end: endOfDay(now),
    }),
    confidence: 'high',
  },

  // Yesterday
  {
    pattern: /\b(yesterday'?s?)\b/i,
    handler: (_, now) => ({
      start: startOfDay(subDays(now, 1)),
      end: endOfDay(subDays(now, 1)),
    }),
    confidence: 'high',
  },

  // This week
  {
    pattern: /\b(this\s+week'?s?)\b/i,
    handler: (_, now) => ({
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    }),
    confidence: 'high',
  },

  // Last week
  {
    pattern: /\b(last\s+week'?s?)\b/i,
    handler: (_, now) => ({
      start: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }),
      end: endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }),
    }),
    confidence: 'high',
  },

  // Past N weeks
  {
    pattern: /\b(past|last)\s+(\d+)\s+weeks?\b/i,
    handler: (match, now) => ({
      start: startOfDay(subWeeks(now, parseInt(match[2]))),
      end: endOfDay(now),
    }),
    confidence: 'high',
  },

  // This month
  {
    pattern: /\b(this\s+month'?s?)\b/i,
    handler: (_, now) => ({
      start: startOfMonth(now),
      end: endOfMonth(now),
    }),
    confidence: 'high',
  },

  // Last month
  {
    pattern: /\b(last\s+month'?s?)\b/i,
    handler: (_, now) => ({
      start: startOfMonth(subMonths(now, 1)),
      end: endOfMonth(subMonths(now, 1)),
    }),
    confidence: 'high',
  },

  // Past N months
  {
    pattern: /\b(past|last)\s+(\d+)\s+months?\b/i,
    handler: (match, now) => ({
      start: startOfDay(subMonths(now, parseInt(match[2]))),
      end: endOfDay(now),
    }),
    confidence: 'high',
  },

  // This quarter
  {
    pattern: /\b(this\s+quarter'?s?)\b/i,
    handler: (_, now) => ({
      start: startOfQuarter(now),
      end: endOfQuarter(now),
    }),
    confidence: 'high',
  },

  // Last quarter
  {
    pattern: /\b(last\s+quarter'?s?)\b/i,
    handler: (_, now) => ({
      start: startOfQuarter(subQuarters(now, 1)),
      end: endOfQuarter(subQuarters(now, 1)),
    }),
    confidence: 'high',
  },

  // Specific quarter: Q1, Q2, Q3, Q4 with optional year
  {
    pattern: /\bQ([1-4])\s*(20\d{2})?\b/i,
    handler: (match, now) => {
      const quarter = parseInt(match[1]);
      const year = match[2] ? parseInt(match[2]) : now.getFullYear();
      return handleQuarter(quarter, year);
    },
    confidence: 'high',
  },

  // This year
  {
    pattern: /\b(this\s+year'?s?)\b/i,
    handler: (_, now) => ({
      start: startOfYear(now),
      end: endOfYear(now),
    }),
    confidence: 'high',
  },

  // Last year
  {
    pattern: /\b(last\s+year'?s?)\b/i,
    handler: (_, now) => ({
      start: startOfYear(subYears(now, 1)),
      end: endOfYear(subYears(now, 1)),
    }),
    confidence: 'high',
  },

  // Specific year: 2024, 2025, etc.
  {
    pattern: /\b(?:in\s+)?(20\d{2})\b/i,
    handler: (match) => handleYear(parseInt(match[1])),
    confidence: 'high',
  },

  // Named month with optional year: "January 2025", "March", "in December"
  {
    pattern:
      /\b(?:in\s+)?(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s*(20\d{2})?\b/i,
    handler: (match) => {
      const year = match[2] ? parseInt(match[2]) : undefined;
      return handleNamedMonth(match[1], year);
    },
    confidence: 'high',
  },

  // === MEDIUM CONFIDENCE - Less explicit but clear intent ===

  // "from X to Y" date range
  {
    pattern: /\bfrom\s+(\w+\s*\d*,?\s*\d*)\s+to\s+(\w+\s*\d*,?\s*\d*)\b/i,
    handler: (match) => {
      // Try to parse both dates
      const startDate = parse(match[1].trim(), 'MMMM d, yyyy', new Date());
      const endDate = parse(match[2].trim(), 'MMMM d, yyyy', new Date());

      if (isValid(startDate) && isValid(endDate)) {
        return {
          start: startOfDay(startDate),
          end: endOfDay(endDate),
        };
      }
      return null;
    },
    confidence: 'medium',
  },

  // "between X and Y"
  {
    pattern: /\bbetween\s+(\w+\s*\d*,?\s*\d*)\s+and\s+(\w+\s*\d*,?\s*\d*)\b/i,
    handler: (match) => {
      const startDate = parse(match[1].trim(), 'MMMM d, yyyy', new Date());
      const endDate = parse(match[2].trim(), 'MMMM d, yyyy', new Date());

      if (isValid(startDate) && isValid(endDate)) {
        return {
          start: startOfDay(startDate),
          end: endOfDay(endDate),
        };
      }
      return null;
    },
    confidence: 'medium',
  },

  // Past N days
  {
    pattern: /\b(past|last)\s+(\d+)\s+days?\b/i,
    handler: (match, now) => ({
      start: startOfDay(subDays(now, parseInt(match[2]))),
      end: endOfDay(now),
    }),
    confidence: 'high',
  },

  // "N days ago"
  {
    pattern: /\b(\d+)\s+days?\s+ago\b/i,
    handler: (match, now) => {
      const daysAgo = subDays(now, parseInt(match[1]));
      return {
        start: startOfDay(daysAgo),
        end: endOfDay(daysAgo),
      };
    },
    confidence: 'high',
  },

  // "N weeks ago"
  {
    pattern: /\b(\d+)\s+weeks?\s+ago\b/i,
    handler: (match, now) => {
      const weeksAgo = subWeeks(now, parseInt(match[1]));
      return {
        start: startOfWeek(weeksAgo, { weekStartsOn: 1 }),
        end: endOfWeek(weeksAgo, { weekStartsOn: 1 }),
      };
    },
    confidence: 'high',
  },

  // "N months ago"
  {
    pattern: /\b(\d+)\s+months?\s+ago\b/i,
    handler: (match, now) => {
      const monthsAgo = subMonths(now, parseInt(match[1]));
      return {
        start: startOfMonth(monthsAgo),
        end: endOfMonth(monthsAgo),
      };
    },
    confidence: 'high',
  },

  // === LOW CONFIDENCE - Implicit time references ===

  // "recent" or "latest" work
  {
    pattern: /\b(recent|latest|newest)\s*(work|entries|logs|activity)?\b/i,
    handler: (_, now) => ({
      start: startOfDay(subDays(now, 7)),
      end: endOfDay(now),
    }),
    confidence: 'low',
  },

  // "this morning" / "this afternoon" / "this evening"
  {
    pattern: /\bthis\s+(morning|afternoon|evening)\b/i,
    handler: (_, now) => ({
      start: startOfDay(now),
      end: endOfDay(now),
    }),
    confidence: 'medium',
  },
];

/**
 * Parse time range from natural language in a prompt.
 *
 * @param prompt - The user's prompt text
 * @returns ParseResult with extracted time range, cleaned prompt, and confidence level
 *
 * @example
 * parseTimeRange("Summarize today's work")
 * // Returns { timeRange: { start: today 00:00, end: today 23:59 }, cleanedPrompt: "Summarize work", confidence: "high" }
 *
 * @example
 * parseTimeRange("Generate a LinkedIn post about Q3 achievements")
 * // Returns { timeRange: { start: Jul 1, end: Sep 30 }, cleanedPrompt: "Generate a LinkedIn post about achievements", confidence: "high" }
 */
export function parseTimeRange(prompt: string): ParseResult {
  const now = new Date();
  let cleanedPrompt = prompt;
  let timeRange: TimeRange | null = null;
  let confidence: ParseResult['confidence'] = 'none';

  // Try each pattern in order (highest confidence first)
  for (const { pattern, handler, confidence: patternConfidence } of TIME_PATTERNS) {
    const match = prompt.match(pattern);
    if (match) {
      const range = handler(match, now);
      if (range) {
        const matchedText = match[0];
        timeRange = {
          ...range,
          description: `${matchedText} (${formatDateRange(range.start, range.end)})`,
        };
        // Remove the matched text from prompt, clean up extra spaces
        cleanedPrompt = prompt
          .replace(matchedText, '')
          .replace(/\s+/g, ' ')
          .trim();
        confidence = patternConfidence;
        break;
      }
    }
  }

  return { timeRange, cleanedPrompt, confidence };
}

/**
 * Format a date range as a human-readable string
 */
function formatDateRange(start: Date, end: Date): string {
  const startStr = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const endStr = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (startStr === endStr) {
    return startStr;
  }
  return `${startStr} - ${endStr}`;
}

/**
 * Check if a date falls within a time range
 */
export function isDateInRange(
  date: Date | string,
  range: TimeRange
): boolean {
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  return checkDate >= range.start && checkDate <= range.end;
}

/**
 * Get the period type for a given time range duration
 */
export function inferPeriodType(
  range: TimeRange
): 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom' {
  const diffMs = range.end.getTime() - range.start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= 1) return 'daily';
  if (diffDays <= 7) return 'weekly';
  if (diffDays <= 31) return 'monthly';
  if (diffDays <= 92) return 'quarterly';
  if (diffDays <= 366) return 'yearly';
  return 'custom';
}
