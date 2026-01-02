/**
 * Post-processing REDACTION utility
 *
 * Provides regex-based PII detection as a fallback layer of protection.
 * Catches sensitive information that the AI might miss in its responses.
 */

// Common PII regex patterns
const PII_PATTERNS = {
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // Phone numbers (various formats)
  phone: /\b(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,

  // Social Security Numbers
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,

  // IPv4 addresses
  ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,

  // Credit card numbers (basic pattern)
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,

  // URLs (http/https)
  url: /https?:\/\/[^\s]+/g,

  // Financial amounts with context (conservative - only redact if followed by specific keywords)
  salaryAmount: /\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:salary|compensation|pay|income)/gi,
  dealAmount: /\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:deal|contract|agreement|sale)/gi,
};

export interface RedactionOptions {
  /** If true, redact more aggressively */
  aggressive?: boolean;
  /** Keep JSON structure intact */
  preserveStructure?: boolean;
}

/**
 * Redact PII from text using regex patterns
 * @param text Text to redact
 * @param options Redaction options
 * @returns Text with PII replaced by placeholders
 */
export function redactPII(text: string, options: RedactionOptions = {}): string {
  let redacted = text;

  // Apply regex patterns
  redacted = redacted.replace(PII_PATTERNS.email, '[EMAIL]');
  redacted = redacted.replace(PII_PATTERNS.phone, '[PHONE]');
  redacted = redacted.replace(PII_PATTERNS.ssn, '[SSN]');
  redacted = redacted.replace(PII_PATTERNS.ipv4, '[IP]');
  redacted = redacted.replace(PII_PATTERNS.creditCard, '[ACCOUNT]');

  // Financial amounts (contextual - only when followed by keywords)
  redacted = redacted.replace(PII_PATTERNS.salaryAmount, '[SALARY]');
  redacted = redacted.replace(PII_PATTERNS.dealAmount, '[AMOUNT] deal');

  // URLs (but preserve [URL] placeholders and generic domains)
  redacted = redacted.replace(PII_PATTERNS.url, (match) => {
    // Don't redact generic/safe domains
    if (match.includes('example.com') || match.includes('localhost')) {
      return match;
    }
    return '[URL]';
  });

  return redacted;
}

/**
 * Recursively redact PII from JSON objects
 * @param obj Object to redact (can be any type)
 * @returns Object with all string values redacted
 */
export function redactJSON(obj: any): any {
  // String: apply redaction
  if (typeof obj === 'string') {
    return redactPII(obj);
  }

  // Array: recursively redact each item
  if (Array.isArray(obj)) {
    return obj.map(item => redactJSON(item));
  }

  // Object: recursively redact each property
  if (obj && typeof obj === 'object') {
    const redactedObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      redactedObj[key] = redactJSON(value);
    }
    return redactedObj;
  }

  // Primitive types (number, boolean, null): return as-is
  return obj;
}

/**
 * Detect unredacted PII in text (for validation/logging)
 * @param text Text to check
 * @returns Array of detected PII issues
 */
export function detectUnredactedPII(text: string): string[] {
  const issues: string[] = [];

  // Reset regex lastIndex (important for global regex)
  PII_PATTERNS.email.lastIndex = 0;
  PII_PATTERNS.phone.lastIndex = 0;
  PII_PATTERNS.ssn.lastIndex = 0;

  if (PII_PATTERNS.email.test(text)) {
    issues.push('Email address detected');
  }

  PII_PATTERNS.phone.lastIndex = 0; // Reset after test
  if (PII_PATTERNS.phone.test(text)) {
    issues.push('Phone number detected');
  }

  PII_PATTERNS.ssn.lastIndex = 0; // Reset after test
  if (PII_PATTERNS.ssn.test(text)) {
    issues.push('SSN detected');
  }

  return issues;
}
