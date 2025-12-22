
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { JULIA_SYSTEM_INSTRUCTION } from "../constants";

const API_KEY = process.env.API_KEY || "";

export class JuliaService {
  private ai: GoogleGenAI;
  private chat: any;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: API_KEY });
    this.chat = this.ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: JULIA_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json"
      }
    });
  }

  async processMessage(message: string, preference: 'text' | 'audio' | null, imageBase64?: string): Promise<{
    displayText: string;
    speechText: string;
    isCritical: boolean;
    isFinalQuote?: boolean;
    isAdminActive?: boolean;
    isConfirmation?: boolean;
    summary?: string;
    audioData?: string;
  }> {
    try {
      let parts: any[] = [{ text: message }];
      if (imageBase64) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBase64.split(",")[1]
          }
        });
      }

      const response = await this.chat.sendMessage({ message: parts });
      const data = JSON.parse(response.text || "{}");

      let audioData = undefined;
      
      if (preference === 'audio' && !data.isFinalQuote && data.speechText) {
        const audioResponse = await this.ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: data.speechText }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
            },
          },
        });
        audioData = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      }

      return {
        displayText: data.displayText,
        speechText: data.speechText,
        isCritical: !!data.isCritical,
        isFinalQuote: !!data.isFinalQuote,
        isAdminActive: !!data.isAdminActive,
        isConfirmation: !!data.isConfirmation,
        summary: data.summary,
        audioData: audioData
      };
    } catch (error) {
      console.error("Gemini Error:", error);
      return {
        displayText: "Erro técnico. Pode repetir?",
        speechText: "Erro técnico.",
        isCritical: false
      };
    }
  }
}
