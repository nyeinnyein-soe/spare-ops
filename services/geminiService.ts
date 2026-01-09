
import { GoogleGenAI, Type } from "@google/genai";
import { UsageRecord, RequestRecord } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeUsage = async (usages: UsageRecord[], requests: RequestRecord[]) => {
  const prompt = `
    Analyze the following spare parts usage and request data for a sales team.
    Identify patterns like:
    - High consumption parts
    - Most frequent shops needing spares
    - Any anomalies or suspicious high-volume requests
    - Suggested restock levels

    Data:
    Usages: ${JSON.stringify(usages)}
    Requests: ${JSON.stringify(requests)}
    
    Provide a concise summary and 3 actionable recommendations.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Could not generate analysis at this time.";
  }
};
