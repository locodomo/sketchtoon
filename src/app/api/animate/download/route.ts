import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { extname } from 'path';

const MIME_TYPES: { [key: string]: string } = {
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    const ext = extname(path).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    const buffer = await readFile(path);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="animation${ext}"`,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
  }
} 