import OpenAI from 'openai';
import fs from 'fs';

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

export async function translateText(text: string): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: 'openai/gpt-oss-20b',
    messages: [{ role: 'user', content: `Translate this school announcement into natural, everyday Tamil suitable for parents. Keep it warm and friendly, similar to how Indian school WhatsApp groups communicate — feel free to naturally include relevant emojis (like 🙏, 🎉, 📢, 💐) where appropriate, matching the tone of the English text. Only return the Tamil translation, nothing else:\n\n"${text}"` }],
  });
  return completion.choices[0].message.content || '';
}

export async function transcribeAudio(filePath: string, model = 'whisper-large-v3') {
  return groq.audio.transcriptions.create({ file: fs.createReadStream(filePath), model });
}

export { groq };
