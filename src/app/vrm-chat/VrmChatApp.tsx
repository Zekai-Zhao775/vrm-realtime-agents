"use client";

import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useRealtimeSession } from "@/app/hooks/useRealtimeSession";
import { useHandleSessionHistory } from "@/app/hooks/useHandleSessionHistory";
import { allAgentSets } from "@/app/agentConfigs";
import { ViewerContext } from "@/app/features/vrmViewer/viewerContext";
import { VRMManager } from "@/app/lib/vrmManager";
import { conversationHistory } from "@/app/lib/conversationHistory";
import VrmViewer from "@/app/components/vrm/vrmViewer";
import styles from "./vrm-chat.module.css";

export default function VrmChatApp() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const searchParams = useSearchParams();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [showIntro, setShowIntro] = useState(true);
  const [showConversationLog, setShowConversationLog] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  // Get agentConfig from URL parameters (same as debug page)
  const agentConfig = searchParams.get("agentConfig") || "chatSupervisor";
  const previousAgentConfigRef = useRef<string>(agentConfig);

  const { viewer } = useContext(ViewerContext);
  const { transcriptItems, addTranscriptMessage, clearTranscript } = useTranscript();
  const { events, setEvents } = useEvent();

  const session = useRealtimeSession();
  const historyHandlers = useHandleSessionHistory();

  // Initialize URL parameter if missing or invalid (same as debug page)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let finalAgentConfig = searchParams.get("agentConfig");
    if (!finalAgentConfig || !allAgentSets[finalAgentConfig]) {
      finalAgentConfig = "chatSupervisor";
      const url = new URL(window.location.toString());
      url.searchParams.set("agentConfig", finalAgentConfig);
      window.location.replace(url.toString());
      return;
    }
  }, [searchParams]);
  
  // Derive connection state from session status
  const isConnected = session.status === 'CONNECTED';
  const isConnecting = session.status === 'CONNECTING';

  // Auto-scroll conversation log when new messages arrive
  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [transcriptItems]);

  // Connect audio stream to VRM lip sync when connected
  useEffect(() => {
    if (isConnected && viewer.model) {
      // Add a delay to ensure audio element is ready
      setTimeout(async () => {
        let stream: MediaStream | null = null;
        
        // Method 1: Get remote stream directly from WebRTC
        try {
          stream = session.getRemoteAudioStream();
          if (stream) {
            await viewer.model.connectToAudioStream(stream);
            return;
          }
        } catch (error) {
          // Fallback to next method
        }
        
        // Method 2: captureStream from audio element (newer browsers)
        if (audioRef.current && audioRef.current.captureStream) {
          try {
            stream = audioRef.current.captureStream();
            if (stream && stream.getTracks().length > 0) {
              await viewer.model.connectToAudioStream(stream);
              return;
            }
          } catch (error) {
            // Fallback to next method
          }
        }
        
        // Method 3: mozCaptureStream (Firefox)
        if (audioRef.current && (audioRef.current as any).mozCaptureStream) {
          try {
            stream = (audioRef.current as any).mozCaptureStream();
            if (stream && stream.getTracks().length > 0) {
              await viewer.model.connectToAudioStream(stream);
              return;
            }
          } catch (error) {
            // All methods failed
          }
        }
      }, 1000); // Wait 1 second for audio to be ready
      
    } else if (!isConnected && viewer.model) {
      // Disconnect when not connected
      viewer.model.disconnectFromAudioStream();
    }
  }, [isConnected, viewer.model, session]);

  // Load VRM when agent configuration changes (but only if already connected)
  useEffect(() => {
    const loadVRMForScenario = async () => {
      if (!isConnected) return; // Only load VRM if already connected
      
      const vrmManager = VRMManager.getInstance();
      const vrmUrl = vrmManager.getVRMUrl(agentConfig);
      
      try {
        const isValid = await vrmManager.validateVRMUrl(vrmUrl);
        if (!isValid) {
          await viewer.loadVrm('/assets/vrm/default.vrm');
        } else {
          await viewer.loadVrm(vrmUrl);
        }
      } catch (vrmError) {
        // VRM loading failed, continue without VRM
      }
    };

    loadVRMForScenario();
  }, [agentConfig, isConnected, viewer]);

  // Save conversation history before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      historyHandlers.current.endSession();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Send initial message to trigger history context fetch when connected
  useEffect(() => {
    if (isConnected) {
      // Add a small delay to ensure the connection is fully established
      setTimeout(() => {
        sendSimulatedUserMessage('(System: Call fetchHistoryContext first so you have the history context)\nHi!');
      }, 1000);
    }
  }, [isConnected]);

  // Clear conversation log when agent config changes (but not on initial load)
  useEffect(() => {
    const previousAgentConfig = previousAgentConfigRef.current;
    if (previousAgentConfig !== agentConfig) {
      console.log(`[VRM Chat] Agent config changed from ${previousAgentConfig} to ${agentConfig}, clearing transcript`);
      clearTranscript();
      previousAgentConfigRef.current = agentConfig;
    }
  }, [agentConfig, clearTranscript]);

  const connect = async () => {
    try {
      // Load VRM for the selected scenario before connecting
      const vrmManager = VRMManager.getInstance();
      const vrmUrl = vrmManager.getVRMUrl(agentConfig);
      
      try {
        const isValid = await vrmManager.validateVRMUrl(vrmUrl);
        if (!isValid) {
          await viewer.loadVrm('/assets/vrm/default.vrm');
        } else {
          await viewer.loadVrm(vrmUrl);
        }
      } catch (vrmError) {
        // Try fallback VRM
        try {
          await viewer.loadVrm('/assets/vrm/default.vrm');
        } catch (fallbackError) {
          console.error('VRM loading failed:', fallbackError);
        }
      }
      
      // Get the session token from our API endpoint
      const response = await fetch('/api/session');
      const data = await response.json();
      
      // Use the same format as the debug page
      const ephemeralKey = data.client_secret?.value;
      if (!ephemeralKey) {
        throw new Error("No ephemeral key provided by the server");
      }

      // Initialize history tracking for this agent configuration
      console.log('[VRM Chat] Initializing session for agent config:', agentConfig);
      historyHandlers.current.initializeSession(agentConfig);
      
      await session.connect({
        getEphemeralKey: async () => ephemeralKey,
        initialAgents: allAgentSets[agentConfig],
        audioElement: audioRef.current || undefined,
      });
    } catch (error) {
      console.error("Failed to connect:", error);
    }
  };

  const disconnect = () => {
    // Save current conversation history before disconnecting
    historyHandlers.current.endSession();
    session.disconnect();
  };

  const clearAllHistory = () => {
    if (confirm('Are you sure you want to clear all conversation history? This action cannot be undone.')) {
      conversationHistory.clearAllHistories();
      // Also clear current session memory
      if (typeof window !== 'undefined') {
        window.__currentSessionMessages = [];
      }
      alert('All conversation history has been cleared.');
    }
  };

  const sendSimulatedUserMessage = (text: string) => {
    const id = uuidv4().slice(0, 32);
    addTranscriptMessage(id, "user", text, true);

    session.sendEvent?.({
      type: 'conversation.item.create',
      item: {
        id,
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });
    session.sendEvent?.({ type: 'response.create' });
  };

  const handleSendMessage = useCallback(async (message: string) => {
    if (!isConnected || !session || !message.trim()) return;
    
    // Send message to the voice agent via session
    try {
      session.sendUserText?.(message.trim());
    } catch (error) {
      console.error("Failed to send text message:", error);
    }
    
    setInputMessage("");
  }, [isConnected, session]);

  return (
    <div className={styles.container}>
      {/* Introduction Modal */}
      {showIntro && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>VRM Realtime Agents</h2>
            <p className={styles.modalText}>
              Chat with 3D characters using OpenAI's Realtime API
            </p>
            
            <div className={styles.labelSection}>
              <label className={styles.label}>
                Agent Type:
              </label>
              <select
                value={agentConfig}
                onChange={(e) => {
                  const newAgentConfig = e.target.value;
                  const url = new URL(window.location.toString());
                  url.searchParams.set("agentConfig", newAgentConfig);
                  window.location.replace(url.toString());
                }}
                disabled={isConnected}
                className={styles.select}
              >
                <option value="chatSupervisor">Chat Supervisor</option>
                <option value="simpleHandoff">Simple Handoff</option>
                <option value="customerServiceRetail">Customer Service</option>
                <option value="virtualTherapist">Virtual Therapist</option>
              </select>
            </div>

            <div className={styles.statusSection}>
              <div className={styles.statusIndicator}>
                <div className={`${styles.statusDot} ${
                  isConnected ? styles.statusConnected : 
                  isConnecting ? styles.statusConnecting : 
                  styles.statusDisconnected
                }`}></div>
                <span>{isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}</span>
              </div>
            </div>

            <div className={styles.buttonGroup}>
              {!isConnected && (
                <button
                  onClick={connect}
                  disabled={isConnecting}
                  className={isConnecting ? styles.buttonConnecting : styles.buttonPrimary}
                >
                  {isConnecting ? "Connecting..." : "Connect"}
                </button>
              )}
              {isConnected && (
                <button
                  onClick={disconnect}
                  className={styles.buttonPrimary}
                >
                  Disconnect
                </button>
              )}
              <button
                onClick={clearAllHistory}
                className={styles.buttonClear}
              >
                Clear All History
              </button>
              <button
                onClick={() => setShowIntro(false)}
                className={styles.buttonSecondary}
              >
                Start Conversation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VRM Viewer */}
      <VrmViewer />

      {/* Control Buttons (ChatVRM style) */}
      <div className={styles.buttonContainer}>
        <div className={styles.buttonGrid}>
          <button
            className={styles.iconButton}
            onClick={() => setShowIntro(true)}
          >
            ⚙️
            <span className={styles.iconButtonLabel}>Settings</span>
          </button>
          <button
            className={styles.iconButton}
            onClick={() => setShowConversationLog(!showConversationLog)}
            disabled={transcriptItems.filter(item => item.type === "MESSAGE" && !item.isHidden).length === 0}
          >
            {showConversationLog ? "💬" : "📝"}
            <span className={styles.iconButtonLabel}>Conversation Log</span>
          </button>
          <div id="VRButton" className={styles.vrButtonContainer}></div>
        </div>
      </div>

      {/* Conversation Log (ChatVRM style) */}
      {showConversationLog && (
        <div className={styles.conversationLog}>
          <div className={styles.conversationMessages}>
            <div className={styles.messagesContainer}>
              {(() => {
                const messages = transcriptItems
                  .filter(item => item.type === "MESSAGE" && !item.isHidden)
                  .sort((a, b) => a.createdAtMs - b.createdAtMs);
                
                return messages.map((item, index) => {
                  const isUser = item.role === "user";
                  const isLastMessage = index === messages.length - 1;
                  
                  return (
                    <div 
                      key={item.itemId} 
                      ref={isLastMessage ? chatScrollRef : null}
                      className={`${styles.messageItem} ${
                        isUser ? styles.messageUser : styles.messageAssistant
                      }`}
                    >
                      <div className={styles.messageTimestamp}>
                        {item.timestamp}
                      </div>
                      <div 
                        className={`${styles.messageHeader} ${
                          isUser ? styles.messageHeaderUser : styles.messageHeaderAssistant
                        }`}
                      >
                        {isUser ? "YOU" : "CHARACTER"}
                      </div>
                      <div 
                        className={`${styles.messageContent} ${
                          isUser ? styles.messageContentUser : styles.messageContentAssistant
                        }`}
                      >
                        {item.title}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Input (ChatVRM style) */}
      <div className={styles.bottomInput}>
        <div className={styles.inputBackground}>
          <div className={styles.inputContainer}>
            <div className={styles.inputGrid}>
              {/* Connect/Disconnect Button (replaces microphone) */}
              <button
                className={styles.connectButton}
                onClick={isConnected ? disconnect : connect}
                disabled={isConnecting}
                data-connected={isConnected.toString()}
              >
                {isConnecting ? "Connecting..." : isConnected ? "Disconnect" : "Connect"}
              </button>
              
              {/* Text Input */}
              <input
                type="text"
                placeholder="Message"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage(inputMessage);
                  }
                }}
                disabled={!isConnected}
                className={styles.textInput}
              />
              
              {/* Send Button */}
              <button
                className={styles.sendButton}
                onClick={() => handleSendMessage(inputMessage)}
                disabled={!isConnected || !inputMessage.trim()}
              >
                📤
              </button>
            </div>
          </div>
          
        </div>
      </div>

      <audio 
        ref={audioRef} 
        autoPlay 
      />
    </div>
  );
}