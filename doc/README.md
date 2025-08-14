# System Architecture Diagrams

This folder contains technical diagrams supporting the system design documentation for the Real-time VRM Virtual Therapist project.

## Diagram Files

### 1. System Architecture Overview (`system-architecture-overview.puml`)
**Type**: PlantUML Component Diagram
**Purpose**: High-level system architecture showing all major components and their relationships
**Key Elements**:
- Frontend framework structure (Next.js, React, TypeScript)
- Multi-agent coordination layer
- Real-time audio pipeline
- VRM rendering engine
- WebXR integration layer
- Session management core
- External service dependencies

### 2. Multi-Agent Flow (`multi-agent-flow.mmd`)
**Type**: Mermaid Flowchart
**Purpose**: Illustrates the conversation flow and handoff mechanisms between therapeutic agents
**Key Elements**:
- User onboarding and consent process
- Therapeutic approach selection (CBT vs Humanistic)
- Crisis detection and safety protocols
- Agent-specific tools and techniques
- Session documentation and closure

### 3. Audio Pipeline Sequence (`audio-pipeline-sequence.puml`)
**Type**: PlantUML Sequence Diagram
**Purpose**: Details real-time audio communication flow and timing
**Key Elements**:
- WebRTC session initialization
- Real-time voice streaming (no TTS/STT pipeline)
- Avatar animation synchronization
- User interruption handling
- Agent handoff during audio communication
- Error handling and reconnection

### 4. VRM Integration Components (`vrm-integration-components.puml`)
**Type**: PlantUML Class Diagram
**Purpose**: Shows detailed VRM system architecture and component relationships
**Key Elements**:
- VRM management and loading system
- Three.js rendering integration
- @pixiv/three-vrm library usage
- Animation control system (expressions, lip-sync, gaze)
- VR integration components

### 5. WebXR Implementation Flow (`webxr-implementation-flow.mmd`)
**Type**: Mermaid Flowchart
**Purpose**: Demonstrates VR implementation flow and cross-platform compatibility
**Key Elements**:
- WebXR capability detection
- Progressive enhancement from 2D to VR
- Environment selection and configuration
- VR-specific user experience features
- Cross-platform device support

### 6. Data Flow Integration (`data-flow-integration.puml`)
**Type**: PlantUML Sequence Diagram
**Purpose**: Shows complete data flow between all system components during operation
**Key Elements**:
- Session initialization and setup
- Real-time conversation data flow
- Agent handoff process with context preservation
- VR mode activation and management
- Continuous system monitoring and optimization
- Session termination and data persistence

## Viewing the Diagrams

### PlantUML Files (`.puml`)
**Online Viewers**:
- [PlantUML Online Server](http://www.plantuml.com/plantuml/uml/)
- [PlantText](https://www.planttext.com/)

**Local Rendering**:
- Install PlantUML: `npm install -g plantuml` or use Java version
- Render: `plantuml diagram-name.puml`

**IDE Support**:
- VS Code: PlantUML extension
- IntelliJ IDEA: PlantUML integration plugin
- Atom: PlantUML viewer

### Mermaid Files (`.mmd`)
**Online Viewers**:
- [Mermaid Live Editor](https://mermaid.live/)
- [Mermaid Online](https://mermaid-js.github.io/mermaid-live-editor/)

**Local Rendering**:
- Install Mermaid CLI: `npm install -g @mermaid-js/mermaid-cli`
- Render: `mmdc -i diagram-name.mmd -o output.png`

**IDE Support**:
- VS Code: Mermaid Preview extension
- GitHub: Native Mermaid rendering in markdown

## Integration with Report

These diagrams support the "System Design and Methodology" section of the Master's thesis report and should be referenced as:

- **Figure 3.1**: System Architecture Overview (Section 3.1.1)
- **Figure 3.2**: Multi-Agent Conversation Flow (Section 3.2.2) 
- **Figure 3.3**: Real-time Audio Pipeline Sequence (Section 3.3.1)
- **Figure 3.4**: VRM Integration Component Architecture (Section 3.4.1)
- **Figure 3.5**: WebXR Implementation Flow (Section 3.5.1)
- **Figure 3.6**: System Data Flow and Integration (Section 3.6)

## Technical Notes

- All diagrams use text-based formats for version control and easy modification
- Diagrams are designed to be printable in black and white for thesis submission
- Color coding is used to distinguish different system components and flow types
- Consistent styling and terminology across all diagrams