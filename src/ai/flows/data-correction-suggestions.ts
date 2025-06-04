
'use server';

/**
 * @fileOverview An AI agent for suggesting data corrections.
 *
 * - suggestDataCorrections - A function that handles the data correction suggestion process.
 * - SuggestDataCorrectionsClientInput - The client-facing input type for the suggestDataCorrections function.
 * - SuggestDataCorrectionsOutput - The return type for the suggestDataCorrections function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Schema for the data required by the AI prompt
const SuggestDataCorrectionsPromptInputSchema = z.object({
  columnName: z.string().describe('The name of the column to correct.'),
  data: z.array(z.string()).describe('The data in the column.'),
});

// Schema for the input received by the exported server action from the client
const SuggestDataCorrectionsClientInputSchema = SuggestDataCorrectionsPromptInputSchema.extend({
  aiProvider: z.string().describe("The AI provider ID (e.g., 'googleai', 'openai')."),
  aiModelName: z.string().describe("The specific model name (e.g., 'gemini-1.5-flash', 'gpt-4o-mini').")
});
export type SuggestDataCorrectionsClientInput = z.infer<typeof SuggestDataCorrectionsClientInputSchema>;


const SuggestDataCorrectionsOutputSchema = z.object({
  correctedData: z.array(z.string()).describe('The corrected data.'),
  explanation: z.string().describe('Explanation of the corrections.'),
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
  prompt: `You are an AI data quality specialist. Given a column name and its data, you will suggest corrections to the data to improve its quality.

Column Name: {{{columnName}}}
Data: {{#each data}}{{{this}}}\n{{/each}}

Consider these common data quality issues:
- Casing: Correct inconsistent casing (e.g., "john", "John", "JOHN" should be "John").
- Formatting: Correct inconsistent formatting (e.g., phone numbers, dates).

Output the corrected data and explain the corrections you made.

Corrected Data:
Explanation:`,
});

const suggestDataCorrectionsFlow = ai.defineFlow(
  {
    name: 'suggestDataCorrectionsFlow',
    inputSchema: SuggestDataCorrectionsClientInputSchema,
    outputSchema: SuggestDataCorrectionsOutputSchema,
  },
  async (clientInput) => {
    const { aiProvider, aiModelName, ...promptData } = clientInput;
    const modelIdentifier = `${aiProvider}/${aiModelName}`;
    
    const {output} = await prompt(promptData, { model: modelIdentifier });
    if (!output) {
      throw new Error("AI did not return an output for data correction suggestions.");
    }
    return output;
  }
);

