import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET (hidden)' : 'NOT SET',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'SET (hidden)' : 'NOT SET',
    // Check if we're in edge runtime
    runtime: process.env.NEXT_RUNTIME || 'nodejs',
    // Check all env vars starting with SUPABASE
    supabaseEnvVars: Object.keys(process.env)
      .filter((key) => key.includes('SUPABASE'))
      .map((key) => ({
        key,
        isSet: !!process.env[key],
      })),
  });
}
