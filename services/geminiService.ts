import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateDailyReport = async (data: any): Promise<string> => {
  try {
    const model = 'gemini-3-flash-preview';
    const prompt = `
      Act as a Field Force Manager AI Assistant. 
      Analyze the following daily activity data for a field team and provide a concise, professional executive summary.
      Highlight key achievements, potential issues (like missed visits or high expenses), and actionable recommendations.
      
      Specifically, analyze the 'visitNotes' provided in the data to identify common themes, sentiment, or recurring operational hurdles faced by the field staff. Summarize these themes distinctly.
      
      Data:
      ${JSON.stringify(data, null, 2)}
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful and concise CRM analytical assistant.",
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking for faster report generation
      }
    });

    return response.text || "Unable to generate report.";
  } catch (error) {
    console.error("Error generating report:", error);
    return "Error: Could not connect to AI service. Please check your API key.";
  }
};

export const analyzeLead = async (leadData: any): Promise<{ score: number; justification: string; confidence: string }> => {
  try {
    const model = 'gemini-3-flash-preview';
    const prompt = `
      Act as a Senior Sales Strategist for a Field Force CRM software company.
      Analyze this sales lead to determine its quality and likelihood of conversion.

      Evaluate based on these weighted factors:
      1. **Data Quality**: Is the email corporate or generic (gmail/yahoo)? Is the phone number format valid?
      2. **Deal Value**: Is the potential value attractive (>50k is High, <10k is Low)?
      3. **Completeness**: Are all key fields (Company, Contact, Phone, Email) filled with meaningful data?
      
      Output JSON with:
      - score: 0-100 (Integer).
      - confidence: "High", "Medium", or "Low" (Based on how much data is available to make a judgment).
      - justification: A concise, actionable reason for the score (max 20 words).

      Lead Data: ${JSON.stringify(leadData)}
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: "Qualification score 0-100" },
            confidence: { type: Type.STRING, description: "Confidence level: High, Medium, Low" },
            justification: { type: Type.STRING, description: "Brief justification for the score" }
          }
        }
      }
    });
    
    const text = response.text;
    if (!text) return { score: 0, justification: "No response from AI", confidence: "Low" };
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Error analyzing lead:", error);
    return { score: 0, justification: "AI Analysis Failed", confidence: "Low" };
  }
};

export const chatWithData = async (query: string, contextData: any): Promise<string> => {
    try {
        const model = 'gemini-3-flash-preview';
        const prompt = `
          Context Data (Field Operations): ${JSON.stringify(contextData)}
          
          User Query: ${query}
          
          Answer the user's query based strictly on the context data provided. Be helpful and specific.
        `;
    
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });
        
        return response.text || "I couldn't understand the data context.";
      } catch (error) {
        return "AI Service Unavailable.";
      }
}