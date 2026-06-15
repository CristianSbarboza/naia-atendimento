import { Injectable } from '@nestjs/common';
import { Content, GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env';
import { ChatMessage } from '../memory/memory.service';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class AiService {
  async generateResponse(
    pushName: string,
    message: string,
    history: ChatMessage[],
    systemPrompt: string,
  ): Promise<string> {
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

    const currentDate = new Date().toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    });

    const fullSystemInstruction = `${systemPrompt}

Nome do cliente: ${pushName}
Data Atual: ${currentDate}`;

    const tryGenerate = async (modelName: string, maxAttempts: number): Promise<string> => {
      let lastError: unknown;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          console.log(`🤖 [${attempt}/${maxAttempts}] Generating with ${modelName}...`);
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { temperature: 0.4 },
            systemInstruction: fullSystemInstruction,
          });
          const chat = model.startChat({ history: history as Content[] });
          const result = await chat.sendMessage(message);
          return result.response.text();
        } catch (error: unknown) {
          lastError = error;
          const status = (error as { status?: number }).status;
          console.warn(`⚠️ Attempt ${attempt} failed (${modelName}):`, (error as Error).message);
          if (status === 400 || status === 401 || status === 403) throw error;
          if (attempt < maxAttempts) {
            const delay = attempt * 1500;
            console.log(`🔄 Retrying in ${delay}ms...`);
            await sleep(delay);
          }
        }
      }
      throw lastError;
    };

    try {
      return await tryGenerate('gemini-2.5-flash', 3);
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 400 || status === 401 || status === 403) throw err;
      console.warn('❌ Primary model failed. Trying fallback...');
      return await tryGenerate('gemini-2.0-flash-lite', 2);
    }
  }
}
