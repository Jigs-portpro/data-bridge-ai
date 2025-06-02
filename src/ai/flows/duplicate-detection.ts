// DuplicateDetectionFlow.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for detecting duplicate entries in a dataset based on fuzzy matching of user-specified columns.
 *
 * The flow takes a dataset and a list of columns as input, and returns a list of duplicate entries.
 *
 * - `detectDuplicates`:  A function that initiates the duplicate detection process.
 * - `DuplicateDetectionInput`: The input type for the `detectDuplicates` function.
 * - `DuplicateDetectionOutput`: The return type for the `detectDuplicates` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema for the duplicate detection flow
const DuplicateDetectionInputSchema = z.object({
  data: z.array(z.record(z.any())).describe('The dataset to check for duplicates, represented as an array of objects.'),
  columns: z
    .array(z.string())
    .describe('The columns to use for detecting duplicates.  Duplicates are detected if all the specified columns match.'),
});

export type DuplicateDetectionInput = z.infer<typeof DuplicateDetectionInputSchema>;

// Define the output schema for the duplicate detection flow
const DuplicateDetectionOutputSchema = z.object({
  duplicates: z
    .array(z.array(z.number()))
    .describe('A list of duplicate entries. Each entry is an array of indices from the input `data` array that are considered duplicates.'),
});

export type DuplicateDetectionOutput = z.infer<typeof DuplicateDetectionOutputSchema>;

// Exported function to initiate the duplicate detection process
export async function detectDuplicates(input: DuplicateDetectionInput): Promise<DuplicateDetectionOutput> {
  return duplicateDetectionFlow(input);
}

// Define the prompt for the duplicate detection flow
const duplicateDetectionPrompt = ai.definePrompt({
  name: 'duplicateDetectionPrompt',
  input: {schema: DuplicateDetectionInputSchema},
  output: {schema: DuplicateDetectionOutputSchema},
  prompt: `You are an expert data analyst specializing in identifying duplicate entries in datasets.

  Given the following dataset and columns, identify and return the indices of any rows that are duplicates based on those columns.

  Dataset:
  {{#each data}}
  {{@index}}: {{this}}
  {{/each}}

  Columns to check for duplicates: {{columns}}

  Return a JSON object with a "duplicates" field.  The "duplicates" field should contain an array of arrays. Each inner array should contain the indices of rows that are considered duplicates.
  For example, if rows 1, 3, and 5 are duplicates, the output should contain:  [[1, 3, 5]]

  If there are no duplicates, return an empty array for the duplicates field: []
  `,
});

// Define the Genkit flow for duplicate detection
const duplicateDetectionFlow = ai.defineFlow(
  {
    name: 'duplicateDetectionFlow',
    inputSchema: DuplicateDetectionInputSchema,
    outputSchema: DuplicateDetectionOutputSchema,
  },
  async input => {
    const {output} = await duplicateDetectionPrompt(input);
    return output!;
  }
);
