/**
 * Slug generation and validation utilities
 *
 * Used for creating URL-friendly event slugs with validation
 * and alternative suggestions when conflicts exist.
 */

// ============================================================================
// Constants
// ============================================================================

const MIN_SLUG_LENGTH = 3;
const MAX_SLUG_LENGTH = 50;

// Only lowercase letters, numbers, and hyphens
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Reserved slugs that cannot be used
const RESERVED_SLUGS = [
  'admin',
  'api',
  'auth',
  'create',
  'dashboard',
  'events',
  'help',
  'login',
  'logout',
  'new',
  'profile',
  'register',
  'settings',
  'signup',
];

// ============================================================================
// Types
// ============================================================================

export interface SlugValidationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// Functions
// ============================================================================

/**
 * Generate a URL-friendly slug from a name
 *
 * @param name - The event name to convert
 * @returns A lowercase, hyphenated slug
 *
 * @example
 * generateSlug("EthBoulder 2026") // => "ethboulder-2026"
 * generateSlug("My Event!") // => "my-event"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Remove accents/diacritics
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace non-alphanumeric characters with hyphens
    .replace(/[^\w\s-]/g, '')
    // Replace whitespace with hyphens
    .replace(/\s+/g, '-')
    // Collapse multiple hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Truncate to max length
    .substring(0, MAX_SLUG_LENGTH);
}

/**
 * Validate that a slug matches the required format
 *
 * Rules:
 * - 3-50 characters
 * - Lowercase letters, numbers, and hyphens only
 * - Cannot start or end with a hyphen
 * - Cannot have consecutive hyphens
 * - Cannot be a reserved slug
 *
 * @param slug - The slug to validate
 * @returns Validation result with optional error message
 */
export function isValidSlugFormat(slug: string): SlugValidationResult {
  // Check for empty or whitespace
  if (!slug || !slug.trim()) {
    return { valid: false, error: 'Slug is required' };
  }

  // Check minimum length
  if (slug.length < MIN_SLUG_LENGTH) {
    return {
      valid: false,
      error: `Slug must be at least ${MIN_SLUG_LENGTH} characters`
    };
  }

  // Check maximum length
  if (slug.length > MAX_SLUG_LENGTH) {
    return {
      valid: false,
      error: `Slug must be at most ${MAX_SLUG_LENGTH} characters`
    };
  }

  // Check for uppercase characters
  if (slug !== slug.toLowerCase()) {
    return { valid: false, error: 'Slug must be lowercase' };
  }

  // Check format (lowercase, numbers, single hyphens between words)
  if (!SLUG_PATTERN.test(slug)) {
    return {
      valid: false,
      error: 'Slug can only contain lowercase letters, numbers, and hyphens (no consecutive hyphens or leading/trailing hyphens)'
    };
  }

  // Check for reserved slugs
  if (RESERVED_SLUGS.includes(slug)) {
    return { valid: false, error: 'This slug is reserved and cannot be used' };
  }

  return { valid: true };
}

/**
 * Generate alternative slug suggestions when a slug is taken
 *
 * Strategies:
 * 1. Append incrementing numbers (slug-2, slug-3)
 * 2. Append current year (slug-YYYY)
 * 3. Append random suffix
 *
 * @param slug - The base slug to create alternatives for
 * @returns Array of 3 alternative slug suggestions
 */
export function suggestAlternativeSlugs(slug: string): string[] {
  const suggestions: string[] = [];
  const currentYear = new Date().getFullYear();

  // Remove any existing numeric suffix to get base slug
  const baseSlug = slug.replace(/-\d+$/, '');

  // Strategy 1: Append incrementing numbers
  for (let i = 2; suggestions.length < 2 && i <= 10; i++) {
    const suggestion = `${baseSlug}-${i}`;
    if (suggestion.length <= MAX_SLUG_LENGTH) {
      suggestions.push(suggestion);
    }
  }

  // Strategy 2: Append current year (if not already present)
  const yearSuffix = `-${currentYear}`;
  if (!slug.endsWith(yearSuffix) && !slug.includes(String(currentYear))) {
    const yearSuggestion = `${baseSlug}${yearSuffix}`;
    if (yearSuggestion.length <= MAX_SLUG_LENGTH) {
      suggestions.push(yearSuggestion);
    }
  }

  // Fallback: If we still need more suggestions, use random suffix
  while (suggestions.length < 3) {
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const suggestion = `${baseSlug}-${randomSuffix}`;
    if (suggestion.length <= MAX_SLUG_LENGTH && !suggestions.includes(suggestion)) {
      suggestions.push(suggestion);
    }
  }

  return suggestions.slice(0, 3);
}

/**
 * Normalize a user-input slug to valid format
 *
 * @param input - Raw user input
 * @returns Normalized slug (lowercase, valid characters only)
 */
export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, MAX_SLUG_LENGTH);
}
