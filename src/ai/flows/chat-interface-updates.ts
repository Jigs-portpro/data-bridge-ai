'use server';

/**
 * @fileOverview A chat interface to discuss data and make updates.
 *
 * - chatInterfaceUpdates - A function that handles the chat interface and data update process.
 * - ChatInterfaceUpdatesInput - The input type for the chatInterfaceUpdates function.
 * - ChatInterfaceUpdatesOutput - The return type for the chatInterfaceUpdates function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatInterfaceUpdatesInputSchema = z.object({
  dataContext: z
    .string()
    .describe(
      'The data context in JSON format for discussion and updates.  Include a description of the columns.'
    ),
  userQuery: z.string().describe('The user query related to the data.'),
});
export type ChatInterfaceUpdatesInput = z.infer<typeof ChatInterfaceUpdatesInputSchema>;

const ChatInterfaceUpdatesOutputSchema = z.object({
  response: z.string().describe('The response to the user query based on the data.'),
  updatedDataContext: z
    .string()
    .describe('The updated data context in JSON format after applying the changes.'),
});
export type ChatInterfaceUpdatesOutput = z.infer<typeof ChatInterfaceUpdatesOutputSchema>;

export async function chatInterfaceUpdates(
  input: ChatInterfaceUpdatesInput
): Promise<ChatInterfaceUpdatesOutput> {
  return chatInterfaceUpdatesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'chatInterfaceUpdatesPrompt',
  input: {schema: ChatInterfaceUpdatesInputSchema},
  output: {schema: ChatInterfaceUpdatesOutputSchema},
  prompt: `You are an AI assistant helping users to discuss and update their data through a chat interface.

  The current data context is:
  {{dataContext}}

  The user query is:
  {{userQuery}}

  Based on the data context and the user query, provide a response to the user and update the data context if necessary.
  Return the response and the updated data context in JSON format.
  Ensure that the updated data context is valid JSON.
  If no updates are needed, return the original data context.
  `,
});

const chatInterfaceUpdatesFlow = ai.defineFlow(
  {
    name: 'chatInterfaceUpdatesFlow',
    inputSchema: ChatInterfaceUpdatesInputSchema,
    outputSchema: ChatInterfaceUpdatesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
