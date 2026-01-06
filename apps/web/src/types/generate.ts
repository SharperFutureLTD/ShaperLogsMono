export type GenerateType =
  | 'resume'
  | 'brag_doc'
  | 'performance_review'
  | 'linkedin_post'
  // Job-seeking specific
  | 'cover_letter'
  | 'interview_prep'
  // Sales-specific
  | 'sales_report'
  // Software-specific
  | 'tech_resume'
  | 'sprint_retro'
  // Engineering-specific
  | 'technical_report'
  | 'project_summary'
  // R&D-specific
  | 'research_summary'
  | 'grant_proposal'
  // Education-specific
  | 'lesson_plan'
  | 'teaching_portfolio'
  // Marketing-specific
  | 'campaign_summary'
  | 'case_study'
  // Finance-specific
  | 'financial_summary'
  | 'quarter_report'
  // Healthcare-specific
  | 'case_summary'
  | 'professional_development'
  // Operations-specific
  | 'process_report'
  | 'efficiency_analysis'
  // Student-specific
  | 'placement_application'
  | 'portfolio_summary'
  | 'academic_cv'
  // Apprentice-specific
  | 'ksb_evidence'
  | 'epa_preparation'
  | 'progress_review';

export interface GeneratedContent {
  id: string;
  user_id: string;
  type: GenerateType;
  prompt: string;
  content: string;
  work_entry_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface GenerateTypeOption {
  type: GenerateType;
  label: string;
  description: string;
  suggestedPrompt: string;
}

// LinkedIn Post - available to all
const LINKEDIN_TYPE: GenerateTypeOption = {
  type: 'linkedin_post',
  label: 'LinkedIn Post',
  description: 'Professional social update',
  suggestedPrompt: 'Generate a professional LinkedIn post about ',
};

// Job-seeking specific types (3 + LinkedIn)
const JOB_SEEKING_TYPES: GenerateTypeOption[] = [
  { type: 'resume', label: 'Resume', description: 'Professional bullet points', suggestedPrompt: 'Generate resume bullet points highlighting my key achievements and skills in ' },
  { type: 'cover_letter', label: 'Cover Letter', description: 'Tailored job applications', suggestedPrompt: 'Write a cover letter for a position as ' },
  { type: 'interview_prep', label: 'Interview Prep', description: 'Practice answers', suggestedPrompt: 'Help me prepare interview answers highlighting my experience in ' },
];

// Industry-specific content types (3 per industry)
const INDUSTRY_TYPES: Record<string, GenerateTypeOption[]> = {
  sales: [
    { type: 'brag_doc', label: 'Brag Doc', description: 'Showcase your wins', suggestedPrompt: 'Create a brag document highlighting my sales achievements including ' },
    { type: 'performance_review', label: 'Performance Review', description: 'Self-assessment content', suggestedPrompt: 'Write my quarterly performance review focusing on ' },
    { type: 'sales_report', label: 'Sales Report', description: 'Pipeline and results', suggestedPrompt: 'Generate a sales report covering ' },
  ],
  software: [
    { type: 'tech_resume', label: 'Technical Resume', description: 'Developer bullet points', suggestedPrompt: 'Generate resume bullet points highlighting my technical contributions in ' },
    { type: 'sprint_retro', label: 'Sprint Retrospective', description: 'What went well', suggestedPrompt: 'Write a sprint retrospective summary for ' },
    { type: 'performance_review', label: 'Performance Review', description: 'Self-assessment content', suggestedPrompt: 'Write my quarterly performance review focusing on ' },
  ],
  engineering: [
    { type: 'technical_report', label: 'Technical Report', description: 'Engineering documentation', suggestedPrompt: 'Generate a technical report covering ' },
    { type: 'project_summary', label: 'Project Summary', description: 'Project highlights', suggestedPrompt: 'Create a project summary highlighting ' },
    { type: 'performance_review', label: 'Performance Review', description: 'Self-assessment content', suggestedPrompt: 'Write my quarterly performance review focusing on ' },
  ],
  research: [
    { type: 'research_summary', label: 'Research Summary', description: 'Key findings', suggestedPrompt: 'Summarize my research findings on ' },
    { type: 'grant_proposal', label: 'Grant Proposal', description: 'Funding applications', suggestedPrompt: 'Draft a grant proposal for ' },
    { type: 'performance_review', label: 'Performance Review', description: 'Self-assessment content', suggestedPrompt: 'Write my quarterly performance review focusing on ' },
  ],
  education: [
    { type: 'teaching_portfolio', label: 'Teaching Portfolio', description: 'Professional development', suggestedPrompt: 'Generate content for my teaching portfolio showcasing ' },
    { type: 'lesson_plan', label: 'Lesson Plan', description: 'Structured teaching plan', suggestedPrompt: 'Create a lesson plan for teaching ' },
    { type: 'performance_review', label: 'Performance Review', description: 'Self-assessment content', suggestedPrompt: 'Write my annual performance review focusing on ' },
  ],
  marketing: [
    { type: 'campaign_summary', label: 'Campaign Summary', description: 'Campaign results', suggestedPrompt: 'Summarize the marketing campaign results for ' },
    { type: 'case_study', label: 'Case Study', description: 'Success stories', suggestedPrompt: 'Write a case study about ' },
    { type: 'performance_review', label: 'Performance Review', description: 'Self-assessment content', suggestedPrompt: 'Write my quarterly performance review focusing on ' },
  ],
  finance: [
    { type: 'financial_summary', label: 'Financial Summary', description: 'Key metrics', suggestedPrompt: 'Generate a financial summary covering ' },
    { type: 'quarter_report', label: 'Quarter Report', description: 'Quarterly highlights', suggestedPrompt: 'Write a quarterly report highlighting ' },
    { type: 'performance_review', label: 'Performance Review', description: 'Self-assessment content', suggestedPrompt: 'Write my quarterly performance review focusing on ' },
  ],
  healthcare: [
    { type: 'professional_development', label: 'CPD Report', description: 'Professional development', suggestedPrompt: 'Create a professional development report covering ' },
    { type: 'case_summary', label: 'Case Summary', description: 'Patient case notes', suggestedPrompt: 'Write a case summary for ' },
    { type: 'performance_review', label: 'Performance Review', description: 'Self-assessment content', suggestedPrompt: 'Write my annual performance review focusing on ' },
  ],
  operations: [
    { type: 'process_report', label: 'Process Report', description: 'Process improvements', suggestedPrompt: 'Generate a process report analyzing ' },
    { type: 'efficiency_analysis', label: 'Efficiency Analysis', description: 'Optimization insights', suggestedPrompt: 'Create an efficiency analysis for ' },
    { type: 'performance_review', label: 'Performance Review', description: 'Self-assessment content', suggestedPrompt: 'Write my quarterly performance review focusing on ' },
  ],
};

// Student-specific content types (3 types)
const STUDENT_TYPES: GenerateTypeOption[] = [
  { type: 'placement_application', label: 'Placement Application', description: 'Cover letters and applications', suggestedPrompt: 'Draft a placement application highlighting my experience in ' },
  { type: 'portfolio_summary', label: 'Portfolio Summary', description: 'Project showcase', suggestedPrompt: 'Create a portfolio summary featuring my work on ' },
  { type: 'academic_cv', label: 'Academic CV', description: 'Education-focused resume', suggestedPrompt: 'Generate academic CV bullet points for ' },
];

// Apprentice-specific content types (3 types)
const APPRENTICE_TYPES: GenerateTypeOption[] = [
  { type: 'ksb_evidence', label: 'KSB Evidence', description: 'Knowledge, Skills, Behaviours', suggestedPrompt: 'Document evidence for KSB ' },
  { type: 'epa_preparation', label: 'EPA Preparation', description: 'End-point assessment prep', suggestedPrompt: 'Prepare EPA evidence for ' },
  { type: 'progress_review', label: 'Progress Review', description: 'Apprentice review meeting prep', suggestedPrompt: 'Prepare for my progress review covering ' },
];

// Default types for unknown/custom industries (3 types)
const DEFAULT_TYPES: GenerateTypeOption[] = [
  { type: 'resume', label: 'Resume', description: 'Professional bullet points', suggestedPrompt: 'Generate resume bullet points highlighting my key achievements and skills in ' },
  { type: 'brag_doc', label: 'Brag Doc', description: 'Comprehensive accomplishments', suggestedPrompt: 'Create a brag document summarizing my major accomplishments including ' },
  { type: 'performance_review', label: 'Performance Review', description: 'Self-assessment content', suggestedPrompt: 'Write content for my quarterly performance review self-assessment focusing on ' },
];

export function getContentTypesForIndustry(
  industry: string | null,
  employmentStatus?: string | null,
  studyField?: string | null
): GenerateTypeOption[] {
  // For students, use student-specific types (3) + LinkedIn
  if (employmentStatus === 'student') {
    return [...STUDENT_TYPES, LINKEDIN_TYPE];
  }

  // For apprentices, use apprentice-specific types (3) + LinkedIn
  if (employmentStatus === 'apprentice') {
    return [...APPRENTICE_TYPES, LINKEDIN_TYPE];
  }

  // For job-seekers, use job-search focused types (3) + LinkedIn
  if (employmentStatus === 'job_seeking') {
    return [...JOB_SEEKING_TYPES, LINKEDIN_TYPE];
  }

  // For employed, use industry types (3) + LinkedIn
  const industryTypes = industry ? INDUSTRY_TYPES[industry] : null;
  const specificTypes = industryTypes || DEFAULT_TYPES;
  return [...specificTypes, LINKEDIN_TYPE];
}

// Keep legacy export for backward compatibility
export const GENERATE_TYPE_OPTIONS: GenerateTypeOption[] = [...DEFAULT_TYPES, LINKEDIN_TYPE];
