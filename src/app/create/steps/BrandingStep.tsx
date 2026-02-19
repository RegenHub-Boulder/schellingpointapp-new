'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { WizardState, WizardAction, ThemeMode } from '../useWizardState';

// ============================================================================
// Types
// ============================================================================

interface BrandingStepProps {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

interface ThemePreset {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
}

// ============================================================================
// Constants
// ============================================================================

const THEME_PRESETS: ThemePreset[] = [
  { name: 'Default', primary: '#0ea5e9', secondary: '#64748b', accent: '#f59e0b' },
  { name: 'Forest', primary: '#22c55e', secondary: '#84cc16', accent: '#fbbf24' },
  { name: 'Sunset', primary: '#f97316', secondary: '#ef4444', accent: '#eab308' },
  { name: 'Ocean', primary: '#3b82f6', secondary: '#06b6d4', accent: '#8b5cf6' },
  { name: 'Midnight', primary: '#6366f1', secondary: '#8b5cf6', accent: '#ec4899' },
];

const THEME_MODES: { value: ThemeMode; label: string; description: string }[] = [
  { value: 'light', label: 'Light', description: 'Always use light mode' },
  { value: 'dark', label: 'Dark', description: 'Always use dark mode' },
  { value: 'system', label: 'System', description: 'Follow user preference' },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate if a string is a valid hex color
 */
function isValidHexColor(color: string): boolean {
  return /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(color);
}

/**
 * Normalize a hex input (adds # if missing)
 */
function normalizeHexInput(input: string): string {
  const cleaned = input.trim();
  if (!cleaned) return '';
  if (cleaned.startsWith('#')) return cleaned;
  return `#${cleaned}`;
}

/**
 * Check if current theme matches a preset
 */
function isPresetSelected(theme: { primary: string; secondary: string; accent: string }, preset: ThemePreset): boolean {
  return (
    theme.primary.toLowerCase() === preset.primary.toLowerCase() &&
    theme.secondary.toLowerCase() === preset.secondary.toLowerCase() &&
    theme.accent.toLowerCase() === preset.accent.toLowerCase()
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface ImageUploadProps {
  label: string;
  description: string;
  aspectHint?: string;
  previewUrl: string | null;
  onFileSelect: (file: File | null) => void;
  accept?: string;
}

function ImageUpload({ label, description, aspectHint, previewUrl, onFileSelect, accept = 'image/*' }: ImageUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = React.useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create local preview URL
      const url = URL.createObjectURL(file);
      setLocalPreview(url);
      onFileSelect(file);
    }
  };

  const handleRemove = () => {
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
    }
    setLocalPreview(null);
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  const displayPreview = localPreview || previewUrl;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-sm text-muted-foreground">{description}</p>
      {aspectHint && (
        <p className="text-xs text-muted-foreground italic">{aspectHint}</p>
      )}

      <div className="mt-2">
        {displayPreview ? (
          <div className="relative group">
            <img
              src={displayPreview}
              alt={`${label} preview`}
              className="max-h-40 rounded-lg border object-contain"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
              aria-label="Remove image"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mb-2 text-muted-foreground"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
              <p className="text-sm text-muted-foreground">
                Click to upload or drag and drop
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={accept}
              onChange={handleFileChange}
            />
          </label>
        )}
      </div>
    </div>
  );
}

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const [inputValue, setInputValue] = React.useState(value);
  const [isValid, setIsValid] = React.useState(true);

