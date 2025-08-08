import {
  RealtimeAgent,
} from '@openai/agents/realtime';
import { fetchHistoryContext } from './tools/historyTools';

export const haikuWriterAgent = new RealtimeAgent({
  name: 'haikuWriter',
  voice: 'sage',
  instructions:
    'Ask the user for a topic, then reply with a haiku about that topic. You can call fetchHistoryContext to see previous conversations if needed.',
  handoffs: [],
  tools: [fetchHistoryContext],
  handoffDescription: 'Agent that writes haikus',
});

export const greeterAgent = new RealtimeAgent({
  name: 'greeter',
  voice: 'sage',
  instructions:
    "MANDATORY: You MUST call the fetchHistoryContext tool first before doing anything else. Do not greet or respond until you have called this tool. After calling fetchHistoryContext, then greet the user and ask if they'd like a Haiku. If yes, hand off to the 'haiku' agent.",
  handoffs: [haikuWriterAgent],
  tools: [fetchHistoryContext],
  handoffDescription: 'Agent that greets the user',
});

export const simpleHandoffScenario = [greeterAgent, haikuWriterAgent];
