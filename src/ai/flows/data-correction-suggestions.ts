'use server';

/**
 * @fileOverview An AI agent for suggesting data corrections.
 *
 * - suggestDataCorrections - A function that handles the data correction suggestion process.
 * - SuggestDataCorrectionsInput - The input type for the suggestDataCorrections function.
 * - SuggestDataCorrectionsOutput - The return type for the suggestDataCorrections function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestDataCorrectionsInputSchema = z.object({
  columnName: z.string().describe('The name of the column to correct.'),
  data: z.array(z.string()).describe('The data in the column.'),
});
export type SuggestDataCorrectionsInput = z.infer<typeof SuggestDataCorrectionsInputSchema>;

const SuggestDataCorrectionsOutputSchema = z.object({
  correctedData: z.array(z.string()).describe('The corrected data.'),
  explanation: z.string().describe('Explanation of the corrections.'),
});
export type SuggestDataCorrectionsOutput = z.infer<typeof SuggestDataCorrectionsOutputSchema>;

export async function suggestDataCorrections(
  input: SuggestDataCorrectionsInput
): Promise<SuggestDataCorrectionsOutput> {
  return suggestDataCorrectionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestDataCorrectionsPrompt',
  input: {schema: SuggestDataCorrectionsInputSchema},
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
    inputSchema: SuggestDataCorrectionsInputSchema,
    outputSchema: SuggestDataCorrectionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
