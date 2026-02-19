'use client';

import * as React from 'react';
import { Check, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  WIZARD_STEPS,
  isStepValid,
  getStepValidationErrors,
  getStepFromNumber,
  type WizardState,
  type WizardAction,
} from './useWizardState';

// Human-readable step labels
const STEP_LABELS: Record<(typeof WIZARD_STEPS)[number], string> = {
  basics: 'Basics',
  dates: 'Dates',
  venues: 'Venues',
  schedule: 'Schedule',
  tracks: 'Tracks',
  voting: 'Voting',
  branding: 'Branding',
  review: 'Review',
};

interface WizardNavigationProps {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  onNext?: () => void;
  onPrev?: () => void;
}

/**
 * Determines the status of a step based on current state
 */
function getStepStatus(
  stepIndex: number,
  currentStep: number,
  state: WizardState
): 'completed' | 'current' | 'upcoming' | 'error' {
  if (stepIndex === currentStep) {
    // Current step - check if it has errors displayed
    const stepName = getStepFromNumber(stepIndex);
    if (state.validation[stepName] && state.validation[stepName].length > 0) {
      return 'error';
    }
    return 'current';
  }
  if (stepIndex < currentStep) {
    // Previous steps - check if they're valid
    if (isStepValid(state, stepIndex)) {
      return 'completed';
    }
    return 'error';
  }
  return 'upcoming';
}

/**
 * Get the highest step the user can navigate to
 * (all previous steps must be valid)
 */
function getMaxNavigableStep(state: WizardState): number {
  for (let i = 0; i < WIZARD_STEPS.length; i++) {
    if (!isStepValid(state, i)) {
      return i;
    }
  }
  return WIZARD_STEPS.length - 1;
}

export function WizardNavigation({
  state,
  dispatch,
  onNext,
  onPrev,
}: WizardNavigationProps) {
  const { currentStep, validation } = state;
  const currentStepName = getStepFromNumber(currentStep);
  const currentStepErrors = validation[currentStepName] || [];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;
  const isCurrentStepValid = isStepValid(state, currentStep);

  const handleNext = React.useCallback(() => {
    // Check validation before proceeding
    const errors = getStepValidationErrors(state, currentStep);
    if (errors.length > 0) {
      dispatch({
        type: 'SET_VALIDATION_ERRORS',
        payload: { step: currentStepName, errors },
      });
      return;
    }
    dispatch({ type: 'NEXT_STEP' });
    onNext?.();
  }, [state, currentStep, currentStepName, dispatch, onNext]);

  const handlePrev = React.useCallback(() => {
    dispatch({ type: 'PREV_STEP' });
    onPrev?.();
  }, [dispatch, onPrev]);

  const handleStepClick = React.useCallback(
    (stepIndex: number) => {
      // Can only go to completed steps or current step
      const maxNavigable = getMaxNavigableStep(state);
      if (stepIndex <= maxNavigable && stepIndex !== currentStep) {
        dispatch({ type: 'SET_STEP', payload: stepIndex });
      }
    },
    [state, currentStep, dispatch]
  );

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="relative">
        {/* Desktop: Horizontal stepper */}
        <div className="hidden md:block">
          <div className="flex items-center justify-between">
            {WIZARD_STEPS.map((stepName, index) => {
              const status = getStepStatus(index, currentStep, state);
              const isClickable =
                index <= getMaxNavigableStep(state) && index !== currentStep;

              return (
                <React.Fragment key={stepName}>
                  {/* Step circle + label */}
                  <button
                    type="button"
                    onClick={() => handleStepClick(index)}
                    disabled={!isClickable}
                    className={cn(
                      'flex flex-col items-center gap-2 transition-colors',
                      isClickable
                        ? 'cursor-pointer hover:opacity-80'
                        : 'cursor-default',
                      status === 'upcoming' && 'opacity-50'
                    )}
                    aria-current={status === 'current' ? 'step' : undefined}
                  >
                    {/* Circle */}
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                        status === 'completed' &&
                          'border-primary bg-primary text-primary-foreground',
                        status === 'current' &&
                          'border-primary bg-primary/10 text-primary',
                        status === 'upcoming' &&
                          'border-muted-foreground/30 bg-background text-muted-foreground',
                        status === 'error' &&
                          'border-destructive bg-destructive/10 text-destructive'
                      )}
                    >
                      {status === 'completed' ? (
                        <Check className="h-5 w-5" />
                      ) : status === 'error' ? (
                        <AlertCircle className="h-5 w-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    {/* Label */}
                    <span
                      className={cn(
                        'text-xs font-medium',
                        status === 'current' && 'text-primary',
                        status === 'completed' && 'text-foreground',
                        status === 'upcoming' && 'text-muted-foreground',
                        status === 'error' && 'text-destructive'
                      )}
                    >
                      {STEP_LABELS[stepName]}
                    </span>
                  </button>

                  {/* Connector line */}
                  {index < WIZARD_STEPS.length - 1 && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 mx-2',
                        index < currentStep ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Mobile: Compact stepper */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {WIZARD_STEPS.length}
            </span>
            <span className="text-sm font-medium">
              {STEP_LABELS[currentStepName]}
            </span>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2">
            {WIZARD_STEPS.map((stepName, index) => {
              const status = getStepStatus(index, currentStep, state);
              const isClickable =
                index <= getMaxNavigableStep(state) && index !== currentStep;

              return (
                <button
                  key={stepName}
                  type="button"
                  onClick={() => handleStepClick(index)}
                  disabled={!isClickable}
                  className={cn(
                    'h-2.5 rounded-full transition-all',
                    status === 'current' ? 'w-8 bg-primary' : 'w-2.5',
                    status === 'completed' && 'bg-primary',
                    status === 'upcoming' && 'bg-muted',
                    status === 'error' && 'bg-destructive',
                    isClickable && 'cursor-pointer hover:opacity-80'
                  )}
                  aria-label={`Go to step ${index + 1}: ${STEP_LABELS[stepName]}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {currentStepErrors.length > 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">
                Please fix the following errors:
              </p>
              <ul className="text-sm text-destructive/90 list-disc list-inside space-y-1">
                {currentStepErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          {!isFirstStep && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrev}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          )}
        </div>

        <div>
          <Button
            type="button"
            onClick={handleNext}
            disabled={!isCurrentStepValid}
            className="gap-2"
          >
            {isLastStep ? 'Review' : 'Next'}
            {!isLastStep && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