  // Sync input value when prop changes
  React.useEffect(() => {
    setInputValue(value);
    setIsValid(isValidHexColor(value));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);

    const normalized = normalizeHexInput(raw);
    if (isValidHexColor(normalized)) {
      setIsValid(true);
      onChange(normalized);
    } else {
      setIsValid(raw === '' || raw === '#');
    }
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setInputValue(color);
    setIsValid(true);
    onChange(color);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          value={isValidHexColor(value) ? value : '#000000'}
          onChange={handleColorChange}
          className="w-10 h-10 rounded-lg border cursor-pointer"
        />
        <Input
          value={inputValue}
          onChange={handleInputChange}
          placeholder="#000000"
          className={cn('font-mono', !isValid && 'border-destructive')}
          maxLength={7}
        />
      </div>
      {!isValid && inputValue.length > 1 && (
        <p className="text-xs text-destructive">Please enter a valid hex color (e.g., #FF5500)</p>
      )}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function BrandingStep({ state, dispatch }: BrandingStepProps) {
  const { branding } = state;

  // Handlers for theme updates
  const handleThemeColorChange = (colorType: 'primary' | 'secondary' | 'accent') => (color: string) => {
    dispatch({
      type: 'UPDATE_BRANDING',
      payload: {
        theme: {
          ...branding.theme,
          [colorType]: color,
        },
      },
    });
  };

  const handleThemeModeChange = (mode: ThemeMode) => {
    dispatch({
      type: 'UPDATE_BRANDING',
      payload: {
        theme: {
          ...branding.theme,
          mode,
        },
      },
    });
  };

  const handlePresetSelect = (preset: ThemePreset) => {
    dispatch({
      type: 'UPDATE_BRANDING',
      payload: {
        theme: {
          ...branding.theme,
          primary: preset.primary,
          secondary: preset.secondary,
          accent: preset.accent,
        },
      },
    });
  };

  // Handlers for social updates
  const handleSocialChange = (field: keyof typeof branding.social) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    dispatch({
      type: 'UPDATE_BRANDING',
      payload: {
        social: {
          ...branding.social,
          [field]: e.target.value,
        },
      },
    });
  };

  // File handlers (placeholder - actual upload will happen in P2.9.3)
  const handleLogoSelect = (_file: File | null) => {
    // For now, just clear the URL if file is removed
    // In P2.9.3, this will handle actual upload
    if (!_file) {
      dispatch({
        type: 'UPDATE_BRANDING',
        payload: { logoUrl: null },
      });
    }
    // Note: File is selected but not uploaded yet
    // The actual upload logic will be implemented in P2.9.3
  };

  const handleBannerSelect = (_file: File | null) => {
    // For now, just clear the URL if file is removed
    // In P2.9.3, this will handle actual upload
    if (!_file) {
      dispatch({
        type: 'UPDATE_BRANDING',
        payload: { bannerUrl: null },
      });
    }
    // Note: File is selected but not uploaded yet
    // The actual upload logic will be implemented in P2.9.3
  };

  // Check if current colors match any preset
  const currentPreset = THEME_PRESETS.find((preset) =>
    isPresetSelected(branding.theme, preset)
  );
  const isCustomTheme = !currentPreset;

  return (
    <div className="space-y-6">
      {/* Logo & Banner Uploads */}
      <Card>
        <CardHeader>
          <CardTitle>Event Images</CardTitle>
          <CardDescription>
            Add a logo and banner image to customize your event appearance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ImageUpload
            label="Logo"
            description="Your event logo, displayed in navigation and cards"
            aspectHint="Recommended: Square image (1:1 ratio)"
            previewUrl={branding.logoUrl}
            onFileSelect={handleLogoSelect}
          />

          <ImageUpload
            label="Banner Image"
            description="A banner image for your event page header"
            aspectHint="Recommended: 16:9 aspect ratio (e.g., 1920x1080)"
            previewUrl={branding.bannerUrl}
            onFileSelect={handleBannerSelect}
          />
        </CardContent>
      </Card>

      {/* Color Theme */}
      <Card>
        <CardHeader>
          <CardTitle>Color Theme</CardTitle>
          <CardDescription>
            Choose a preset theme or customize your own colors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Presets */}
          <div className="space-y-3">
            <Label>Theme Presets</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {THEME_PRESETS.map((preset) => {
                const isSelected = isPresetSelected(branding.theme, preset);
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className={cn(
                      'flex flex-col items-center p-3 rounded-lg border-2 transition-all',
                      'hover:border-primary/50 hover:bg-accent/50',
                      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                      isSelected ? 'border-primary bg-primary/5' : 'border-border'
                    )}
                  >
                    <div className="flex gap-1 mb-2">
                      <div
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: preset.primary }}
                        title="Primary"
                      />
                      <div
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: preset.secondary }}
                        title="Secondary"
                      />
                      <div
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: preset.accent }}
                        title="Accent"
                      />
                    </div>
                    <span className="text-sm font-medium">{preset.name}</span>
                  </button>
                );
              })}
              {/* Custom option */}
              <button
                type="button"
                onClick={() => {}} // Custom is implicit when colors don't match presets
                className={cn(
                  'flex flex-col items-center p-3 rounded-lg border-2 transition-all',
                  'hover:border-primary/50 hover:bg-accent/50',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  isCustomTheme ? 'border-primary bg-primary/5' : 'border-border'
                )}
              >
                <div className="flex gap-1 mb-2">
                  <div
                    className="w-6 h-6 rounded-full border"
                    style={{ backgroundColor: branding.theme.primary }}
                  />
                  <div
                    className="w-6 h-6 rounded-full border"
                    style={{ backgroundColor: branding.theme.secondary }}
                  />
                  <div
                    className="w-6 h-6 rounded-full border"
                    style={{ backgroundColor: branding.theme.accent }}
                  />
                </div>
                <span className="text-sm font-medium">Custom</span>
              </button>
            </div>
          </div>

          {/* Custom Color Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ColorPicker
              label="Primary Color"
              value={branding.theme.primary}
              onChange={handleThemeColorChange('primary')}
            />
            <ColorPicker
              label="Secondary Color"
              value={branding.theme.secondary}
              onChange={handleThemeColorChange('secondary')}
            />
            <ColorPicker
              label="Accent Color"
              value={branding.theme.accent}
              onChange={handleThemeColorChange('accent')}
            />
          </div>

          {/* Theme Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex flex-wrap gap-2 mb-3">
                <div
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                  style={{ backgroundColor: branding.theme.primary }}
                >
                  Primary Button
                </div>
                <div
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                  style={{ backgroundColor: branding.theme.secondary }}
                >
                  Secondary
                </div>
                <div
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                  style={{ backgroundColor: branding.theme.accent }}
                >
                  Accent
                </div>
              </div>
              <div
                className="h-2 rounded-full"
                style={{
                  background: `linear-gradient(to right, ${branding.theme.primary}, ${branding.theme.secondary}, ${branding.theme.accent})`,
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Theme Mode</CardTitle>
          <CardDescription>
            Choose the default color scheme for your event
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {THEME_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => handleThemeModeChange(mode.value)}
                className={cn(
                  'flex items-center w-full p-4 rounded-lg border-2 text-left transition-all',
                  'hover:border-primary/50 hover:bg-accent/50',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  branding.theme.mode === mode.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-5 h-5 rounded-full border-2 mr-4 flex-shrink-0',
                    branding.theme.mode === mode.value
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground'
                  )}
                >
                  {branding.theme.mode === mode.value && (
                    <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                  )}
                </div>
                <div>
                  <span className="font-medium">{mode.label}</span>
                  <p className="text-sm text-muted-foreground">
                    {mode.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card>
        <CardHeader>
          <CardTitle>Social Links</CardTitle>
          <CardDescription>
            Add links to your event&apos;s social media and website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Twitter */}
          <div className="space-y-2">
            <Label htmlFor="twitter">Twitter / X</Label>
            <Input
              id="twitter"
              placeholder="https://twitter.com/yourevent or @handle"
              value={branding.social.twitter}
              onChange={handleSocialChange('twitter')}
            />
            <p className="text-xs text-muted-foreground">
              Enter your Twitter URL or @handle
            </p>
          </div>

          {/* Telegram */}
          <div className="space-y-2">
            <Label htmlFor="telegram">Telegram</Label>
            <Input
              id="telegram"
              placeholder="https://t.me/yourchannel"
              value={branding.social.telegram}
              onChange={handleSocialChange('telegram')}
            />
            <p className="text-xs text-muted-foreground">
              Enter your Telegram channel or group URL
            </p>
          </div>

          {/* Discord */}
          <div className="space-y-2">
            <Label htmlFor="discord">Discord</Label>
            <Input
              id="discord"
              placeholder="https://discord.gg/yourserver"
              value={branding.social.discord}
              onChange={handleSocialChange('discord')}
            />
            <p className="text-xs text-muted-foreground">
              Enter your Discord invite URL
            </p>
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              placeholder="https://yourevent.com"
              value={branding.social.website}
              onChange={handleSocialChange('website')}
            />
            <p className="text-xs text-muted-foreground">
              Enter your event&apos;s website URL
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default BrandingStep;
