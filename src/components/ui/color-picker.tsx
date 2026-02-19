'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { Plus } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface ColorPickerProps {
  /** Current hex color value (e.g., "#3B82F6") */
  value: string;
  /** Callback when color changes */
  onChange: (color: string) => void;
  /** Optional preset colors to display as swatches */
  presets?: string[];
  /** Optional label for the color picker */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Default preset colors for the color picker */
export const DEFAULT_PRESETS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

/** Human-readable names for default presets */
const PRESET_NAMES: Record<string, string> = {
  '#3B82F6': 'Blue',
  '#10B981': 'Emerald',
  '#F59E0B': 'Amber',
  '#EF4444': 'Red',
  '#8B5CF6': 'Violet',
  '#EC4899': 'Pink',
  '#06B6D4': 'Cyan',
  '#84CC16': 'Lime',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate if a string is a valid 6-digit hex color
 */
function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Normalize hex color to uppercase
 */
function normalizeHexColor(color: string): string {
  return color.toUpperCase();
}

/**
 * Get a human-readable name for a color, or return the hex value
 */
function getColorName(color: string): string {
  const normalized = normalizeHexColor(color);
  return PRESET_NAMES[normalized] || normalized;
}

// ============================================================================
// Component
// ============================================================================

/**
 * A reusable color picker component with preset swatches, custom hex input,
 * and native color picker fallback.
 */
export function ColorPicker({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  label,
  className,
}: ColorPickerProps) {
  const [showCustomInput, setShowCustomInput] = React.useState(false);
  const [customValue, setCustomValue] = React.useState(value);
  const [isValid, setIsValid] = React.useState(true);

  const colorInputRef = React.useRef<HTMLInputElement>(null);

  // Check if current value is a preset color
  const normalizedPresets = presets.map((c) => normalizeHexColor(c));
  const isPresetColor = normalizedPresets.includes(normalizeHexColor(value));

  // Sync custom input value when prop changes externally
  React.useEffect(() => {
    setCustomValue(value);
    setIsValid(isValidHexColor(value));
  }, [value]);

  // Show custom input if value is not a preset
  React.useEffect(() => {
    if (!isPresetColor && value && isValidHexColor(value)) {
      setShowCustomInput(true);
    }
  }, [isPresetColor, value]);

  const handlePresetClick = (color: string) => {
    const normalized = normalizeHexColor(color);
    onChange(normalized);
    setCustomValue(normalized);
    setIsValid(true);
    setShowCustomInput(false);
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    // Ensure it starts with #
    if (!newValue.startsWith('#')) {
      newValue = '#' + newValue;
    }

    // Limit to 7 characters (#RRGGBB) and uppercase
    newValue = newValue.substring(0, 7).toUpperCase();

    setCustomValue(newValue);

    // Validate and update parent
    if (isValidHexColor(newValue)) {
      setIsValid(true);
      onChange(newValue);
    } else {
      // Allow partial input without showing error
      setIsValid(newValue.length <= 1 || newValue === '#');
    }
  };

  const handleCustomInputBlur = () => {
    // Reset to current valid value if invalid
    if (!isValidHexColor(customValue)) {
      setCustomValue(value);
      setIsValid(true);
    }
  };

  const handleNativeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = normalizeHexColor(e.target.value);
    onChange(newColor);
    setCustomValue(newColor);
    setIsValid(true);
  };

  const handleCustomButtonClick = () => {
    setShowCustomInput(!showCustomInput);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Label */}
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}

      {/* Preset Swatches */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Color presets">
        {presets.map((color) => {
          const normalized = normalizeHexColor(color);
          const isSelected = normalizeHexColor(value) === normalized;
          const colorName = getColorName(color);

          return (
            <button
              key={color}
              type="button"
              onClick={() => handlePresetClick(color)}
              className={cn(
                'w-8 h-8 rounded-full border-2 transition-all',
                'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                isSelected
                  ? 'border-foreground ring-2 ring-ring ring-offset-2'
                  : 'border-transparent'
              )}
              style={{ backgroundColor: color }}
              title={colorName}
              aria-label={`Select ${colorName} color`}
              aria-pressed={isSelected}
            />
          );
        })}

        {/* Custom Color Button */}
        <button
          type="button"
          onClick={handleCustomButtonClick}
          className={cn(
            'w-8 h-8 rounded-full border-2 border-dashed transition-all',
            'hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'flex items-center justify-center text-muted-foreground',
            showCustomInput || (!isPresetColor && value)
              ? 'border-primary text-primary'
              : 'border-muted-foreground'
          )}
          title="Custom color"
          aria-label="Enter custom color"
          aria-expanded={showCustomInput}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Custom Color Input */}
      {(showCustomInput || (!isPresetColor && value)) && (
        <div className="flex items-center gap-2">
          {/* Live Preview / Native Color Picker */}
          <input
            ref={colorInputRef}
            type="color"
            value={isValidHexColor(customValue) ? customValue : value}
            onChange={handleNativeColorChange}
            className={cn(
              'w-10 h-10 rounded-lg border cursor-pointer flex-shrink-0',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
            )}
            aria-label="Open color picker"
          />

          {/* Hex Input */}
          <Input
            type="text"
            value={customValue}
            onChange={handleCustomInputChange}
            onBlur={handleCustomInputBlur}
            placeholder="#RRGGBB"
            className={cn('font-mono w-28', !isValid && 'border-destructive')}
            maxLength={7}
            aria-label="Hex color value"
            aria-invalid={!isValid}
          />
        </div>
      )}

      {/* Validation Error */}
      {!isValid && customValue.length > 1 && (
        <p className="text-xs text-destructive" role="alert">
          Please enter a valid hex color (e.g., #FF5500)
        </p>
      )}
    </div>
  );
}

export default ColorPicker;
