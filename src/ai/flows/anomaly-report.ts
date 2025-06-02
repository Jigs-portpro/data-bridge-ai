'use server';

/**
 * @fileOverview Anomaly detection AI agent.
 *
 * - generateAnomalyReport - A function that handles the anomaly report generation process.
 * - AnomalyReportInput - The input type for the generateAnomalyReport function.
 * - AnomalyReportOutput - The return type for the generateAnomalyReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnomalyReportInputSchema = z.object({
  data: z
    .string()
    .describe(
      'The data to analyze, expected to be in CSV format with headers. Do not include any explanation or context, just the CSV data.'
    ),
  columnNames: z.array(z.string()).describe('The names of the columns in the data.'),
});
export type AnomalyReportInput = z.infer<typeof AnomalyReportInputSchema>;

const AnomalyReportOutputSchema = z.object({
  report: z.string().describe('A report of potential data anomalies based on statistical analysis.'),
});
export type AnomalyReportOutput = z.infer<typeof AnomalyReportOutputSchema>;

export async function generateAnomalyReport(input: AnomalyReportInput): Promise<AnomalyReportOutput> {
  return generateAnomalyReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'anomalyReportPrompt',
  input: {schema: AnomalyReportInputSchema},
  output: {schema: AnomalyReportOutputSchema},
  prompt: `You are an expert data analyst specializing in identifying data anomalies.

You will receive data in CSV format and a list of column names. Your task is to analyze the data and generate a report highlighting potential data anomalies based on statistical analysis.

Data:\n{{{data}}}

Column Names: {{{columnNames}}}

Report:`,
});

const generateAnomalyReportFlow = ai.defineFlow(
  {
    name: 'generateAnomalyReportFlow',
    inputSchema: AnomalyReportInputSchema,
    outputSchema: AnomalyReportOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
