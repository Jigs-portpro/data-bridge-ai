
import { genkit, type GenkitPlugin } from 'genkit';
import { config } from 'dotenv';

config(); // Ensure .env variables are loaded

const plugins: GenkitPlugin[] = [];

// Attempt to load Google AI plugin if GOOGLE_API_KEY is set
if (process.env.GOOGLE_API_KEY) {
  try {
    const { googleAI } = await import('@genkit-ai/googleai');
    plugins.push(googleAI());
    console.log("Google AI plugin loaded.");
  } catch (e) {
    console.warn("Failed to import or initialize Google AI plugin. GOOGLE_API_KEY might be set, but the plugin couldn't load. Error:", e);
  }
} else {
  console.log("GOOGLE_API_KEY not set. Google AI plugin will not be loaded.");
}

// Attempt to load OpenAI plugin if OPENAI_API_KEY is set
if (process.env.OPENAI_API_KEY) {
  try {
    const { openAI } = await import('@genkit-ai/openai');
    plugins.push(openAI());
    console.log("OpenAI plugin loaded.");
  } catch (e) {
    console.warn("Failed to import or initialize OpenAI plugin. OPENAI_API_KEY might be set, but the plugin couldn't load. Error:", e);
  }
} else {
  console.log("OPENAI_API_KEY not set. OpenAI plugin will not be loaded.");
}

// Attempt to load Anthropic plugin if ANTHROPIC_API_KEY is set
if (process.env.ANTHROPIC_API_KEY) {
  try {
    const { anthropic } = await import('@genkit-ai/anthropic');
    plugins.push(anthropic());
    console.log("Anthropic plugin loaded.");
  } catch (e) {
    console.warn("Failed to import or initialize Anthropic plugin. ANTHROPIC_API_KEY might be set, but the plugin couldn't load. Error:", e);
  }
} else {
  console.log("ANTHROPIC_API_KEY not set. Anthropic plugin will not be loaded.");
}

if (plugins.length === 0) {
  console.error(
    "CRITICAL: No Genkit AI plugins were loaded because no API keys (GOOGLE_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY) were found in .env. " +
    "AI features will likely fail. Please set at least one API key."
  );
}

export const ai = genkit({
  plugins: plugins,
  // No default model is set here; it will be specified in each call
  // based on user selection from the UI (stored in localStorage).
  enableTracingAndMetrics: true, // Optional: good for development
});

// This file no longer exports currentAiProvider or currentAiModelIdentifier,
// as that will be managed by AppContext and localStorage.
// Individual AI flow calls will specify the model dynamically.
