export type ParsedCSV = {
  headers: string[];
  rows: Record<string, any>[]; // Changed to any to better support mixed types from Excel
};

export function parseCSV(csvString: string): ParsedCSV {
  const lines = csvString.trim().split(/\r\n|\n/);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map(header => header.trim());
  const rows = lines.slice(1).map(line => {
    // Basic CSV parsing, doesn't handle commas within quoted fields well.
    // For robust parsing, a library might be needed if data is complex.
    // This regex aims to handle quoted fields containing commas.
    const values = [];
    let currentMatch;
    const regex = /(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|([^\",]+)|(,))|(?:,|$)/g;
    let lastIndex = 0;

    // Split line by comma, respecting quotes
    // This is a simplified parser; a more robust CSV parser might be needed for complex CSVs.
    const roughSplit = line.split(','); 
    const processedValues: string[] = [];
    let inQuotes = false;
    let currentValue = '';

    for (const part of roughSplit) {
      if (!inQuotes) {
        if (part.startsWith('"') && !part.endsWith('"')) {
          inQuotes = true;
          currentValue = part.substring(1);
        } else if (part.startsWith('"') && part.endsWith('"')) {
          processedValues.push(part.substring(1, part.length -1).replace(/""/g, '"'));
        }
         else {
          processedValues.push(part.replace(/""/g, '"'));
        }
      } else {
        currentValue += ',' + part;
        if (part.endsWith('"')) {
          inQuotes = false;
          processedValues.push(currentValue.substring(0, currentValue.length -1).replace(/""/g, '"'));
          currentValue = '';
        }
      }
    }
    if (currentValue) { // Add any remaining part if line ends mid-quote (though unusual)
        processedValues.push(currentValue);
    }


    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = processedValues[index]?.trim() || '';
    });
    return row;
  });
  return { headers, rows };
}

export function objectsToCsv(headers: string[], data: Record<string, any>[]): string {
  if (!data || data.length === 0) {
    return headers.join(',');
  }
  if (!headers || headers.length === 0) {
     headers = Object.keys(data[0]);
  }
  const headerRow = headers.join(',');
  const dataRows = data.map(row => 
    headers.map(header => {
      const value = row[header] === null || typeof row[header] === 'undefined' ? '' : String(row[header]);
      // Escape commas, newlines, and quotes within values by quoting
      if (value.includes(',') || value.includes('\n') || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );
  return [headerRow, ...dataRows].join('\n');
}
