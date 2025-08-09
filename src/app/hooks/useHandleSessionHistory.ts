"use client";

import { useRef } from "react";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { conversationHistory } from "@/app/lib/conversationHistory";

// Extend the Window interface to include our custom property
declare global {
  interface Window {
    __currentSessionMessages: Array<{role: 'user' | 'assistant', content: string}>;
  }
}

export function useHandleSessionHistory() {
  const {
    transcriptItems,
    addTranscriptBreadcrumb,
    addTranscriptMessage,
    updateTranscriptMessage,
    updateTranscriptItem,
  } = useTranscript();

  const { logServerEvent } = useEvent();
  
  // Track current agent config and session messages in memory
  const currentAgentConfigRef = useRef<string | null>(null);
  
  // Use a more persistent storage approach - store in window object to survive hot reloads
  if (typeof window !== 'undefined' && !window.__currentSessionMessages) {
    window.__currentSessionMessages = [];
  }
  const getCurrentSessionMessages = () => (typeof window !== 'undefined' ? window.__currentSessionMessages : []) as Array<{role: 'user' | 'assistant', content: string}>;

  // Function to save session to localStorage
  const saveSessionToStorage = () => {
    const agentConfig = currentAgentConfigRef.current;
    const messages = getCurrentSessionMessages();
    console.log('[SessionHistory] saveSessionToStorage called:', { 
      agentConfig, 
      messageCount: messages.length,
      messages: messages.slice(0, 2) // Show first 2 messages for debugging
    });
    
    if (!agentConfig || messages.length === 0) {
      console.log('[SessionHistory] No session to save - agentConfig:', agentConfig, 'messages:', messages.length);
      return;
    }

    console.log('[SessionHistory] Saving session to localStorage:', { 
      agentConfig, 
      messageCount: messages.length 
    });

    // Start a new conversation for this scenario
    conversationHistory.startNewConversation(agentConfig);
    
    // Add all messages from current session to localStorage
    messages.forEach(({ role, content }, index) => {
      console.log('[SessionHistory] Adding message', index + 1, ':', { role, content: content.substring(0, 50) });
      conversationHistory.addMessage(agentConfig, role, content);
    });

    // Clear current session from memory
    if (typeof window !== 'undefined') {
      window.__currentSessionMessages = [];
    }
    console.log('[SessionHistory] Session saved and memory cleared');
  };

  // Function to initialize the current session with agent config
  const initializeSession = (agentConfig: string) => {
    // Save previous session if switching scenarios
    const messages = getCurrentSessionMessages();
    if (currentAgentConfigRef.current && currentAgentConfigRef.current !== agentConfig && messages.length > 0) {
      console.log('[SessionHistory] Switching scenarios, saving previous session');
      saveSessionToStorage();
    }
    
    currentAgentConfigRef.current = agentConfig;
    if (typeof window !== 'undefined') {
      window.__currentSessionMessages = [];
    }
    console.log('[SessionHistory] Initialized session for agent config:', agentConfig);
  };

  // Function to end the current conversation and save to storage
  const endSession = () => {
    console.log('[SessionHistory] Ending session and saving to storage');
    saveSessionToStorage();
  };

  // Function to store a message in memory (not localStorage yet)
  const saveMessage = (role: 'user' | 'assistant', content: string) => {
    // Get agent config from URL as fallback if ref is null
    const agentConfig = currentAgentConfigRef.current || 
                       (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('agentConfig') : null) || 
                       'simpleHandoff';
    
    const messages = getCurrentSessionMessages();
    console.log('[SaveMessage] Storing in memory:', { role, content: content.substring(0, 50), agentConfig, currentMessages: messages.length });
    
    if (agentConfig && content.trim()) {
      if (typeof window !== 'undefined') {
        window.__currentSessionMessages.push({ role, content });
        console.log('[SaveMessage] Message stored! Total messages now:', window.__currentSessionMessages.length);
      }
    } else {
      console.log('[SaveMessage] Skipped - no agent config or empty content');
    }
  };

  /* ----------------------- helpers ------------------------- */

  const extractMessageText = (content: any[] = []): string => {
    if (!Array.isArray(content)) return "";

    return content
      .map((c) => {
        if (!c || typeof c !== "object") return "";
        if (c.type === "input_text") return c.text ?? "";
        if (c.type === "audio") return c.transcript ?? "";
        return "";
      })
      .filter(Boolean)
      .join("\n");
  };

  const extractFunctionCallByName = (name: string, content: any[] = []): any => {
    if (!Array.isArray(content)) return undefined;
    return content.find((c: any) => c.type === 'function_call' && c.name === name);
  };

  const maybeParseJson = (val: any) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        console.warn('Failed to parse JSON:', val);
        return val;
      }
    }
    return val;
  };

  const extractLastAssistantMessage = (history: any[] = []): any => {
    if (!Array.isArray(history)) return undefined;
    return history.reverse().find((c: any) => c.type === 'message' && c.role === 'assistant');
  };

  const extractModeration = (obj: any) => {
    if ('moderationCategory' in obj) return obj;
    if ('outputInfo' in obj) return extractModeration(obj.outputInfo);
    if ('output' in obj) return extractModeration(obj.output);
    if ('result' in obj) return extractModeration(obj.result);
  };

  // Temporary helper until the guardrail_tripped event includes the itemId in the next version of the SDK
  const sketchilyDetectGuardrailMessage = (text: string) => {
    return text.match(/Failure Details: (\{.*?\})/)?.[1];
  };

  /* ----------------------- event handlers ------------------------- */

  function handleAgentToolStart(details: any, _agent: any, functionCall: any) {
    const lastFunctionCall = extractFunctionCallByName(functionCall.name, details?.context?.history);
    const function_name = lastFunctionCall?.name;
    const function_args = lastFunctionCall?.arguments;

    addTranscriptBreadcrumb(
      `function call: ${function_name}`,
      function_args
    );    
  }
  function handleAgentToolEnd(details: any, _agent: any, _functionCall: any, result: any) {
    const lastFunctionCall = extractFunctionCallByName(_functionCall.name, details?.context?.history);
    addTranscriptBreadcrumb(
      `function call result: ${lastFunctionCall?.name}`,
      maybeParseJson(result)
    );
  }

  function handleHistoryAdded(item: any) {
    console.log("[handleHistoryAdded] Raw item received:", JSON.stringify(item, null, 2));
    if (!item || item.type !== 'message') return;

    const { itemId, role, content = [] } = item;
    console.log("[handleHistoryAdded] Processing:", { itemId, role, contentLength: content.length });
    
    if (itemId && role) {
      const isUser = role === "user";
      let text = extractMessageText(content);
      console.log("[handleHistoryAdded] Extracted text:", { isUser, text: text?.substring(0, 100) });

      if (isUser && !text) {
        text = "[Transcribing...]";
        console.log("[handleHistoryAdded] Set transcribing placeholder for user");
      }

      // If the guardrail has been tripped, this message is a message that gets sent to the 
      // assistant to correct it, so we add it as a breadcrumb instead of a message.
      const guardrailMessage = sketchilyDetectGuardrailMessage(text);
      if (guardrailMessage) {
        const failureDetails = JSON.parse(guardrailMessage);
        addTranscriptBreadcrumb('Output Guardrail Active', { details: failureDetails });
      } else {
        addTranscriptMessage(itemId, role, text);
        
        // Save to localStorage if it's a real message (not transcribing placeholder)
        if (text && text !== "[Transcribing...]") {
          console.log('[HandleHistoryAdded] ✅ About to save message:', { role, text: text.substring(0, 100) });
          saveMessage(role, text);
        } else {
          console.log('[HandleHistoryAdded] ❌ NOT saving message:', { role, text, reason: 'empty or transcribing' });
        }
      }
    }
  }

  function handleHistoryUpdated(items: any[]) {
    console.log("[handleHistoryUpdated] ", items);
    items.forEach((item: any) => {
      if (!item || item.type !== 'message') return;

      const { itemId, role, content = [] } = item;
      const text = extractMessageText(content);

      if (text) {
        updateTranscriptMessage(itemId, text, false);
        
        // Save assistant messages that come through handleHistoryUpdated
        if (role === 'assistant' && text && text !== "[Transcribing...]") {
          console.log('[HandleHistoryUpdated] Saving ASSISTANT message:', { role, text: text.substring(0, 100) });
          saveMessage(role, text);
        }
        // Don't save user messages here - they come through handleHistoryAdded
      }
    });
  }

  function handleTranscriptionDelta(item: any) {
    const itemId = item.item_id;
    const deltaText = item.delta || "";
    if (itemId) {
      updateTranscriptMessage(itemId, deltaText, true);
    }
  }

  function handleTranscriptionCompleted(item: any) {
    console.log('[HandleTranscriptionCompleted] Raw event received:', JSON.stringify(item, null, 2));
    
    // History updates don't reliably end in a completed item, 
    // so we need to handle finishing up when the transcription is completed.
    const itemId = item.item_id;
    const finalTranscript =
        !item.transcript || item.transcript === "\n"
        ? "[inaudible]"
        : item.transcript;
    
    console.log('[HandleTranscriptionCompleted] Processed:', { itemId, finalTranscript });
    
    if (itemId) {
      updateTranscriptMessage(itemId, finalTranscript, false);
      // Use the ref to get the latest transcriptItems
      const transcriptItem = transcriptItems.find((i) => i.itemId === itemId);
      console.log('[HandleTranscriptionCompleted] Found transcript item:', { 
        itemId, 
        transcriptItem: transcriptItem ? { role: transcriptItem.role, title: transcriptItem.title?.substring(0, 50) } : null 
      });
      
      updateTranscriptItem(itemId, { status: 'DONE' });

      // IMPORTANT: Save the final user transcript to conversation history!
      // For voice input transcriptions, we can determine it's a user message by the event type
      const isUserVoiceTranscription = item.type === "conversation.item.input_audio_transcription.completed";
      
      if (isUserVoiceTranscription && finalTranscript && finalTranscript !== '[inaudible]') {
        console.log('[HandleTranscriptionCompleted] ✅ Saving final USER voice transcript:', { finalTranscript: finalTranscript.substring(0, 100) });
        saveMessage('user', finalTranscript);
      } else if (transcriptItem && transcriptItem.role === 'user' && finalTranscript && finalTranscript !== '[inaudible]') {
        console.log('[HandleTranscriptionCompleted] ✅ Saving final USER transcript (fallback):', { finalTranscript: finalTranscript.substring(0, 100) });
        saveMessage('user', finalTranscript);
      } else {
        console.log('[HandleTranscriptionCompleted] ❌ NOT saving transcript:', { 
          hasTranscriptItem: !!transcriptItem,
          role: transcriptItem?.role,
          hasFinalTranscript: !!finalTranscript,
          isInaudible: finalTranscript === '[inaudible]',
          finalTranscript: finalTranscript,
          transcriptItem: transcriptItem,
          isUserVoiceTranscription: isUserVoiceTranscription,
          eventType: item.type
        });
      }

      // If guardrailResult still pending, mark PASS.
      if (transcriptItem?.guardrailResult?.status === 'IN_PROGRESS') {
        updateTranscriptItem(itemId, {
          guardrailResult: {
            status: 'DONE',
            category: 'NONE',
            rationale: '',
          },
        });
      }
    }
  }

  function handleGuardrailTripped(details: any, _agent: any, guardrail: any) {
    console.log("[guardrail tripped]", details, _agent, guardrail);
    const moderation = extractModeration(guardrail.result.output.outputInfo);
    logServerEvent({ type: 'guardrail_tripped', payload: moderation });

    // find the last assistant message in details.context.history
    const lastAssistant = extractLastAssistantMessage(details?.context?.history);

    if (lastAssistant && moderation) {
      const category = moderation.moderationCategory ?? 'NONE';
      const rationale = moderation.moderationRationale ?? '';
      const offendingText: string | undefined = moderation?.testText;

      updateTranscriptItem(lastAssistant.itemId, {
        guardrailResult: {
          status: 'DONE',
          category,
          rationale,
          testText: offendingText,
        },
      });
    }
  }

  const handlersRef = useRef({
    handleAgentToolStart,
    handleAgentToolEnd,
    handleHistoryUpdated,
    handleHistoryAdded,
    handleTranscriptionDelta,
    handleTranscriptionCompleted,
    handleGuardrailTripped,
    initializeSession,
    endSession,
  });

  // Update the handlers ref with current functions to capture latest state
  handlersRef.current = {
    handleAgentToolStart,
    handleAgentToolEnd,
    handleHistoryUpdated,
    handleHistoryAdded,
    handleTranscriptionDelta,
    handleTranscriptionCompleted,
    handleGuardrailTripped,
    initializeSession,
    endSession,
  };

  return handlersRef;
}