export type GenerateType = 
  | 'resume' 
  | 'brag_doc' 
  | 'performance_review' 
  | 'linkedin_post' 
  | 'custom'
  // Sales-specific
  | 'sales_report'
  | 'client_proposal'
  // Software-specific
  | 'tech_resume'
  | 'sprint_retro'
  | 'tech_blog'
  // Engineering-specific
  | 'technical_report'
  | 'project_summary'
  // R&D-specific
  | 'research_summary'
  | 'experiment_report'
  | 'grant_proposal'
  // Education-specific
  | 'lesson_plan'
  | 'student_report'
  | 'teaching_portfolio'
  // Marketing-specific
  | 'campaign_summary'
  | 'content_brief'
  | 'case_study'
  // Finance-specific
  | 'financial_summary'
  | 'investment_memo'
  | 'quarter_report'
  // Healthcare-specific
  | 'case_summary'
  | 'clinical_notes'
  | 'professional_development'
  // Operations-specific
  | 'process_report'
  | 'project_update'
  | 'efficiency_analysis'
  // Student-specific
  | 'placement_application'
  | 'portfolio_summary'
  | 'academic_cv'
  | 'project_writeup'
  | 'skills_evidence'
  | 'reflection_log'
  // Apprentice-specific
  | 'ksb_evidence'
  | 'epa_preparation'
  | 'training_log'
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

// Universal types available to all industries
const UNIVERSAL_TYPES: GenerateTypeOption[] = [
  {
    type: 'linkedin_post',
    label: 'LinkedIn Post',
    description: 'Professional social update',
    suggestedPrompt: 'Generate a professional LinkedIn post about ',
  },
  {
    type: 'custom',
    label: 'Custom',
    description: 'Your specific request',
    suggestedPrompt: '',
  },
];

