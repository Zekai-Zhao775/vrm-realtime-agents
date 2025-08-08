import { VRMManager } from './vrmManager';

/**
 * Development utilities for VRM management
 * These functions are helpful for debugging and development
 */

/**
 * Log all current VRM configurations
 */
export function logVRMStatus(): void {
  const vrmManager = VRMManager.getInstance();
  const allVRMs = vrmManager.getAllScenarioVRMs();
  
  console.group('🎭 VRM Status Report');
  
  Object.entries(allVRMs).forEach(([scenario, info]) => {
    console.group(`📋 ${scenario}`);
    console.log('URL:', info.url);
    console.log('Config:', info.config);
    console.log('Is Custom:', info.isCustom ? '✅ Yes' : '❌ No (Default)');
    console.groupEnd();
  });
  
  console.groupEnd();
}

/**
 * Reset all custom VRMs to defaults
 */
export function resetAllVRMsToDefaults(): void {
  const vrmManager = VRMManager.getInstance();
  const scenarios = ['simpleHandoff', 'customerServiceRetail', 'virtualTherapist', 'chatSupervisor'];
  
  scenarios.forEach(scenario => {
    vrmManager.clearCustomVRM(scenario);
  });
  
  console.log('🔄 All VRMs reset to defaults');
  logVRMStatus();
}

/**
 * Check if all required VRM files exist
 */
export async function validateAllVRMFiles(): Promise<void> {
  const vrmManager = VRMManager.getInstance();
  const scenarios = ['simpleHandoff', 'customerServiceRetail', 'virtualTherapist', 'chatSupervisor'];
  
  console.group('🔍 VRM File Validation');
  
  for (const scenario of scenarios) {
    const info = vrmManager.getVRMInfo(scenario);
    const isValid = await vrmManager.validateVRMUrl(info.url);
    
    console.log(
      `${isValid ? '✅' : '❌'} ${scenario}: ${info.url} ${isValid ? 'EXISTS' : 'MISSING'}`
    );
  }
  
  console.groupEnd();
}

// Make utilities available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).vrmUtils = {
    logStatus: logVRMStatus,
    resetAll: resetAllVRMsToDefaults,
    validate: validateAllVRMFiles,
    manager: VRMManager.getInstance()
  };
  
  console.log('🛠️ VRM development utilities loaded. Use window.vrmUtils to access them.');
}