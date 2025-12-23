
import { GoogleGenAI, Type } from "@google/genai";
import { ImageAnalysis } from "../types";
import { translations, Language } from "../translations";

// Initialize the Gemini client using only the environment variable as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    objects: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'List of physical objects identified in the image.'
    },
    labels: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Conceptual labels or categories for the image (e.g., "Nature", "Urban", "Celebration").'
    },
    description: {
      type: Type.STRING,
      description: 'A concise, high-quality description of what is happening in the image.'
    },
    confidenceScore: {
      type: Type.NUMBER,
      description: 'A value from 0 to 1 representing the AI confidence.'
    },
    dominantColors: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Hex codes of dominant colors in the image.'
    },
    ageEstimate: {
      type: Type.STRING,
      description: 'If a human face is detected, provide a probabilistic age estimate or range (e.g., "25-30 years old"). If no face is detected, return an empty string.'
    }
  },
  required: ['objects', 'labels', 'description', 'confidenceScore', 'dominantColors', 'ageEstimate'],
  propertyOrdering: ['objects', 'labels', 'description', 'confidenceScore', 'dominantColors', 'ageEstimate']
};

export const analyzeImage = async (base64Data: string, mimeType: string, lang: Language): Promise<ImageAnalysis> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          },
          {
            text: translations[lang].promptInstruction
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_SCHEMA
      }
    });

    // Access the generated text directly from the response object
    const parsed = JSON.parse(response.text || '{}');
    
    // Ensure default values to prevent "Cannot read properties of undefined" errors in UI
    const result: ImageAnalysis = {
      objects: Array.isArray(parsed.objects) ? parsed.objects : [],
      labels: Array.isArray(parsed.labels) ? parsed.labels : [],
      description: parsed.description || "",
      confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 0,
      dominantColors: Array.isArray(parsed.dominantColors) ? parsed.dominantColors : [],
      ageEstimate: parsed.ageEstimate || ""
    };

    return result;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze image with AI.");
  }
};
