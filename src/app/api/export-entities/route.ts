
import { promises as fs } from 'fs';
import path from 'path';
import { type NextRequest, NextResponse } from 'next/server';
import type { ExportEntity } from '@/config/exportEntities';

const JSON_FILE_PATH = path.join(process.cwd(), 'exportEntities.json');

export async function GET(req: NextRequest) {
  try {
    const fileContents = await fs.readFile(JSON_FILE_PATH, 'utf8');
    const data: ExportEntity[] = JSON.parse(fileContents);
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Error reading exportEntities.json:', error);
    if (error.code === 'ENOENT') {
      // File not found, return empty array or default structure
      return NextResponse.json([], { status: 200 });
    }
    return NextResponse.json({ message: 'Error loading configuration' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const updatedData: ExportEntity[] = await req.json();
    await fs.writeFile(JSON_FILE_PATH, JSON.stringify(updatedData, null, 2), 'utf8');
    return NextResponse.json({ message: 'Configuration updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error writing exportEntities.json:', error);
    return NextResponse.json({ message: 'Error saving configuration' }, { status: 500 });
  }
}
