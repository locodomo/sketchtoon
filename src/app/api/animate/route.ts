import { NextResponse } from 'next/server';
import { z } from 'zod';
import { spawn } from 'child_process';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import axios from 'axios';

const requestSchema = z.object({
  image: z.string(),
  animationType: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { image, animationType } = requestSchema.parse(body);

    // Create a temporary directory for processing
    const tempDir = join(tmpdir(), `mangasketch-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    // Save the input image
    const inputPath = join(tempDir, 'input.png');
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    await writeFile(inputPath, Buffer.from(base64Data, 'base64'));

    // Create output directory
    const outputDir = join(tempDir, 'output');
    await mkdir(outputDir, { recursive: true });

    // Get the script path
    const scriptPath = join(process.cwd(), 'scripts', 'animate.py');

    // Run the Python script
    const result = await new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [
        scriptPath,
        '--input', inputPath,
        '--output', outputDir,
        '--type', animationType
      ]);

      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
        console.log(`Python stdout: ${data}`);
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
        console.error(`Python stderr: ${data}`);
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Python script failed with code ${code}: ${error}`));
        }
      });
    });

    // Read the generated GIF
    const gifPath = join(outputDir, 'animation.gif');
    const gifBuffer = await readFile(gifPath);
    const gifBase64 = gifBuffer.toString('base64');
    const gifDataUrl = `data:image/gif;base64,${gifBase64}`;

    return NextResponse.json({
      success: true,
      preview: gifDataUrl,
      formats: [
        {
          id: 'gif',
          name: 'GIF',
          url: gifDataUrl
        }
      ]
    });

  } catch (error) {
    console.error('Animation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to animate drawing' 
      },
      { status: 500 }
    );
  }
} 