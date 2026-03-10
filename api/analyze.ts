
import { GoogleGenAI, Type } from "@google/genai";

export const config = {
  maxDuration: 30,
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).send(JSON.stringify({ error: 'Method not allowed' }));
  }

  const { image } = req.body;
  if (!image) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(400).send(JSON.stringify({ error: 'Image data is required' }));
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

  try {
    const SYSTEM_PROMPT = "You are an expert Garment Technologist. Analyze the garment and return a structured JSON tech pack.";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: image.split(',')[1] } },
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

    const result = JSON.parse(response.text || '{}');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify(result));

  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).send(JSON.stringify({ error: 'AI Analysis Failed', details: error.message }));
  }
}
