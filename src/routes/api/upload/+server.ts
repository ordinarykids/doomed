import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@vercel/kv';
import { OPENAI_API_KEY, KV_REST_API_URL, KV_REST_API_TOKEN, ELEVENLABS_API_KEY } from '$env/static/private';
import OpenAI from 'openai';
import fetch from 'node-fetch';
import { ElevenLabsClient, play } from "elevenlabs";

const kv = createClient({
  url: KV_REST_API_URL,
  token: KV_REST_API_TOKEN,
});

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

let isProcessing = false;

export const POST: RequestHandler = async ({ request }) => {
  if (isProcessing) {
    return json({ error: 'Currently processing another request. Please wait.' }, { status: 429 });
  }

  isProcessing = true;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      isProcessing = false;
      return json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const fileContent = Buffer.from(buffer);

    // Upload to Vercel KV
    const key = `image_${Date.now()}`;
    await kv.set(key, fileContent.toString('base64'));

    // Process with OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Use the photo to inspire a villain story. Write a 4 rap hip hop bars in the style of MF Doom. Complicated, intericate rhyme style, with a lot of double time flow and interlocking rhymes. " },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${fileContent.toString('base64')}`,
              },
            },
          ],
        },
      ],
    });

    const result = response.choices[0].message.content;

    const elevenlabs = new ElevenLabsClient({
        apiKey: ELEVENLABS_API_KEY // Defaults to process.env.ELEVENLABS_API_KEY
      });
  
    const audio = await elevenlabs.generate({
      voice: "pAc30HnsHYqBrSh4ok48",
      text: result,
      model_id: "eleven_multilingual_v2"
    });

    // Return the audio file to the user
    isProcessing = false;
    return new Response(audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename="audio.mp3"'
      }
    });
  } catch (error) {
    console.error(error);
    isProcessing = false;
    return json({ error: 'Server error' }, { status: 500 });
  }
};