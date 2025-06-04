
// src/app/api/env-check/route.ts
import { NextResponse } from 'next/server';
import { config } from 'dotenv';

// Explicitly load .env (or .env.local, etc., based on dotenv's default behavior)
// This is often not needed for Next.js API routes as Next.js handles .env loading,
// but adding it can help in case of unexpected loading issues in some environments.
config({ path: process.cwd() + '/.env' }); // Tries to load .env specifically
config({ path: process.cwd() + '/.env.local', override: true }); // Tries to load .env.local and lets it override .env

export async function GET() {
  // Only expose the presence of keys, not their values
  const keyStatus = {
    GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    // Add any other .env keys you want to check the presence of
  };
  // console.log('[env-check API] Current process.env.GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'Set' : 'Not Set or Empty');
  // console.log('[env-check API] Current process.env.OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Not Set or Empty');
  // console.log('[env-check API] Current process.env.ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'Set' : 'Not Set or Empty');
  return NextResponse.json(keyStatus);
}
