"use client";

import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useRealtimeSession } from "@/app/hooks/useRealtimeSession";
import { allAgentSets } from "@/app/agentConfigs";
import { ViewerContext } from "@/app/features/vrmViewer/viewerContext";
import VrmViewer from "@/app/components/vrm/vrmViewer";

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
    <div className="vrm-chat-container" style={{ 
      width: '100%', 
      height: '100vh', 
      position: 'relative', 
      backgroundColor: '#FBE2CA',
      fontFamily: 'Arial, sans-serif',
      overflow: 'hidden'
    }}>
      {/* Introduction Modal */}
      {showIntro && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 40
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '1rem',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2 style={{ marginBottom: '1rem', color: '#514062' }}>VRM Realtime Agents</h2>
            <p style={{ marginBottom: '1.5rem', color: '#666' }}>
              Chat with 3D characters using OpenAI's Realtime API
            </p>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Agent Type:
              </label>
              <select
                value={agentConfig}
                onChange={(e) => setAgentConfig(e.target.value)}
                disabled={isConnected}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #ccc'
                }}
              >
                <option value="chatSupervisor">Chat Supervisor</option>
                <option value="simpleHandoff">Simple Handoff</option>
                <option value="customerServiceRetail">Customer Service</option>
                <option value="virtualTherapist">Virtual Therapist</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: isConnected ? '#10B981' : isConnecting ? '#F59E0B' : '#EF4444'
                }}></div>
                <span>{isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              {!isConnected && !isConnecting && (
                <button
                  onClick={connect}
                  style={{
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Connect to Agent
                </button>
              )}
              <button
                onClick={() => setShowIntro(false)}
                style={{
                  backgroundColor: '#FF617F',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
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
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: '1rem',
        zIndex: 20
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: 'flex',
          gap: '0.5rem'
        }}>
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
            style={{
              flex: 1,
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid #ccc',
              backgroundColor: isConnected ? 'white' : '#f5f5f5'
            }}
          />
          <button
            onClick={() => handleSendMessage(inputMessage)}
            disabled={!isConnected || !inputMessage.trim()}
            style={{
              backgroundColor: '#3B82F6',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: isConnected && inputMessage.trim() ? 'pointer' : 'not-allowed',
              opacity: isConnected && inputMessage.trim() ? 1 : 0.5
            }}
          >
            📤
          </button>
        </div>
        
        <div style={{
          textAlign: 'center',
          marginTop: '0.5rem',
          fontSize: '0.8rem',
          color: '#666'
        }}>
          {isConnected ? '🎤 Voice chat active • Type or speak your message' : 'Connect to start chatting'}
        </div>
      </div>

      {/* Settings Button */}
      <button
        onClick={() => setShowIntro(true)}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          backgroundColor: 'rgba(255,255,255,0.9)',
          border: 'none',
          borderRadius: '50%',
          width: '3rem',
          height: '3rem',
          cursor: 'pointer',
          fontSize: '1.2rem',
          zIndex: 30
        }}
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