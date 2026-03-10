import { GoogleGenAI, Type } from "@google/genai";
import { TechPackData } from "./types";

/**
 * DIRECT AI ANALYSIS SERVICE
 * Uses the API_KEY provided via environment variables.
 */
export const analyzeGarmentImage = async (base64Image: string): Promise<Partial<TechPackData>> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please set the API_KEY environment variable.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const SYSTEM_PROMPT = "You are an expert Garment Technologist. Analyze the garment and return a structured JSON tech pack.";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { 
            inlineData: { 
              mimeType: "image/jpeg", 
              data: base64Image.split(',')[1] 
            } 
          },
          { text: "Extract styleName, garmentType, department, and 3-5 measurements (cm) for Size M." }
        ]
      },
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            header: {
              type: Type.OBJECT,
              properties: {
                styleName: { type: Type.STRING },
                garmentDetails: { type: Type.STRING },
                department: { type: Type.STRING },
              }
            },
            specs: {
              type: Type.OBJECT,
              properties: {
                garmentType: { type: Type.STRING },
                seasonCode: { type: Type.STRING }
              }
            },
            suggestedMeasurements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING },
                  value: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    // Use .text property to get the generated string
    const jsonStr = response.text || '{}';
    const result = JSON.parse(jsonStr);
    
    return {
      header: { ...result.header },
      specs: { ...result.specs },
      measurements: result.suggestedMeasurements?.map((m: any, index: number) => ({
          id: `ai-${Date.now()}-${index}`,
          code: m.code || '',
          labelEs: m.code || 'Measurement',
          labelEn: m.code || 'Measurement',
          values: [m.value || ''],
          tolerance: '0.5'
      })) || []
    };

  } catch (error) {
    console.error("Analysis Service Error:", error);
    throw error;
  }
};
