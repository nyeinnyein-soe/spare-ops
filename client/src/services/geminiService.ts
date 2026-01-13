import { UsageRecord, RequestRecord } from "../types";
import { api } from "./api"; // Import the API helper we created

export const analyzeUsage = async (usages: UsageRecord[], requests: RequestRecord[]) => {
  try {
    // Send data to our new Backend API instead of Google directly
    const response = await api.post('/insights', { 
      usages, 
      requests 
    });
    return response.analysis;
  } catch (error) {
    console.error("Analysis Error:", error);
    return "Unable to generate insights at this time. Please check server connection.";
  }
};