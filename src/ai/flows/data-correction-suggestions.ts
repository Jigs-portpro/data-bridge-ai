
'use server';

/**
 * @fileOverview An AI agent for suggesting data corrections.
 *
 * - suggestDataCorrections - A function that handles the data correction suggestion process.
 * - SuggestDataCorrectionsClientInput - The client-facing input type for the suggestDataCorrections function.
 * - SuggestDataCorrectionsOutput - The return type for the suggestDataCorrections function.
 */

import {ai} from '@/ai/genkit';
import {z, type GenkitModel} from 'genkit';
import {
  gpt4o, gpt4oMini, gpt4Turbo, gpt4, gpt35Turbo,
} from 'genkitx-openai';
// Assuming genkitx-anthropic handles string model IDs for now.

// Schema for the data required by the AI prompt
const SuggestDataCorrectionsPromptInputSchema = z.object({
  columnName: z.string().describe('The name of the column to correct.'),
  data: z.array(z.string()).describe('The data in the column.'),
});

// Schema for the input received by the exported server action from the client
const SuggestDataCorrectionsClientInputSchema = SuggestDataCorrectionsPromptInputSchema.extend({
  aiProvider: z.string().describe("The AI provider ID (e.g., 'googleai', 'openai', 'anthropic')."),
  aiModelName: z.string().describe("The specific model name (e.g., 'gemini-1.5-flash', 'gpt4oMini', 'claude-3-haiku-20240307').")
});
export type SuggestDataCorrectionsClientInput = z.infer<typeof SuggestDataCorrectionsClientInputSchema>;


const SuggestDataCorrectionsOutputSchema = z.object({
  correctedData: z.array(z.string()).describe('The corrected data. This array MUST be in the same order and have the same number of elements as the input data array.'),
  explanation: z.string().describe('Explanation of the corrections made.'),
});
export type SuggestDataCorrectionsOutput = z.infer<typeof SuggestDataCorrectionsOutputSchema>;

export async function suggestDataCorrections(
  input: SuggestDataCorrectionsClientInput
): Promise<SuggestDataCorrectionsOutput> {
  return suggestDataCorrectionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestDataCorrectionsPrompt',
  input: {schema: SuggestDataCorrectionsPromptInputSchema},
  output: {schema: SuggestDataCorrectionsOutputSchema},
  prompt: `You are an AI data quality specialist. Given a column name and a list of its data entries, you will suggest corrections to the data to improve its quality.

Column Name: {{{columnName}}}
Input Data Entries (one per line, maintain this order in your output):
{{#each data}}
- {{{this}}}
{{/each}}

Consider these common data quality issues:
- Casing: Correct inconsistent casing (e.g., "john", "John", "JOHN" should be "John").
- Formatting: Correct inconsistent formatting (e.g., phone numbers '123-456-7890', dates 'YYYY-MM-DD').

Your task is to return the full list of data entries with corrections applied.
**Crucially, the 'correctedData' array in your JSON output MUST:**
1. Be in the exact same order as the input data entries.
2. Contain the exact same number of entries as the input data.
3. If an input entry does not require correction, return the original entry in its corresponding position in the 'correctedData' array.

Output a JSON object with two fields:
1.  \`correctedData\`: An array of strings representing the full list of corrected data entries, adhering to the rules above.
2.  \`explanation\`: A string explaining the general types of corrections made, or specific examples if notable.

Example of expected output format:
{
  "correctedData": ["Corrected Entry 1", "Original Entry 2 (if no change)", "Corrected Entry 3", "... etc. for all input entries ..."],
  "explanation": "Corrected casing for names and standardized phone number formats."
}`,
});

const suggestDataCorrectionsFlow = ai.defineFlow(
  {
    name: 'suggestDataCorrectionsFlow',
    inputSchema: SuggestDataCorrectionsClientInputSchema,
    outputSchema: SuggestDataCorrectionsOutputSchema,
  },
  async (clientInput) => {
    const { aiProvider, aiModelName, ...promptData } = clientInput;
    
    let modelToUse: GenkitModel | string;

    if (aiProvider === 'openai') {
      switch (aiModelName) {
        case 'gpt4o': modelToUse = gpt4o; break;
        case 'gpt4oMini': modelToUse = gpt4oMini; break;
        case 'gpt4Turbo': modelToUse = gpt4Turbo; break;
        case 'gpt4': modelToUse = gpt4; break;
        case 'gpt35Turbo': modelToUse = gpt35Turbo; break;
        default: throw new Error(`Unknown OpenAI model ID: ${aiModelName}`);
      }
    } else if (aiProvider === 'anthropic') {
      modelToUse = aiModelName; // Assumes genkitx-anthropic handles string model IDs
    } else if (aiProvider === 'googleai') {
      modelToUse = `googleai/${aiModelName}`;
    } else {
      throw new Error(`Unsupported AI provider: ${aiProvider}`);
    }
    
    console.log('[data-correction-suggestions] Attempting to use model:', `${aiProvider}/${aiModelName}`, '(Resolved to instance/string)');
    const {output} = await prompt(promptData, { model: modelToUse });
    if (!output) {
      throw new Error("AI did not return an output for data correction suggestions.");
    }
    // Additional server-side check
    if (output.correctedData.length !== promptData.data.length) {
        console.error(`CRITICAL: Data correction AI returned ${output.correctedData.length} items, but input had ${promptData.data.length} items. This indicates a serious AI response error. Output was:`, output);
    }
    return output;
  }
);
