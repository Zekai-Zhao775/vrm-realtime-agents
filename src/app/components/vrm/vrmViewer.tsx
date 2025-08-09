import { useContext, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ViewerContext } from "../../features/vrmViewer/viewerContext";
import { VRMManager } from "../../lib/vrmManager";
import "../../lib/vrmUtils"; // Load development utilities

export default function VrmViewer() {
  const { viewer } = useContext(ViewerContext);
  const searchParams = useSearchParams();
  const vrmManager = VRMManager.getInstance();
  const isViewerReady = useRef(false);
  
  // Get current scenario from URL params
  const currentScenario = searchParams.get("agentConfig") || "simpleHandoff";
  
  // Get VRM URL for current scenario
  const getScenarioVRMUrl = () => {
    return vrmManager.getVRMUrl(currentScenario);
  };

  // Function to load VRM for current scenario
  const loadScenarioVRM = useCallback(async () => {
    if (!isViewerReady.current) return;
    
    const vrmUrl = getScenarioVRMUrl();
    console.log(`🎭 Loading VRM for scenario "${currentScenario}":`, vrmUrl);
    
    try {
      // First validate if the VRM exists
      const isValid = await vrmManager.validateVRMUrl(vrmUrl);
      if (!isValid) {
        console.warn(`VRM file not found: ${vrmUrl}, using fallback`);
        // Try to load a fallback VRM
        await viewer.loadVrm('/assets/vrm/default.vrm');
      } else {
        await viewer.loadVrm(vrmUrl);
      }
      
      const vrmInfo = vrmManager.getVRMInfo(currentScenario);
      console.log(`✅ VRM loaded successfully for ${currentScenario}:`, vrmInfo);
      
    } catch (error) {
      console.error(`❌ Failed to load VRM for scenario "${currentScenario}":`, error);
      // Try fallback
      try {
        console.log('Trying fallback VRM...');
        await viewer.loadVrm('/assets/vrm/default.vrm');
      } catch (fallbackError) {
        console.error('❌ Fallback VRM also failed:', fallbackError);
      }
    }
  }, [currentScenario, viewer, vrmManager]);

  // Don't automatically load VRM - wait for connection
  // VRM will be loaded when user clicks connect

  const canvasRef = useCallback(
    (canvas: HTMLCanvasElement) => {
      if (canvas) {
        viewer.setup(canvas);
        isViewerReady.current = true;
        
        // Don't load VRM automatically - wait for user to connect

        // Drag and DropでVRMを差し替え
        canvas.addEventListener("dragover", function (event) {
          event.preventDefault();
        });

        canvas.addEventListener("drop", function (event) {
          event.preventDefault();

          const files = event.dataTransfer?.files;
          if (!files) {
            return;
          }

          const file = files[0];
          if (!file) {
            return;
          }

          const file_type = file.name.split(".").pop();
          if (file_type === "vrm") {
            const blob = new Blob([file], { type: "application/octet-stream" });
            const url = window.URL.createObjectURL(blob);
            
            // Load the VRM and save as custom for current scenario
            viewer.loadVrm(url).then(() => {
              vrmManager.setCustomVRM(currentScenario, url);
              console.log(`✅ Custom VRM set for scenario "${currentScenario}"`);
            }).catch(error => {
              console.error('Failed to load dropped VRM:', error);
            });
          }
        });
      }
    },
    [viewer, loadScenarioVRM]
  );

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%', 
      height: '100%'
    }}>
      <canvas 
        ref={canvasRef} 
        style={{
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  );
}
