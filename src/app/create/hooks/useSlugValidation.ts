'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ValidationResult {
  available: boolean;
  suggestions?: string[];
  error?: string;
}

export interface UseSlugValidationReturn {
  /**
   * Validate a slug for availability and format
   * Debounced - will wait before making API call
   */
  validateSlug: (slug: string) => Promise<ValidationResult>;

  /**
   * Whether a validation request is in progress
   */
  isValidating: boolean;

  /**
   * The most recent validation result
   */
  lastResult: ValidationResult | null;

  /**
   * Clear the last result and any pending validations
   */
  reset: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEBOUNCE_DELAY = 400; // ms
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for validating event slugs with debouncing and caching
 *
 * Features:
 * - Debounced validation (400ms delay)
 * - Result caching to avoid redundant API calls
 * - AbortController for canceling pending requests
 * - Loading state tracking
 *
 * @example
 * ```tsx
 * const { validateSlug, isValidating, lastResult } = useSlugValidation();
 *
 * const handleSlugChange = async (slug: string) => {
 *   const result = await validateSlug(slug);
 *   if (!result.available) {
 *     console.log('Suggestions:', result.suggestions);
 *   }
 * };
 * ```
 */
export function useSlugValidation(): UseSlugValidationReturn {
  const [isValidating, setIsValidating] = useState(false);
  const [lastResult, setLastResult] = useState<ValidationResult | null>(null);

  // Cache for validation results: slug -> { result, timestamp }
  const cacheRef = useRef<Map<string, { result: ValidationResult; timestamp: number }>>(
    new Map()
  );

  // AbortController for canceling pending requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce timer
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Pending promise resolver for debounced calls
  const pendingResolveRef = useRef<((result: ValidationResult) => void) | null>(null);

  /**
   * Check if a cached result is still valid
   */
  const getCachedResult = useCallback((slug: string): ValidationResult | null => {
    const cached = cacheRef.current.get(slug);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > CACHE_TTL;
    if (isExpired) {
      cacheRef.current.delete(slug);
      return null;
    }

    return cached.result;
  }, []);

  /**
   * Store a result in cache
   */
  const setCachedResult = useCallback((slug: string, result: ValidationResult): void => {
    cacheRef.current.set(slug, { result, timestamp: Date.now() });

    // Limit cache size to prevent memory issues
    if (cacheRef.current.size > 100) {
      const oldestKey = cacheRef.current.keys().next().value;
      if (oldestKey) {
        cacheRef.current.delete(oldestKey);
      }
    }
  }, []);

  /**
   * Make the actual API call to validate the slug
   */
  const fetchValidation = useCallback(async (
    slug: string,
    signal: AbortSignal
  ): Promise<ValidationResult> => {
    const response = await fetch('/api/events/validate-slug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
      signal,
    });

    const data = await response.json();

    // Handle non-2xx responses
    if (!response.ok) {
      return {
        available: false,
        error: data.error || 'Failed to validate slug',
      };
    }

    return data as ValidationResult;
  }, []);

  /**
   * Validate a slug with debouncing and caching
   */
  const validateSlug = useCallback(async (slug: string): Promise<ValidationResult> => {
    // Cancel any pending debounced call
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Resolve any pending promise with error
    if (pendingResolveRef.current) {
      pendingResolveRef.current({ available: false, error: 'Validation cancelled' });
      pendingResolveRef.current = null;
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Handle empty slug
    if (!slug || !slug.trim()) {
      const result: ValidationResult = { available: false, error: 'Slug is required' };
      setLastResult(result);
      setIsValidating(false);
      return result;
    }

    // Check cache first
    const cachedResult = getCachedResult(slug);
    if (cachedResult) {
      setLastResult(cachedResult);
      setIsValidating(false);
      return cachedResult;
    }

    // Set validating state
    setIsValidating(true);

    // Return a promise that resolves after debounce
    return new Promise((resolve) => {
      pendingResolveRef.current = resolve;

      debounceTimerRef.current = setTimeout(async () => {
        // Create new AbortController
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
          const result = await fetchValidation(slug, controller.signal);

          // Cache the result
          setCachedResult(slug, result);

          // Update state
          setLastResult(result);
          setIsValidating(false);

          // Resolve the promise
          if (pendingResolveRef.current) {
            pendingResolveRef.current(result);
            pendingResolveRef.current = null;
          }
        } catch (error) {
          // Handle abort
          if (error instanceof Error && error.name === 'AbortError') {
            // Request was cancelled, don't update state
            return;
          }

          // Handle other errors
          const errorResult: ValidationResult = {
            available: false,
            error: 'Failed to validate slug. Please try again.',
          };

          setLastResult(errorResult);
          setIsValidating(false);

          if (pendingResolveRef.current) {
            pendingResolveRef.current(errorResult);
            pendingResolveRef.current = null;
          }
        }
      }, DEBOUNCE_DELAY);
    });
  }, [getCachedResult, setCachedResult, fetchValidation]);

  /**
   * Reset validation state
   */
  const reset = useCallback(() => {
    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Clear pending promise
    pendingResolveRef.current = null;

    // Reset state
    setIsValidating(false);
    setLastResult(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    validateSlug,
    isValidating,
    lastResult,
    reset,
  };
}

export default useSlugValidation;
