import { getCategoriesForUser, type EmploymentStatus } from '../constants/categories';

/**
 * Validate and normalize category against predefined list
 * Falls back to 'General' if category is invalid
 */
export function validateCategory(
  category: string,
  employmentStatus?: EmploymentStatus
): string {
  const validCategories = getCategoriesForUser(employmentStatus);

  // Exact match
  if (validCategories.includes(category)) {
    return category;
  }

  // Case-insensitive match
  const normalized = category.toLowerCase();
  const match = validCategories.find(c => c.toLowerCase() === normalized);
  if (match) {
    return match;
  }

  // Fuzzy match (contains)
  const fuzzyMatch = validCategories.find(c =>
    normalized.includes(c.toLowerCase()) || c.toLowerCase().includes(normalized)
  );
  if (fuzzyMatch) {
    return fuzzyMatch;
  }

  // Default fallback
  console.warn(`[CategoryValidator] Invalid category "${category}" normalized to "General"`);
  return 'General';
}
