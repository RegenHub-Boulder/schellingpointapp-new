import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { isValidSlugFormat, suggestAlternativeSlugs } from '@/lib/utils/slug';

// ============================================================================
// Types
// ============================================================================

interface ValidateSlugRequest {
  slug: string;
}

interface ValidateSlugResponse {
  available: boolean;
  suggestions?: string[];
  error?: string;
}

// ============================================================================
// POST /api/events/validate-slug
// ============================================================================

/**
 * Validate an event slug for availability and format
 *
 * Request body:
 * - slug: string - The slug to validate
 *
 * Response:
 * - available: boolean - Whether the slug is available
 * - suggestions: string[] - Alternative slugs if taken (only when unavailable)
 * - error: string - Validation error message (only when invalid format)
 */
export async function POST(request: Request): Promise<NextResponse<ValidateSlugResponse>> {
  try {
    // Parse request body
    let body: ValidateSlugRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { available: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { slug } = body;

    // Check if slug was provided
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json(
        { available: false, error: 'Slug is required' },
        { status: 400 }
      );
    }

    // Validate slug format
    const formatValidation = isValidSlugFormat(slug);
    if (!formatValidation.valid) {
      return NextResponse.json(
        { available: false, error: formatValidation.error },
        { status: 400 }
      );
    }

    // Check uniqueness in database
    const supabase = await createAdminClient();
    const { data: existingEvent, error: dbError } = await supabase
      .from('events')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (dbError) {
      console.error('Database error checking slug:', dbError);
      return NextResponse.json(
        { available: false, error: 'Failed to check slug availability' },
        { status: 500 }
      );
    }

    // If slug is taken, generate suggestions
    if (existingEvent) {
      const suggestions = suggestAlternativeSlugs(slug);

      // Verify suggestions are also available
      const availableSuggestions = await filterAvailableSlugs(supabase, suggestions);

      return NextResponse.json({
        available: false,
        suggestions: availableSuggestions.slice(0, 3),
      });
    }

    // Slug is available
    return NextResponse.json({ available: true });

  } catch (error) {
    console.error('Error validating slug:', error);
    return NextResponse.json(
      { available: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Filter a list of slugs to only those that are available
 */
async function filterAvailableSlugs(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  slugs: string[]
): Promise<string[]> {
  if (slugs.length === 0) return [];

  const { data: existingSlugs, error } = await supabase
    .from('events')
    .select('slug')
    .in('slug', slugs);

  if (error) {
    console.error('Error checking slug availability:', error);
    // On error, return original suggestions (they might still be available)
    return slugs;
  }

  const takenSlugs = new Set(existingSlugs?.map(e => e.slug) ?? []);
  return slugs.filter(slug => !takenSlugs.has(slug));
}

// ============================================================================
// Other Methods
// ============================================================================

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}
