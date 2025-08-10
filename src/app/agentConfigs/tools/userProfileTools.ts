/**
 * User Profile Management Tools for Multi-Agent Virtual Therapist System
 * Stores user data in localStorage for privacy and persistence
 */

import { tool } from '@openai/agents/realtime';

export interface UserProfileProgress {
  id: string;
  ts: string;
  text: string;
  agent: string;
  tags: string[];
}

export interface UserProfileMemory {
  id: string;
  ts: string;
  text: string;
  agent: string;
  tags: string[];
}

export interface UserProfile {
  name: string;
  pronouns: string;
  consent: boolean;
  progress: {
    timeline: UserProfileProgress[];
    last_updated: string;
  };
  memory: {
    timeline: UserProfileMemory[];
    last_updated: string;
  };
}

const USER_PROFILE_KEY = 'virtualTherapistUserProfile';

/**
 * Generates a unique ID for timeline entries
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Gets current ISO timestamp
 */
function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Creates default user profile structure
 */
function createDefaultProfile(): UserProfile {
  return {
    name: "",
    pronouns: "",
    consent: false,
    progress: {
      timeline: [],
      last_updated: getCurrentTimestamp()
    },
    memory: {
      timeline: [],
      last_updated: getCurrentTimestamp()
    }
  };
}

/**
 * Fetch user profile from localStorage
 */
export const fetchUserProfile = tool({
  name: 'fetchUserProfile',
  description: 'Retrieves the complete user profile from local storage including name, pronouns, consent, progress timeline, and memory timeline',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false
  },
  async execute() {
    try {
      const stored = localStorage.getItem(USER_PROFILE_KEY);
      
      if (!stored) {
        const defaultProfile = createDefaultProfile();
        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(defaultProfile));
        console.log('[fetchUserProfile] Created new user profile');
        return {
          success: true,
          profile: defaultProfile,
          message: 'New user profile created'
        };
      }

      const profile: UserProfile = JSON.parse(stored);
      console.log('[fetchUserProfile] Retrieved existing profile');
      return {
        success: true,
        profile,
        message: 'User profile retrieved successfully'
      };

    } catch (error) {
      console.error('[fetchUserProfile] Error:', error);
      const defaultProfile = createDefaultProfile();
      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(defaultProfile));
      return {
        success: false,
        profile: defaultProfile,
        message: 'Error retrieving profile, created new one'
      };
    }
  }
});

/**
 * Update basic user profile information (name, pronouns, consent)
 */
export const updateUserProfile = tool({
  name: 'updateUserProfile',
  description: 'Updates basic user information including name, pronouns, and consent status. Creates profile if it does not exist.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'User\'s preferred name'
      },
      pronouns: {
        type: 'string',
        description: 'User\'s preferred pronouns (e.g., he/him, she/her, they/them)'
      },
      consent: {
        type: 'boolean',
        description: 'Whether user has given consent for therapeutic conversations'
      }
    },
    required: [],
    additionalProperties: false
  },
  async execute(params: { name?: string; pronouns?: string; consent?: boolean }) {
    try {
      let profile: UserProfile;
      const stored = localStorage.getItem(USER_PROFILE_KEY);
      
      if (!stored) {
        profile = createDefaultProfile();
        console.log('[updateUserProfile] Created new profile');
      } else {
        profile = JSON.parse(stored);
        console.log('[updateUserProfile] Loaded existing profile');
      }

      // Update provided fields
      if (params.name !== undefined) {
        profile.name = params.name;
      }
      if (params.pronouns !== undefined) {
        profile.pronouns = params.pronouns;
      }
      if (params.consent !== undefined) {
        profile.consent = params.consent;
      }

      // Save updated profile
      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
      
      console.log('[updateUserProfile] Profile updated:', { 
        name: profile.name, 
        pronouns: profile.pronouns, 
        consent: profile.consent 
      });

      return {
        success: true,
        profile,
        message: 'User profile updated successfully'
      };

    } catch (error) {
      console.error('[updateUserProfile] Error:', error);
      return {
        success: false,
        message: 'Failed to update user profile'
      };
    }
  }
});

/**
 * Add progress entry to user's therapeutic timeline
 */
export const updateProgress = tool({
  name: 'updateProgress',
  description: 'Records therapeutic progress, achievements, or milestones in the user\'s timeline',
  parameters: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Description of the progress or achievement'
      },
      agent: {
        type: 'string',
        description: 'Name of the agent recording the progress'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags to categorize the progress entry (e.g., ["cbt", "homework", "anxiety"])'
      }
    },
    required: ['text', 'agent', 'tags'],
    additionalProperties: false
  },
  async execute(params: { text: string; agent: string; tags: string[] }) {
    try {
      // Get existing profile or create new one
      let profile: UserProfile;
      const stored = localStorage.getItem(USER_PROFILE_KEY);
      
      if (!stored) {
        profile = createDefaultProfile();
        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
      } else {
        profile = JSON.parse(stored);
      }

      const timestamp = getCurrentTimestamp();
      
      const progressEntry: UserProfileProgress = {
        id: generateId(),
        ts: timestamp,
        text: params.text,
        agent: params.agent,
        tags: params.tags
      };

      profile.progress.timeline.push(progressEntry);
      profile.progress.last_updated = timestamp;

      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
      
      console.log('[updateProgress] Added progress entry:', progressEntry);

      return {
        success: true,
        entry: progressEntry,
        message: 'Progress recorded successfully'
      };

    } catch (error) {
      console.error('[updateProgress] Error:', error);
      return {
        success: false,
        message: 'Failed to record progress'
      };
    }
  }
});

/**
 * Add memory entry to user's therapeutic timeline
 */
export const updateMemory = tool({
  name: 'updateMemory',
  description: 'Records important information about the user for future therapeutic sessions (preferences, triggers, insights, etc.)',
  parameters: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Important information to remember about the user'
      },
      agent: {
        type: 'string',
        description: 'Name of the agent recording the memory'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags to categorize the memory entry (e.g., ["preference", "trigger", "strength"])'
      }
    },
    required: ['text', 'agent', 'tags'],
    additionalProperties: false
  },
  async execute(params: { text: string; agent: string; tags: string[] }) {
    try {
      // Get existing profile or create new one
      let profile: UserProfile;
      const stored = localStorage.getItem(USER_PROFILE_KEY);
      
      if (!stored) {
        profile = createDefaultProfile();
        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
      } else {
        profile = JSON.parse(stored);
      }

      const timestamp = getCurrentTimestamp();
      
      const memoryEntry: UserProfileMemory = {
        id: generateId(),
        ts: timestamp,
        text: params.text,
        agent: params.agent,
        tags: params.tags
      };

      profile.memory.timeline.push(memoryEntry);
      profile.memory.last_updated = timestamp;

      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
      
      console.log('[updateMemory] Added memory entry:', memoryEntry);

      return {
        success: true,
        entry: memoryEntry,
        message: 'Memory recorded successfully'
      };

    } catch (error) {
      console.error('[updateMemory] Error:', error);
      return {
        success: false,
        message: 'Failed to record memory'
      };
    }
  }
});