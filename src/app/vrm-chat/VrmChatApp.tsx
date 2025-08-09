"use client";

import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useRealtimeSession } from "@/app/hooks/useRealtimeSession";
import { allAgentSets } from "@/app/agentConfigs";
import { ViewerContext } from "@/app/features/vrmViewer/viewerContext";
import { VRMManager } from "@/app/lib/vrmManager";
import VrmViewer from "@/app/components/vrm/vrmViewer";
import styles from "./vrm-chat.module.css";

export default function VrmChatApp() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [agentConfig, setAgentConfig] = useState("chatSupervisor");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [showIntro, setShowIntro] = useState(true);
  const [showConversationLog, setShowConversationLog] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const { viewer } = useContext(ViewerContext);
  const { transcriptItems, addTranscriptMessage } = useTranscript();
  const { events, setEvents } = useEvent();

  const session = useRealtimeSession();

  // Auto-scroll conversation log when new messages arrive
  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [transcriptItems]);

  // Connect audio stream to VRM lip sync when connected
  useEffect(() => {
    console.log("Lip sync effect triggered:", { isConnected, hasModel: !!viewer.model, hasSession: !!session });
    
    if (isConnected && viewer.model) {
      // Add a delay to ensure audio element is ready
      setTimeout(async () => {
        let stream: MediaStream | null = null;
        
        console.log("Attempting to connect lip sync...");
        console.log("Audio element:", audioRef.current);
        console.log("Audio element srcObject:", audioRef.current?.srcObject);
        console.log("Session:", session);
        
        // Method 1: Get remote stream directly from WebRTC
        try {
          stream = session.getRemoteAudioStream();
          console.log("WebRTC remote stream:", stream);
          if (stream) {
            console.log("Stream tracks:", stream.getTracks());
            await viewer.model.connectToAudioStream(stream);
            console.log("✅ Connected VRM lip sync to WebRTC remote audio stream");
            return;
          }
        } catch (error) {
          console.error("WebRTC stream access failed:", error);
        }
        
        // Method 2: captureStream from audio element (newer browsers)
        if (audioRef.current && audioRef.current.captureStream) {
          try {
            stream = audioRef.current.captureStream();
            console.log("captureStream result:", stream);
            if (stream && stream.getTracks().length > 0) {
              await viewer.model.connectToAudioStream(stream);
              console.log("✅ Connected VRM lip sync to audio stream via captureStream");
              return;
            }
          } catch (error) {
            console.warn("captureStream failed:", error);
          }
        }
        
        // Method 3: mozCaptureStream (Firefox)
        if (audioRef.current && (audioRef.current as any).mozCaptureStream) {
          try {
            stream = (audioRef.current as any).mozCaptureStream();
            console.log("mozCaptureStream result:", stream);
            if (stream && stream.getTracks().length > 0) {
              await viewer.model.connectToAudioStream(stream);
              console.log("✅ Connected VRM lip sync to audio stream via mozCaptureStream");
              return;
            }
          } catch (error) {
            console.warn("mozCaptureStream failed:", error);
          }
        }
        
        console.error("❌ Could not access any audio stream for lip sync");
      }, 1000); // Wait 1 second for audio to be ready
      
    } else if (!isConnected && viewer.model) {
      // Disconnect when not connected
      console.log("Disconnecting lip sync...");
      viewer.model.disconnectFromAudioStream();
    }
  }, [isConnected, viewer.model, session]);

  // Load VRM when agent configuration changes (but only if already connected)
  useEffect(() => {
    const loadVRMForScenario = async () => {
      if (!isConnected) return; // Only load VRM if already connected
      
      const vrmManager = VRMManager.getInstance();
      const vrmUrl = vrmManager.getVRMUrl(agentConfig);
      console.log(`🔄 Scenario changed to "${agentConfig}", loading VRM:`, vrmUrl);
      
      try {
        const isValid = await vrmManager.validateVRMUrl(vrmUrl);
        if (!isValid) {
          console.warn(`VRM file not found: ${vrmUrl}, using fallback`);
          await viewer.loadVrm('/assets/vrm/default.vrm');
        } else {
          await viewer.loadVrm(vrmUrl);
        }
        console.log(`✅ VRM loaded successfully for changed scenario "${agentConfig}"`);
      } catch (vrmError) {
        console.error(`❌ Failed to load VRM for changed scenario "${agentConfig}":`, vrmError);
      }
    };

    loadVRMForScenario();
  }, [agentConfig, isConnected, viewer]);

  const connect = async () => {
    setIsConnecting(true);
    try {
      // Load VRM for the selected scenario before connecting
      const vrmManager = VRMManager.getInstance();
      const vrmUrl = vrmManager.getVRMUrl(agentConfig);
      console.log(`🎭 Loading VRM for scenario "${agentConfig}":`, vrmUrl);
      
      try {
        // Validate and load VRM
        const isValid = await vrmManager.validateVRMUrl(vrmUrl);
        if (!isValid) {
          console.warn(`VRM file not found: ${vrmUrl}, using fallback`);
          await viewer.loadVrm('/assets/vrm/default.vrm');
        } else {
          await viewer.loadVrm(vrmUrl);
        }
        console.log(`✅ VRM loaded successfully for scenario "${agentConfig}"`);
      } catch (vrmError) {
        console.error(`❌ Failed to load VRM for scenario "${agentConfig}":`, vrmError);
        // Try fallback VRM
        try {
          await viewer.loadVrm('/assets/vrm/default.vrm');
          console.log('✅ Fallback VRM loaded');
        } catch (fallbackError) {
          console.error('❌ Fallback VRM also failed:', fallbackError);
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
      
      await session?.connect({
        getEphemeralKey: async () => ephemeralKey,
        initialAgents: allAgentSets[agentConfig],
        audioElement: audioRef.current || undefined,
      });
      setIsConnected(true);
    } catch (error) {
      console.error("Failed to connect:", error);
    } finally {
      setIsConnecting(false);
    }
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
                onChange={(e) => setAgentConfig(e.target.value)}
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
              {!isConnected && !isConnecting && (
                <button
                  onClick={connect}
                  className={styles.buttonPrimary}
                >
                  Connect to Agent
                </button>
              )}
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
                onClick={isConnected ? () => session?.disconnect() : connect}
                disabled={isConnecting}
              >
                {isConnecting ? "⏳" : isConnected ? "🔌" : "🔗"}
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