/**
 * VRM Configuration for each scenario
 * Maps agent scenarios to their default VRM models
 */

export interface VRMConfig {
  defaultModel: string;
  name: string;
  description?: string;
}

export const VRM_CONFIGS: Record<string, VRMConfig> = {
  simpleHandoff: {
    defaultModel: '/assets/vrm/haiku-writer.vrm',
    name: 'Haiku Writer',
    description: 'A calm and contemplative character for haiku writing'
  },
  
  customerServiceRetail: {
    defaultModel: '/assets/vrm/snowboard-specialist.vrm', 
    name: 'Snowboard Specialist',
    description: 'Friendly snowboard expert for Snowy Peak Boards'
  },
  
  virtualTherapist: {
    defaultModel: '/assets/vrm/therapist.vrm',
    name: 'Dr. Therapy',
    description: 'Professional and caring virtual therapist'
  },
  
  chatSupervisor: {
    defaultModel: '/assets/vrm/customer-service.vrm',
    name: 'NewTelco Agent',
    description: 'Professional customer service representative'
  },
  
  multiAgentVirtualTherapist: {
    defaultModel: '/assets/vrm/therapist.vrm',
    name: 'Multi-Agent Therapist',
    description: 'Advanced multi-agent virtual therapy system with specialized therapeutic approaches'
  }
};

/**
 * Get VRM configuration for a scenario
 */
export function getVRMConfig(scenarioKey: string): VRMConfig | null {
  return VRM_CONFIGS[scenarioKey] || null;
}

/**
 * Get default VRM path for a scenario
 */
export function getDefaultVRMPath(scenarioKey: string): string | null {
  const config = getVRMConfig(scenarioKey);
  return config?.defaultModel || null;
}

/**
 * Get all available VRM scenarios
 */
export function getAvailableVRMScenarios(): string[] {
  return Object.keys(VRM_CONFIGS);
}