// Industry-specific content types
const INDUSTRY_TYPES: Record<string, GenerateTypeOption[]> = {
  sales: [
    { type: 'brag_doc', label: 'Brag Doc', description: 'Showcase your wins', suggestedPrompt: 'Create a brag document highlighting my sales achievements including ' },
    { type: 'performance_review', label: 'Performance Review', description: 'Self-assessment content', suggestedPrompt: 'Write my quarterly performance review focusing on ' },
    { type: 'sales_report', label: 'Sales Report', description: 'Pipeline and results', suggestedPrompt: 'Generate a sales report covering ' },
    { type: 'client_proposal', label: 'Client Proposal', description: 'Winning proposals', suggestedPrompt: 'Draft a client proposal for ' },
  ],
  software: [
    { type: 'tech_resume', label: 'Technical Resume', description: 'Developer bullet points', suggestedPrompt: 'Generate resume bullet points highlighting my technical contributions in ' },
    { type: 'sprint_retro', label: 'Sprint Retrospective', description: 'What went well', suggestedPrompt: 'Write a sprint retrospective summary for ' },
    { type: 'tech_blog', label: 'Technical Blog', description: 'Share your learnings', suggestedPrompt: 'Create a technical blog post about ' },
    { type: 'performance_review', label: 'Performance Review', description: 'Self-assessment content', suggestedPrompt: 'Write my quarterly performance review focusing on ' },
  ],
  engineering: [
    { type: 'technical_report', label: 'Technical Report', description: 'Engineering documentation', suggestedPrompt: 'Generate a technical report covering ' },
    { type: 'project_summary', label: 'Project Summary', description: 'Project highlights', suggestedPrompt: 'Create a project summary highlighting ' },
    { type: 'performance_review', label: 'Performance Review', description: 'Self-assessment content', suggestedPrompt: 'Write my quarterly performance review focusing on ' },
    { type: 'resume', label: 'Resume', description: 'Professional bullet points', suggestedPrompt: 'Generate resume bullet points highlighting my key achievements in ' },
  ],
  research: [
    { type: 'research_summary', label: 'Research Summary', description: 'Key findings', suggestedPrompt: 'Summarize my research findings on ' },
    { type: 'experiment_report', label: 'Experiment Report', description: 'Results and analysis', suggestedPrompt: 'Write an experiment report detailing ' },
    { type: 'grant_proposal', label: 'Grant Proposal', description: 'Funding applications', suggestedPrompt: 'Draft a grant proposal for ' },
    { type: 'performance_review', label: 'Performance Review', description: 'Self-assessment content', suggestedPrompt: 'Write my quarterly performance review focusing on ' },
  ],
  education: [
    { type: 'lesson_plan', label: 'Lesson Plan', description: 'Structured teaching plan', suggestedPrompt: 'Create a lesson plan for teaching ' },
    { type: 'student_report', label: 'Student Progress', description: 'Assessment summaries', suggestedPrompt: 'Write a student progress report covering ' },
    { type: 'teaching_portfolio', label: 'Teaching Portfolio', description: 'Professional development', suggestedPrompt: 'Generate content for my teaching portfolio showcasing ' },
    { type: 'performance_review', label: 'Performance Review', description: 'Self-assessment content', suggestedPrompt: 'Write my annual performance review focusing on ' },
  ],
  marketing: [
    { type: 'campaign_summary', label: 'Campaign Summary', description: 'Campaign results', suggestedPrompt: 'Summarize the marketing campaign results for ' },
    { type: 'content_brief', label: 'Content Brief', description: 'Content planning', suggestedPrompt: 'Create a content brief for ' },
    { type: 'case_study', label: 'Case Study', description: 'Success stories', suggestedPrompt: 'Write a case study about ' },
    { type: 'performance_review', label: 'Performance Review', description: 'Self-assessment content', suggestedPrompt: 'Write my quarterly performance review focusing on ' },
  ],
  finance: [
    { type: 'financial_summary', label: 'Financial Summary', description: 'Key metrics', suggestedPrompt: 'Generate a financial summary covering ' },
    { type: 'investment_memo', label: 'Investment Memo', description: 'Investment analysis', suggestedPrompt: 'Draft an investment memo for ' },
    { type: 'quarter_report', label: 'Quarter Report', description: 'Quarterly highlights', suggestedPrompt: 'Write a quarterly report highlighting ' },
    { type: 'performance_review', label: 'Performance Review', description: 'Self-assessment content', suggestedPrompt: 'Write my quarterly performance review focusing on ' },
  ],
  healthcare: [
    { type: 'case_summary', label: 'Case Summary', description: 'Patient case notes', suggestedPrompt: 'Write a case summary for ' },
    { type: 'clinical_notes', label: 'Clinical Notes', description: 'Documentation', suggestedPrompt: 'Generate clinical notes for ' },
    { type: 'professional_development', label: 'CPD Report', description: 'Professional development', suggestedPrompt: 'Create a professional development report covering ' },
    { type: 'performance_review', label: 'Performance Review', description: 'Self-assessment content', suggestedPrompt: 'Write my annual performance review focusing on ' },
  ],
  operations: [
    { type: 'process_report', label: 'Process Report', description: 'Process improvements', suggestedPrompt: 'Generate a process report analyzing ' },
    { type: 'project_update', label: 'Project Update', description: 'Status update', suggestedPrompt: 'Write a project update covering ' },
    { type: 'efficiency_analysis', label: 'Efficiency Analysis', description: 'Optimization insights', suggestedPrompt: 'Create an efficiency analysis for ' },
    { type: 'performance_review', label: 'Performance Review', description: 'Self-assessment content', suggestedPrompt: 'Write my quarterly performance review focusing on ' },
  ],
};

// Student-specific content types
const STUDENT_TYPES: GenerateTypeOption[] = [
  { type: 'placement_application', label: 'Placement Application', description: 'Cover letters and applications', suggestedPrompt: 'Draft a placement application highlighting my experience in ' },
  { type: 'portfolio_summary', label: 'Portfolio Summary', description: 'Project showcase', suggestedPrompt: 'Create a portfolio summary featuring my work on ' },
  { type: 'academic_cv', label: 'Academic CV', description: 'Education-focused resume', suggestedPrompt: 'Generate academic CV bullet points for ' },
  { type: 'project_writeup', label: 'Project Write-up', description: 'Technical or coursework projects', suggestedPrompt: 'Write a project summary covering ' },
  { type: 'skills_evidence', label: 'Skills Evidence', description: 'Competency examples', suggestedPrompt: 'Document evidence of my skills in ' },
  { type: 'reflection_log', label: 'Reflection Log', description: 'Learning journal entries', suggestedPrompt: 'Write a reflective entry about ' },
];

