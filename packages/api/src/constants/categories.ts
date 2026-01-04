/**
 * Predefined work entry categories
 * Used to ensure consistent filtering and reporting
 */
export const WORK_CATEGORIES = {
  // Core professional categories
  DEVELOPMENT: 'Development',
  DESIGN: 'Design',
  MEETINGS: 'Meetings',
  LEARNING: 'Learning',
  SALES: 'Sales',
  MARKETING: 'Marketing',
  OPERATIONS: 'Operations',
  SUPPORT: 'Support',
  RESEARCH: 'Research',
  GENERAL: 'General',
} as const;

/**
 * Employment-specific category mappings
 */
export const CATEGORY_BY_EMPLOYMENT = {
  student: [
    'Coursework',
    'Projects',
    'Part-time Work',
    'Extracurricular',
    'Learning',
    'General',
  ],
  apprentice: [
    'On-the-job Training',
    'Classroom Training',
    'Projects',
    'Assessment',
    'Learning',
    'General',
  ],
  professional: [
    'Development',
    'Design',
    'Meetings',
    'Learning',
    'Sales',
    'Marketing',
    'Operations',
    'Support',
    'Research',
    'General',
  ],
} as const;

export type WorkCategory = typeof WORK_CATEGORIES[keyof typeof WORK_CATEGORIES];
export type EmploymentStatus = keyof typeof CATEGORY_BY_EMPLOYMENT;

/**
 * Get categories for user based on employment status
 */
export function getCategoriesForUser(employmentStatus?: EmploymentStatus): string[] {
  return CATEGORY_BY_EMPLOYMENT[employmentStatus || 'professional'];
}
