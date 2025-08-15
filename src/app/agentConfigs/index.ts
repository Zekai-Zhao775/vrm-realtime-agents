import { simpleHandoffScenario } from './simpleHandoff';
import { customerServiceRetailScenario } from './customerServiceRetail';
import { chatSupervisorScenario } from './chatSupervisor';
import { virtualTherapistScenario } from './virtualTherapist';
import { multiAgentVirtualTherapistScenario } from './multiAgentTherapist';

import type { RealtimeAgent } from '@openai/agents/realtime';

// Map of scenario key -> array of RealtimeAgent objects
export const allAgentSets: Record<string, RealtimeAgent[]> = {
  multiAgentVirtualTherapist: multiAgentVirtualTherapistScenario,
};

export const defaultAgentSetKey = 'multiAgentVirtualTherapist';
