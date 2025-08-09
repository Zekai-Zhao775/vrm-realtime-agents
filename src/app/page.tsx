import React, { Suspense } from "react";
import { TranscriptProvider } from "@/app/contexts/TranscriptContext";
import { EventProvider } from "@/app/contexts/EventContext";
import { ViewerContextProvider } from "@/app/features/vrmViewer/viewerContext";
import VrmChatApp from "./vrm-chat/VrmChatApp";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ViewerContextProvider>
        <TranscriptProvider>
          <EventProvider>
            <VrmChatApp />
          </EventProvider>
        </TranscriptProvider>
      </ViewerContextProvider>
    </Suspense>
  );
}
