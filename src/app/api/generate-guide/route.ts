import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define request schema
const requestSchema = z.object({
  type: z.string().optional(),
  character: z.string().optional()
}).optional().default({});

const CHARACTER_TYPES = [
  "a cheerful anime girl with short hair and school uniform",
  "a cool anime boy character with dynamic pose",
  "a cute chibi character with expressive features",
  "an elegant traditional Japanese anime character",
  "a dynamic anime hero character in action pose",
  "a gentle character with soft features and flowing hair"
];

async function generateImage(character: string) {
  try {
    const prompt = `Create a simple, clean line drawing tutorial showing how to draw ${character}. The style should be like a professional manga reference guide with clean black lines on white background. Show basic shapes and construction lines to help with proportions. No text or annotations. Make it suitable for learning anime drawing techniques.`;
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "natural"
    });

    return {
      success: true,
      imageUrl: response.data[0].url
    };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return {
      success: false,
      error: 'Failed to generate image'
    };
  }
}

export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const validatedData = requestSchema.parse(body);
    
    // Select character type - either from request or random
    const characterType = validatedData.character || CHARACTER_TYPES[Math.floor(Math.random() * CHARACTER_TYPES.length)];
    
    // Generate image
    const imageResponse = await generateImage(characterType);

    // Check if image generation failed
    if (!imageResponse.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to generate image' 
      }, { status: 500 });
    }

    // Return response
    return NextResponse.json({
      success: true,
      imageUrl: imageResponse.imageUrl,
      character: characterType
    });

  } catch (error: unknown) {
    console.error('Error in main handler:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid request format',
        details: error.errors
      }, { status: 400 });
    }
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process request' 
    }, { status: 500 });
  }
} 