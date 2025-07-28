"use client";

import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useRealtimeSession } from "@/app/hooks/useRealtimeSession";
import { allAgentSets } from "@/app/agentConfigs";
import { ViewerContext } from "@/app/features/vrmViewer/viewerContext";
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

  const { viewer } = useContext(ViewerContext);
  const { transcriptItems, addTranscriptMessage } = useTranscript();
  const { events, setEvents } = useEvent();

  const session = useRealtimeSession();

  const connect = async () => {
    setIsConnecting(true);
    try {
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
    
    addTranscriptMessage(`user-${Date.now()}`, 'user', message);
    setInputMessage("");
  }, [isConnected, session, addTranscriptMessage]);

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

      {/* Bottom Input */}
      <div className={styles.bottomInput}>
        <div className={styles.inputContainer}>
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage(inputMessage);
              }
            }}
            placeholder="Type your message or speak directly..."
            disabled={!isConnected}
            className={`${styles.textInput} ${
              isConnected ? styles.textInputEnabled : styles.textInputDisabled
            }`}
          />
          <button
            onClick={() => handleSendMessage(inputMessage)}
            disabled={!isConnected || !inputMessage.trim()}
            className={`${styles.sendButton} ${
              (!isConnected || !inputMessage.trim()) ? styles.sendButtonDisabled : ''
            }`}
          >
            📤
          </button>
        </div>
        
        <div className={styles.statusText}>
          {isConnected ? '🎤 Voice chat active • Type or speak your message' : 'Connect to start chatting'}
        </div>
      </div>

      {/* Settings Button */}
      <button
        onClick={() => setShowIntro(true)}
        className={styles.settingsButton}
      >
        ⚙️
      </button>

      <audio 
        ref={audioRef} 
        autoPlay 
        onLoadStart={() => console.log("Audio loading started")}
        onCanPlay={() => console.log("Audio can play")}
        onPlay={() => console.log("Audio started playing")}
        onVolumeChange={() => console.log("Audio volume changed")}
      />
    </div>
  );
}