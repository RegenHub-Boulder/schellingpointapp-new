'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useWizardState, type WizardState } from './useWizardState';

// ============================================================================
// Constants
// ============================================================================

export const WIZARD_STORAGE_KEY = 'schellingpoint-event-wizard-draft';
const SCHEMA_VERSION = 2; // Bumped to clear old drafts with incompatible data structures

// ============================================================================
// Types
// ============================================================================

interface StoredWizardDraft {
  version: number;
  savedAt: string;
  state: Partial<WizardState>;
}

// ============================================================================
// Storage Utilities
// ============================================================================

/**
 * Check if localStorage is available
 * Handles SSR, private browsing mode, and storage restrictions
 */
function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Save wizard draft to localStorage
 */
export function saveWizardDraft(state: WizardState): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    const draft: StoredWizardDraft = {
      version: SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      state: {
        currentStep: state.currentStep,
        basics: state.basics,
        dates: state.dates,
        venues: state.venues,
        schedule: state.schedule,
        tracks: state.tracks,
        voting: state.voting,
        branding: state.branding,
        // Don't persist validation errors
      },
    };

    window.localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    // Silently fail - localStorage might be full or disabled
    console.warn('Failed to save wizard draft:', error);
  }
}

/**
 * Load wizard draft from localStorage
 * Returns null if no draft exists, storage is unavailable, or data is corrupted
 */
export function loadWizardDraft(): Partial<WizardState> | null {
  if (!isLocalStorageAvailable()) {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(WIZARD_STORAGE_KEY);

    if (!stored) {
      return null;
    }

    const draft: StoredWizardDraft = JSON.parse(stored);

    // Version check for future migrations
    if (draft.version !== SCHEMA_VERSION) {
      // For now, discard incompatible versions
      // In the future, we could add migration logic here
      console.warn(`Wizard draft version mismatch: expected ${SCHEMA_VERSION}, got ${draft.version}`);
      clearWizardDraft();
      return null;
    }

    // Validate basic structure
    if (!draft.state || typeof draft.state !== 'object') {
      console.warn('Invalid wizard draft structure');
      clearWizardDraft();
      return null;
    }

    return draft.state;
  } catch (error) {
    // JSON parse error or other issues
    console.warn('Failed to load wizard draft:', error);
    clearWizardDraft();
    return null;
  }
}

/**
 * Clear wizard draft from localStorage
 */
export function clearWizardDraft(): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    window.localStorage.removeItem(WIZARD_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear wizard draft:', error);
  }
}

/**
 * Check if a wizard draft exists
 */
export function hasWizardDraft(): boolean {
  if (!isLocalStorageAvailable()) {
    return false;
  }

  try {
    return window.localStorage.getItem(WIZARD_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Get the timestamp when the draft was last saved
 */
export function getWizardDraftTimestamp(): Date | null {
  if (!isLocalStorageAvailable()) {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const draft: StoredWizardDraft = JSON.parse(stored);
    return new Date(draft.savedAt);
  } catch {
    return null;
  }
}

// ============================================================================
// Debounce Utility
// ============================================================================

function debounce<T extends (...args: Parameters<T>) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Enhanced wizard state hook with localStorage persistence
 *
 * Features:
 * - Loads saved draft from localStorage on mount
 * - Auto-saves state changes to localStorage (debounced 500ms)
 * - Provides clearDraft() to remove saved state
 * - Handles SSR, private browsing, and storage errors gracefully
 */
export function useWizardStateWithPersistence() {
  const wizard = useWizardState();
  const { state, loadState, reset } = wizard;

  // Track if we've loaded the initial state
  const hasLoadedRef = useRef(false);
  // Track if state has been modified (triggers re-render for UI feedback)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Store previous state for comparison
  const prevStateRef = useRef<WizardState | null>(null);

  // Create debounced save function (stable reference)
  const debouncedSave = useRef(
    debounce((stateToSave: WizardState) => {
      saveWizardDraft(stateToSave);
    }, 500)
  ).current;

  // Load saved draft on mount
  useEffect(() => {
    if (hasLoadedRef.current) {
      return;
    }
    hasLoadedRef.current = true;

    const savedDraft = loadWizardDraft();
    if (savedDraft) {
      loadState(savedDraft);
      // Mark as having unsaved changes since we loaded existing data
      setHasUnsavedChanges(true);
    }

    // Store initial state for comparison
    prevStateRef.current = state;
  }, [loadState, state]);

  // Auto-save on state changes
  useEffect(() => {
    // Skip if we haven't loaded yet
    if (!hasLoadedRef.current) {
      return;
    }

    // Compare with previous state to detect changes
    const prevState = prevStateRef.current;
    prevStateRef.current = state;

    // Check if state actually changed (excluding validation which we don't persist)
    if (prevState) {
      const hasChanged =
        state.currentStep !== prevState.currentStep ||
        JSON.stringify(state.basics) !== JSON.stringify(prevState.basics) ||
        JSON.stringify(state.dates) !== JSON.stringify(prevState.dates) ||
        JSON.stringify(state.venues) !== JSON.stringify(prevState.venues) ||
        JSON.stringify(state.schedule) !== JSON.stringify(prevState.schedule) ||
        JSON.stringify(state.tracks) !== JSON.stringify(prevState.tracks) ||
        JSON.stringify(state.voting) !== JSON.stringify(prevState.voting) ||
        JSON.stringify(state.branding) !== JSON.stringify(prevState.branding);

      if (hasChanged) {
        setHasUnsavedChanges(true);
        debouncedSave(state);
      }
    }
  }, [state, debouncedSave]);

  // Clear draft and optionally reset state
  const clearDraft = useCallback((resetState = false) => {
    clearWizardDraft();
    setHasUnsavedChanges(false);
    if (resetState) {
      reset();
    }
  }, [reset]);

  // Check if there's a saved draft
  const hasSavedDraft = useCallback(() => {
    return hasWizardDraft();
  }, []);

  // Get draft timestamp
  const getDraftTimestamp = useCallback(() => {
    return getWizardDraftTimestamp();
  }, []);

  return {
    ...wizard,
    // Additional persistence methods
    clearDraft,
    hasSavedDraft,
    getDraftTimestamp,
    // Expose whether state has been modified
    hasUnsavedChanges,
  };
}
