import { GoogleGenAI } from '@google/genai';
import { 
  AIChatRequest, 
  AIChatResponse, 
  TripContext
} from '../types/ai';
import { orchestrateCopilotReasoning } from './copilotOrchestrator';

// Initialize Gemini Client safely without exposing keys
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey: apiKey.trim() });
  } catch (err) {
    console.error('[Gemini Service] Initialization failed:', err);
    return null;
  }
}

/**
 * Handle AI Copilot Chat with real Gemini reasoning over the active trip context,
 * orchestrated over Travelia's authoritative backend services.
 * 
 * CORE PRINCIPLE:
 * GEMINI REASONS. TRAVELIA SERVICES VERIFY AND CALCULATE.
 */
export async function chatWithTraveliaAI(req: AIChatRequest): Promise<AIChatResponse> {
  const { message, tripContext } = req;
  
  // 1. Validate inputs safely
  if (!message || typeof message !== 'string') {
    throw new Error('Valid message string is required');
  }
  if (!tripContext || !Array.isArray(tripContext.itinerary)) {
    throw new Error('Valid tripContext with itinerary is required');
  }

  const client = getGeminiClient();
  return orchestrateCopilotReasoning(message, tripContext, client);
}
