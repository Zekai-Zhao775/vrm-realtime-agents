import { useContext, useCallback } from "react";
import { ViewerContext } from "../../features/vrmViewer/viewerContext";

export default function VrmViewer() {
  const { viewer } = useContext(ViewerContext);

  console.log("VrmViewer rendering, viewer:", viewer);
  console.log("ViewerContext available:", !!viewer);
  console.log("Viewer methods:", viewer ? Object.keys(viewer) : 'no viewer');

  const AVATAR_SAMPLE_B_VRM_URL = 'https://ipfs.io/ipfs/bafybeihx4xjb5mphocdq2os63g43pgnpi46ynolpmhln3oycoasywdnl3u';

  const canvasRef = useCallback(
    (canvas: HTMLCanvasElement) => {
      console.log("Canvas ref callback called:", canvas);
      if (canvas) {
        console.log("Setting up viewer with canvas");
        viewer.setup(canvas);
        console.log("Loading VRM from:", AVATAR_SAMPLE_B_VRM_URL);
        viewer.loadVrm(AVATAR_SAMPLE_B_VRM_URL);

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
            viewer.loadVrm(url);
          }
        });
      }
    },
    [viewer]
  );

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%', 
      height: '100%',
      backgroundColor: 'rgba(255,0,0,0.1)', // Add red tint to see the canvas area
      border: '2px solid red' // Add border to see if canvas area exists
    }}>
      <canvas 
        ref={canvasRef} 
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,255,0,0.1)' // Add green tint to see the actual canvas
        }}
      />
      {/* Debug overlay */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '5px',
        fontSize: '12px',
        zIndex: 100
      }}>
        VRM Debug: {viewer ? 'Viewer OK' : 'No Viewer'} | Canvas: {canvasRef ? 'Ready' : 'Not Ready'}
      </div>
    </div>
  );
}
