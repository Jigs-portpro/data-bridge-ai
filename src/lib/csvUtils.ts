export type ParsedCSV = {
  headers: string[];
  rows: Record<string, string>[];
};

export function parseCSV(csvString: string): ParsedCSV {
  const lines = csvString.trim().split(/\r\n|\n/);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map(header => header.trim());
  const rows = lines.slice(1).map(line => {
    // Basic CSV parsing, doesn't handle commas within quoted fields well.
    // For robust parsing, a library might be needed if data is complex.
    const values = line.split(',').map(value => value.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
  return { headers, rows };
}

export function objectsToCsv(headers: string[], data: Record<string, string>[]): string {
  if (!data || data.length === 0) {
    return headers.join(',');
  }
  if (!headers || headers.length === 0) {
     headers = Object.keys(data[0]);
  }
  const headerRow = headers.join(',');
  const dataRows = data.map(row => 
    headers.map(header => {
      const value = row[header] || '';
      // Escape commas and newlines within values by quoting
      if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );
  return [headerRow, ...dataRows].join('\n');
}