// Apprentice-specific content types
const APPRENTICE_TYPES: GenerateTypeOption[] = [
  { type: 'ksb_evidence', label: 'KSB Evidence', description: 'Knowledge, Skills, Behaviours', suggestedPrompt: 'Document evidence for KSB ' },
  { type: 'epa_preparation', label: 'EPA Preparation', description: 'End-point assessment prep', suggestedPrompt: 'Prepare EPA evidence for ' },
  { type: 'training_log', label: 'Training Log', description: 'Learning and development', suggestedPrompt: 'Write a training log entry about ' },
  { type: 'progress_review', label: 'Progress Review', description: 'Apprentice review meeting prep', suggestedPrompt: 'Prepare for my progress review covering ' },
  // Apprentices also benefit from some student types
  { type: 'reflection_log', label: 'Reflection Log', description: 'Learning journal entries', suggestedPrompt: 'Write a reflective entry about ' },
  { type: 'skills_evidence', label: 'Skills Evidence', description: 'Competency examples', suggestedPrompt: 'Document evidence of my skills in ' },
  { type: 'portfolio_summary', label: 'Portfolio Summary', description: 'Project showcase', suggestedPrompt: 'Create a portfolio summary featuring my work on ' },
  // And some employed types
  { type: 'performance_review', label: 'Performance Review', description: 'Self-assessment content', suggestedPrompt: 'Write my performance review focusing on ' },
  { type: 'project_summary', label: 'Project Summary', description: 'Project highlights', suggestedPrompt: 'Create a project summary highlighting ' },
];

// Study field specific types that extend STUDENT_TYPES
const STUDY_FIELD_TYPES: Record<string, GenerateTypeOption[]> = {
  computer_science: [
    { type: 'tech_resume', label: 'Technical Resume', description: 'Developer bullet points', suggestedPrompt: 'Generate resume bullet points highlighting my technical skills in ' },
    { type: 'tech_blog', label: 'Technical Blog', description: 'Share your learnings', suggestedPrompt: 'Create a technical blog post about ' },
  ],
  engineering: [
    { type: 'technical_report', label: 'Technical Report', description: 'Engineering documentation', suggestedPrompt: 'Generate a technical report covering ' },
  ],
  business: [
    { type: 'case_study', label: 'Case Study', description: 'Business case analysis', suggestedPrompt: 'Write a case study analysis about ' },
  ],
  science: [
    { type: 'research_summary', label: 'Research Summary', description: 'Lab and research findings', suggestedPrompt: 'Summarize my research findings on ' },
    { type: 'experiment_report', label: 'Experiment Report', description: 'Lab reports', suggestedPrompt: 'Write an experiment report detailing ' },
  ],
};

// Default types for unknown/custom industries
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
  // For students, use student-specific types
  if (employmentStatus === 'student') {
    const fieldSpecificTypes = studyField ? (STUDY_FIELD_TYPES[studyField] || []) : [];
    return [...STUDENT_TYPES, ...fieldSpecificTypes, ...UNIVERSAL_TYPES];
  }

  // For apprentices, use apprentice-specific types plus industry context
  if (employmentStatus === 'apprentice') {
    const industryTypes = industry ? (INDUSTRY_TYPES[industry] || []) : [];
    const fieldSpecificTypes = studyField ? (STUDY_FIELD_TYPES[studyField] || []) : [];
    // Combine apprentice types with relevant industry and study field types (avoid duplicates)
    const apprenticeCore = APPRENTICE_TYPES;
    const additionalTypes = [...industryTypes, ...fieldSpecificTypes].filter(
      t => !apprenticeCore.some(a => a.type === t.type)
    );
    return [...apprenticeCore, ...additionalTypes, ...UNIVERSAL_TYPES];
  }

  // For employed/job_seeking, use industry types
  const industryTypes = industry ? INDUSTRY_TYPES[industry] : null;
  const specificTypes = industryTypes || DEFAULT_TYPES;
  return [...specificTypes, ...UNIVERSAL_TYPES];
}

// Keep legacy export for backward compatibility
export const GENERATE_TYPE_OPTIONS: GenerateTypeOption[] = [...DEFAULT_TYPES, ...UNIVERSAL_TYPES];
