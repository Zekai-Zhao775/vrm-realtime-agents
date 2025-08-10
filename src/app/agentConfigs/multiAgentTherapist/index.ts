import { greetAgent } from './greetAgent';
import { cbtTherapistAgent } from './cbtTherapistAgent';
import { humanisticTherapistAgent } from './humanisticTherapistAgent';
import { safetyAgent } from './safetyAgent';

// Configure handoffs between agents
(greetAgent.handoffs as any).push(cbtTherapistAgent, humanisticTherapistAgent, safetyAgent);
(cbtTherapistAgent.handoffs as any).push(safetyAgent);
(humanisticTherapistAgent.handoffs as any).push(safetyAgent);

// Export the multi-agent scenario with greet agent as the root
export const multiAgentVirtualTherapistScenario = [greetAgent, cbtTherapistAgent, humanisticTherapistAgent, safetyAgent];

export const multiAgentTherapistCompanyName = 'Advanced Virtual Therapy System';