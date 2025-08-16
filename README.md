# VRM Realtime Agents

A real-time multi-agent virtual therapist system using OpenAI Realtime API, OpenAI Agent SDK with VRM avatars and WebXR support.

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup API Key
Set up your OpenAI API key as a system environment variable:

**Windows:**
```cmd
setx OPENAI_API_KEY "your_openai_api_key_here"
```

**macOS/Linux:**
```bash
export OPENAI_API_KEY="your_openai_api_key_here"
```

Add to your shell profile (`.bashrc`, `.zshrc`, etc.) to make it permanent:
```bash
echo 'export OPENAI_API_KEY="your_openai_api_key_here"' >> ~/.bashrc
```

### 3. Run the Project
```bash
npm run dev
```

Open your browser:
- **VRM Chat Interface**: http://localhost:3000
- **Debug Interface**: http://localhost:3000/debug

## Replace VRM Avatar

### 1. Add Your VRM File
Place your `.vrm` file in the `public/vrm/` directory.

### 2. Configure VRM Mapping
Edit `src/app/lib/vrmManager.ts`:

```typescript
private vrmConfigs: Record<string, VRMConfig> = {
  multiAgentVirtualTherapist: {
    vrmUrl: "/vrm/your-avatar.vrm",  // Change this path
    idleAnimationUrl: "/animations/idle_loop.vrma"
  }
};
```

## Configure New Multi-Agent System

### 1. Create Agent Configuration Directory
```
src/app/agentConfigs/yourNewSystem/
├── index.ts
├── agent1.ts
├── agent2.ts
└── tools/
    └── yourTools.ts
```

### 2. Define Individual Agents
Create agent files (e.g., `agent1.ts`):

```typescript
import { RealtimeAgent } from "@openai/agents/realtime";

export const agent1 = new RealtimeAgent({
  name: "agent1",
  voice: "alloy",
  handoffDescription: "Description of when to handoff to this agent",
  instructions: `Your agent instructions here...`,
  tools: [
    // Your tools here
  ],
  handoffs: [] // Will be populated in index.ts
});
```

### 3. Configure System & Handoffs
Create `index.ts`:

```typescript
import { agent1 } from './agent1';
import { agent2 } from './agent2';

// Configure handoffs between agents
(agent1.handoffs as any).push(agent2);
(agent2.handoffs as any).push(agent1);

// Export the multi-agent scenario
export const yourNewSystemScenario = [agent1, agent2];
export const yourNewSystemCompanyName = 'Your Company Name';
```

### 4. Register the System
Edit `src/app/agentConfigs/index.ts`:

```typescript
import { yourNewSystemScenario } from './yourNewSystem';

export const allAgentSets: Record<string, RealtimeAgent[]> = {
  multiAgentVirtualTherapist: multiAgentVirtualTherapistScenario,
  yourNewSystem: yourNewSystemScenario, // Add your system here
};

// Optional: Change default
export const defaultAgentSetKey = 'yourNewSystem';
```

### 5. Add VRM Configuration (Optional)
If using custom avatar, edit `src/app/lib/vrmManager.ts`:

```typescript
private vrmConfigs: Record<string, VRMConfig> = {
  multiAgentVirtualTherapist: { /* existing config */ },
  yourNewSystem: {
    vrmUrl: "/vrm/your-system-avatar.vrm",
    idleAnimationUrl: "/animations/idle_loop.vrma"
  }
};
```

Your new multi-agent system will now appear in both the VRM chat interface and debug interface dropdown menus.
