import { tool } from '@openai/agents/realtime';
import { conversationHistory } from '@/app/lib/conversationHistory';

// Function to detect current scenario based on URL or other context
function getCurrentScenario(): string {
  if (typeof window === 'undefined') return 'simpleHandoff'; // fallback for server-side
  
  // Try to get from URL parameters first
  const urlParams = new URLSearchParams(window.location.search);
  const agentConfig = urlParams.get('agentConfig');
  
  if (agentConfig) {
    return agentConfig;
  }
  
  // Fallback to simpleHandoff if no URL parameter
  return 'simpleHandoff';
}

export const fetchHistoryContext = tool({
  name: 'fetchHistoryContext',
  description: 'Fetch previous conversation history with the user to maintain context across sessions. This tool automatically detects which scenario is currently active and retrieves history for that scenario.',
  strict: false,
  parameters: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum number of recent messages to retrieve (default: 20)'
      }
    },
    additionalProperties: false
  },
  async execute({ limit = 20 }) {
    // Auto-detect the current scenario
    const scenario_name = getCurrentScenario();
    console.log('[fetchHistoryContext] Tool called, auto-detected scenario:', scenario_name, 'limit:', limit);
    
    try {
      // Fetch conversation history from localStorage for the detected scenario
      const historyMessages = conversationHistory.getRecentMessages(scenario_name, limit);
      const formattedHistory = conversationHistory.getFormattedHistory(scenario_name, limit);
      
      console.log(`[fetchHistoryContext] Found ${historyMessages.length} messages for ${scenario_name}`);
      
      return {
        success: true,
        historyContext: formattedHistory,
        messageCount: historyMessages.length,
        summary: `Retrieved ${historyMessages.length} previous messages from ${scenario_name} conversations.`,
        detectedScenario: scenario_name
      };
    } catch (error) {
      console.error('[fetchHistoryContext] Error:', error);
      return {
        success: false,
        historyContext: 'No previous conversation history available.',
        messageCount: 0,
        summary: 'Unable to retrieve conversation history.',
        detectedScenario: scenario_name
      };
    }
  }
});