import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export async function POST(request: Request) {
  try {
    const { image, animationType } = await request.json();

    // Create temporary directory for processing
    const tempDir = join(tmpdir(), 'mangasketch-' + Date.now());
    const inputPath = join(tempDir, 'input.png');
    const outputDir = join(tempDir, 'output');

    // Create directories
    await mkdir(tempDir, { recursive: true });
    await mkdir(outputDir, { recursive: true });

    // Save the input image
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    await writeFile(inputPath, Buffer.from(base64Data, 'base64'));

    // Get the absolute path to the Python script
    const pythonScript = join(process.cwd(), 'scripts', 'animate.py');
    console.log('Python script path:', pythonScript);
    console.log('Input path:', inputPath);
    console.log('Output directory:', outputDir);

    // Call Python script for animation
    const pythonProcess = spawn(join(process.cwd(), '..', 'venv', 'bin', 'python3'), [
      pythonScript,
      '--input', inputPath,
      '--output', outputDir,
      '--type', animationType
    ]);

    // Handle Python script output
    return new Promise((resolve, reject) => {
      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
        console.log('Python output:', data.toString());
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
        console.error('Python error:', data.toString());
      });

      pythonProcess.on('close', async (code) => {
        if (code !== 0) {
          console.error('Animation error:', error);
          reject(NextResponse.json({ error: 'Animation failed: ' + error }, { status: 500 }));
          return;
        }

        try {
          // Read the generated GIF file
          const gifPath = join(outputDir, 'animation.gif');
          const gifBuffer = await readFile(gifPath);
          const gifBase64 = `data:image/gif;base64,${gifBuffer.toString('base64')}`;

          console.log('Animation completed successfully');
          resolve(NextResponse.json({
            preview: gifBase64,
            formats: {
              gif: gifBase64
            }
          }));
        } catch (error) {
          console.error('Error reading animation file:', error);
          reject(NextResponse.json({ error: 'Failed to read animation file' }, { status: 500 }));
        }
      });
    });
  } catch (error) {
    console.error('Animation error:', error);
    return NextResponse.json({ error: 'Animation failed: ' + error }, { status: 500 });
  }
} 