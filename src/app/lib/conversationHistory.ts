// Conversation history storage using localStorage with scenario-based organization

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Conversation {
  conversation_id: string;
  started_at: string; // ISO timestamp
  messages: ConversationMessage[];
}

export interface Scenario {
  scenario_id: string;
  scenario_name: string; // e.g. 'simpleHandoff', 'chatSupervisor'
  conversations: Conversation[];
}

export interface ConversationStorage {
  scenarios: Scenario[];
}

const STORAGE_KEY = 'vrm_conversation_histories';

export class ConversationHistoryStorage {
  private currentConversationId: string | null = null;

  // Generate IDs
  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private generateScenarioId(): string {
    return `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  // Get all conversation data from localStorage
  private getStorageData(): ConversationStorage {
    if (typeof window === 'undefined') return { scenarios: [] };
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : { scenarios: [] };
    } catch (error) {
      console.error('Error reading conversation histories:', error);
      return { scenarios: [] };
    }
  }

  // Save all conversation data to localStorage
  private saveStorageData(data: ConversationStorage): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.log('[ConversationHistory] Saved to localStorage:', data.scenarios.length, 'scenarios');
    } catch (error) {
      console.error('Error saving conversation histories:', error);
    }
  }

  // Start a new conversation session
  startNewConversation(scenarioName: string): string {
    const conversationId = this.generateConversationId();
    this.currentConversationId = conversationId;
    
    const storage = this.getStorageData();
    
    // Find or create scenario
    let scenario = storage.scenarios.find(s => s.scenario_name === scenarioName);
    if (!scenario) {
      scenario = {
        scenario_id: this.generateScenarioId(),
        scenario_name: scenarioName,
        conversations: []
      };
      storage.scenarios.push(scenario);
    }
    
    // Create new conversation
    const newConversation: Conversation = {
      conversation_id: conversationId,
      started_at: new Date().toISOString(),
      messages: []
    };
    
    scenario.conversations.push(newConversation);
    this.saveStorageData(storage);
    
    console.log(`[ConversationHistory] Started new conversation ${conversationId} for scenario ${scenarioName}`);
    return conversationId;
  }

  // Add a message to the current conversation
  addMessage(scenarioName: string, role: 'user' | 'assistant', content: string): void {
    if (!this.currentConversationId) {
      // Auto-start a new conversation if none exists
      this.startNewConversation(scenarioName);
    }
    
    const storage = this.getStorageData();
    const scenario = storage.scenarios.find(s => s.scenario_name === scenarioName);
    
    if (!scenario) {
      console.error(`[ConversationHistory] Scenario ${scenarioName} not found`);
      return;
    }
    
    const conversation = scenario.conversations.find(c => c.conversation_id === this.currentConversationId);
    if (!conversation) {
      console.error(`[ConversationHistory] Conversation ${this.currentConversationId} not found`);
      return;
    }
    
    const trimmedContent = content.trim();
    
    // Avoid duplicate messages (check if this exact message already exists in recent messages)
    const recentMessages = conversation.messages.slice(-5); // Check last 5 messages
    const isDuplicate = recentMessages.some(msg => 
      msg.role === role && msg.content === trimmedContent
    );
    
    if (isDuplicate) {
      console.log(`[ConversationHistory] Skipping duplicate ${role} message: "${trimmedContent.substring(0, 50)}..."`);
      return;
    }
    
    // Add the new message
    conversation.messages.push({
      role,
      content: trimmedContent
    });
    
    this.saveStorageData(storage);
    console.log(`[ConversationHistory] Added ${role} message to ${scenarioName}:`, trimmedContent.substring(0, 50) + '...');
  }

  // Get all conversations for a scenario
  getScenarioConversations(scenarioName: string): Conversation[] {
    const storage = this.getStorageData();
    const scenario = storage.scenarios.find(s => s.scenario_name === scenarioName);
    return scenario?.conversations || [];
  }

  // Get recent messages from all conversations in a scenario
  getRecentMessages(scenarioName: string, limit: number = 20): ConversationMessage[] {
    const conversations = this.getScenarioConversations(scenarioName);
    
    if (conversations.length === 0) {
      return [];
    }
    
    // Get all messages from all conversations, sorted by conversation start time
    const allMessages: ConversationMessage[] = [];
    conversations
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
      .forEach(conv => {
        allMessages.push(...conv.messages);
      });
    
    // Return the most recent messages
    return allMessages.slice(-limit);
  }

  // Get formatted history for LLM context
  getFormattedHistory(scenarioName: string, limit: number = 20): string {
    const messages = this.getRecentMessages(scenarioName, limit);
    
    if (messages.length === 0) {
      return 'No previous conversation history found.';
    }
    
    const conversations = this.getScenarioConversations(scenarioName);
    const conversationCount = conversations.length;
    
    const formatted = messages.map((msg, index) => {
      return `${index + 1}. ${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;
    }).join('\n');
    
    return `Previous conversation history from ${conversationCount} conversation(s) (${messages.length} recent messages):\n${formatted}\n\nEnd of history.`;
  }

  // End current conversation (call when disconnecting)
  endCurrentConversation(): void {
    console.log(`[ConversationHistory] Ended conversation ${this.currentConversationId}`);
    this.currentConversationId = null;
  }

  // Clear all conversation histories
  clearAllHistories(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
    this.currentConversationId = null;
    console.log('[ConversationHistory] Cleared all conversation histories');
  }

  // Get summary of all stored data
  getSummary(): { scenarioName: string; conversationCount: number; totalMessages: number }[] {
    const storage = this.getStorageData();
    return storage.scenarios.map(scenario => ({
      scenarioName: scenario.scenario_name,
      conversationCount: scenario.conversations.length,
      totalMessages: scenario.conversations.reduce((total, conv) => total + conv.messages.length, 0)
    }));
  }

  // Get current conversation ID
  getCurrentConversationId(): string | null {
    return this.currentConversationId;
  }
}

// Export singleton instance
export const conversationHistory = new ConversationHistoryStorage();