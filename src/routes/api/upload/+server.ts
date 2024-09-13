import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@vercel/kv';
import { OPENAI_API_KEY, KV_REST_API_URL, KV_REST_API_TOKEN } from '$env/static/private';
import OpenAI from 'openai';

const kv = createClient({
  url: KV_REST_API_URL,
  token: KV_REST_API_TOKEN,
});

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const fileContent = Buffer.from(buffer);

    // Upload to Vercel KV
    const key = `image_${Date.now()}`;
    await kv.set(key, fileContent.toString('base64'));

    // Process with OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What's in this image?" },
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

    return json({ result });
  } catch (error) {
    console.error(error);
    return json({ error: 'Server error' }, { status: 500 });
  }
};