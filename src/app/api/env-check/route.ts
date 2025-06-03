
// src/app/api/env-check/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  // Only expose the presence of keys, not their values
  const keyStatus = {
    GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    // Add any other .env keys you want to check the presence of
  };
  return NextResponse.json(keyStatus);
}
