import { getDefaultVRMPath, getVRMConfig } from '../agentConfigs/vrmConfig';

/**
 * VRM Manager - Handles VRM loading and management
 */
export class VRMManager {
  private static instance: VRMManager;
  private loadedVRMs: Map<string, string> = new Map();

  private constructor() {}

  public static getInstance(): VRMManager {
    if (!VRMManager.instance) {
      VRMManager.instance = new VRMManager();
    }
    return VRMManager.instance;
  }

  /**
   * Get VRM URL for a specific scenario
   * Returns cached URL if available, otherwise loads default
   */
  public getVRMUrl(scenarioKey: string): string {
    // Check if user has custom VRM for this scenario
    const customVRM = this.getUserCustomVRM(scenarioKey);
    if (customVRM) {
      return customVRM;
    }

    // Check if we have cached default
    if (this.loadedVRMs.has(scenarioKey)) {
      return this.loadedVRMs.get(scenarioKey)!;
    }

    // Get default VRM path
    const defaultPath = getDefaultVRMPath(scenarioKey);
    if (defaultPath) {
      this.loadedVRMs.set(scenarioKey, defaultPath);
      return defaultPath;
    }

    // Fallback to a generic VRM if scenario not found
    const fallbackPath = '/assets/vrm/default.vrm';
    this.loadedVRMs.set(scenarioKey, fallbackPath);
    return fallbackPath;
  }

  /**
   * Set custom VRM for a scenario (for user customization)
   */
  public setCustomVRM(scenarioKey: string, vrmUrl: string): void {
    const customVRMKey = `custom_vrm_${scenarioKey}`;
    localStorage.setItem(customVRMKey, vrmUrl);
  }

  /**
   * Get user's custom VRM for a scenario
   */
  private getUserCustomVRM(scenarioKey: string): string | null {
    const customVRMKey = `custom_vrm_${scenarioKey}`;
    return localStorage.getItem(customVRMKey);
  }

  /**
   * Clear custom VRM for a scenario (revert to default)
   */
  public clearCustomVRM(scenarioKey: string): void {
    const customVRMKey = `custom_vrm_${scenarioKey}`;
    localStorage.removeItem(customVRMKey);
  }

  /**
   * Get VRM info for a scenario
   */
  public getVRMInfo(scenarioKey: string): { url: string; config: any; isCustom: boolean } {
    const config = getVRMConfig(scenarioKey);
    const url = this.getVRMUrl(scenarioKey);
    const isCustom = !!this.getUserCustomVRM(scenarioKey);

    return {
      url,
      config,
      isCustom
    };
  }

  /**
   * Validate if VRM file exists (basic check)
   */
  public async validateVRMUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all scenario VRM info
   */
  public getAllScenarioVRMs(): Record<string, { url: string; config: any; isCustom: boolean }> {
    const scenarios = ['simpleHandoff', 'customerServiceRetail', 'virtualTherapist', 'chatSupervisor'];
    const result: Record<string, { url: string; config: any; isCustom: boolean }> = {};

    scenarios.forEach(scenario => {
      result[scenario] = this.getVRMInfo(scenario);
    });

    return result;
  }
}