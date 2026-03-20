import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log('Creating Supabase client with URL:', url)

  if (!url || !key) {
    console.error('Missing Supabase environment variables!', { url: !!url, key: !!key })
    throw new Error('Missing Supabase configuration')
  }

  client = createBrowserClient(url, key)

  return client
}

