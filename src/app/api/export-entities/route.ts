
import { promises as fs } from 'fs';
import path from 'path';
import { type NextRequest, NextResponse } from 'next/server';
import type { ExportConfig } from '@/config/exportEntities';

const JSON_FILE_PATH = path.join(process.cwd(), 'exportEntities.json');
const DEFAULT_CONFIG: ExportConfig = {
  baseUrl: 'https://api.example.com/data',
  entities: [],
};

async function ensureConfigFileExists() {
  try {
    await fs.access(JSON_FILE_PATH);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, create it with default content
      try {
        await fs.writeFile(JSON_FILE_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
        console.log('Created exportEntities.json with default configuration.');
      } catch (writeError) {
        console.error('Error creating default exportEntities.json:', writeError);
        // This is a critical error, perhaps rethrow or handle appropriately
        throw new Error('Failed to initialize configuration file.');
      }
    } else {
      // Other error accessing file
      throw error;
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureConfigFileExists(); // Ensure file exists before trying to read
    const fileContents = await fs.readFile(JSON_FILE_PATH, 'utf8');
    // Basic validation: check if it's an object with baseUrl and entities
    const data: unknown = JSON.parse(fileContents);
    if (typeof data === 'object' && data !== null && 'baseUrl' in data && 'entities' in data && Array.isArray((data as ExportConfig).entities)) {
        return NextResponse.json(data as ExportConfig, { status: 200 });
    } else {
        // If structure is invalid, return default config and maybe log an error
        console.warn('exportEntities.json has invalid structure, returning default config.');
        await fs.writeFile(JSON_FILE_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8'); // Attempt to fix by resetting
        return NextResponse.json(DEFAULT_CONFIG, { status: 200 });
    }
  } catch (error: any) {
    console.error('Error reading exportEntities.json:', error);
     // If any error (including parse error for malformed JSON), try to reset to default
    try {
        console.warn('Attempting to reset exportEntities.json due to read error.');
        await fs.writeFile(JSON_FILE_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
        return NextResponse.json(DEFAULT_CONFIG, { status: 200 });
    } catch (resetError) {
        console.error('Failed to reset exportEntities.json:', resetError);
        return NextResponse.json({ message: 'Error loading configuration and failed to reset.' }, { status: 500 });
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureConfigFileExists(); // Ensure file exists before trying to write
    const updatedConfig: ExportConfig = await req.json();
    // Basic validation of incoming data
    if (typeof updatedConfig !== 'object' || updatedConfig === null || 
        typeof updatedConfig.baseUrl !== 'string' || !Array.isArray(updatedConfig.entities)) {
        return NextResponse.json({ message: 'Invalid configuration format provided.' }, { status: 400 });
    }
    await fs.writeFile(JSON_FILE_PATH, JSON.stringify(updatedConfig, null, 2), 'utf8');
    return NextResponse.json({ message: 'Configuration updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error writing exportEntities.json:', error);
    return NextResponse.json({ message: 'Error saving configuration' }, { status: 500 });
  }
}
