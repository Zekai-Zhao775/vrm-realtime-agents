import * as THREE from "three";
import { Model } from "./model";
import { loadVRMAnimation } from "../../lib/VRMAnimation/loadVRMAnimation";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { VRButton } from "three/examples/jsm/webxr/VRButton";

/**
 * three.jsを使った3Dビューワー
 *
 * setup()でcanvasを渡してから使う
 */
export class Viewer {
  public isReady: boolean;
  public model?: Model;

  private _renderer?: THREE.WebGLRenderer;
  private _clock: THREE.Clock;
  private _scene: THREE.Scene;
  private _camera?: THREE.PerspectiveCamera;
  private _cameraControls?: OrbitControls;
  private _vrCameraGroup?: THREE.Group;

  constructor() {
    this.isReady = false;

    // scene
    const scene = new THREE.Scene();
    this._scene = scene;

    // light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(1.0, 1.0, 1.0).normalize();
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // animate
    this._clock = new THREE.Clock();
    this._clock.start();
  }

  public loadVrm(url: string) {
    if (this.model?.vrm) {
      this.unloadVRM();
    }

    // gltf and vrm
    this.model = new Model(this._camera || new THREE.Object3D());
    this.model.loadVRM(url).then(async () => {
      if (!this.model?.vrm) return;

      // Disable frustum culling
      this.model.vrm.scene.traverse((obj) => {
        obj.frustumCulled = false;
      });

      this._scene.add(this.model.vrm.scene);

      const vrma = await loadVRMAnimation("/idle_loop.vrma");
      if (vrma) this.model.loadAnimation(vrma);

      // HACK: アニメーションの原点がずれているので再生後にカメラ位置を調整する
      requestAnimationFrame(() => {
        this.resetCamera();
      });
    });
  }

  public unloadVRM(): void {
    if (this.model?.vrm) {
      this._scene.remove(this.model.vrm.scene);
      this.model?.unLoadVrm();
    }
  }

  /**
   * Reactで管理しているCanvasを後から設定する
   */
  public setup(canvas: HTMLCanvasElement) {
    const parentElement = canvas.parentElement;
    const width = parentElement?.clientWidth || canvas.width;
    const height = parentElement?.clientHeight || canvas.height;
    // renderer
    this._renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
    });
    this._renderer.outputEncoding = THREE.sRGBEncoding;
    this._renderer.setSize(width, height);
    this._renderer.setPixelRatio(window.devicePixelRatio);
    
    // Enable WebXR
    this._renderer.xr.enabled = true;

    // camera
    this._camera = new THREE.PerspectiveCamera(20.0, width / height, 0.1, 20.0);
    this._camera.position.set(0, 1.3, 1.5);
    
    // Create VR camera group for movement handling
    this._vrCameraGroup = new THREE.Group();
    this._vrCameraGroup.add(this._camera);
    this._scene.add(this._vrCameraGroup);
    
    this._cameraControls?.target.set(0, 1.3, 0);
    this._cameraControls?.update();
    // camera controls
    this._cameraControls = new OrbitControls(
      this._camera,
      this._renderer.domElement
    );
    this._cameraControls.screenSpacePanning = true;
    this._cameraControls.update();
    
    // Add VR Button to the DOM
    const vrButton = VRButton.createButton(this._renderer);
    vrButton.style.cssText = ''; // Clear default styles so our CSS takes over
    const vrButtonContainer = document.getElementById('VRButton');
    if (vrButtonContainer) {
      vrButtonContainer.appendChild(vrButton);
    }

    window.addEventListener("resize", () => {
      this.resize();
    });
    this.isReady = true;
    
    // Use WebXR-compatible animation loop
    this._renderer.setAnimationLoop(this.update);
  }

  /**
   * canvasの親要素を参照してサイズを変更する
   */
  public resize() {
    if (!this._renderer) return;

    const parentElement = this._renderer.domElement.parentElement;
    if (!parentElement) return;

    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.setSize(
      parentElement.clientWidth,
      parentElement.clientHeight
    );

    if (!this._camera) return;
    this._camera.aspect =
      parentElement.clientWidth / parentElement.clientHeight;
    this._camera.updateProjectionMatrix();
  }

  /**
   * VRMのheadノードを参照してカメラ位置を調整する
   */
  public resetCamera() {
    const headNode = this.model?.vrm?.humanoid.getNormalizedBoneNode("head");

    if (headNode) {
      const headWPos = headNode.getWorldPosition(new THREE.Vector3());
      this._camera?.position.set(
        this._camera.position.x,
        headWPos.y,
        this._camera.position.z
      );
      this._cameraControls?.target.set(headWPos.x, headWPos.y, headWPos.z);
      this._cameraControls?.update();
    }
  }

  /**
   * Position avatar appropriately for VR viewing
   */
  public setupVRAvatar() {
    if (this.model?.vrm && this._renderer?.xr.isPresenting) {
      // Position avatar at comfortable VR distance (2 meters in front)
      // The avatar stays at world origin, but the VR camera group moves around it
      this.model.vrm.scene.position.set(0, 0, -2);
      
      // Scale avatar slightly larger for VR comfort
      this.model.vrm.scene.scale.setScalar(1.1);
      
      console.log("VR avatar positioning applied");
    }
  }

  /**
   * Enable 1-to-1 real-world movement translation in VR
   * The VR camera group handles room-scale movement automatically via WebXR
   */
  public enableVRMovement() {
    if (this._renderer?.xr.isPresenting && this._vrCameraGroup) {
      // WebXR automatically handles head tracking and 6DOF movement
      // The _vrCameraGroup contains the camera and moves with the user's real-world movement
      
      // We could add additional movement constraints or enhancements here
      // For example, preventing users from walking through the avatar:
      const userPosition = new THREE.Vector3();
      this._vrCameraGroup.getWorldPosition(userPosition);
      
      // Optional: Add boundary checking or avatar repositioning based on user movement
      // This ensures the avatar stays at a comfortable viewing distance
      if (this.model?.vrm) {
        const avatarPosition = this.model.vrm.scene.position;
        const distance = userPosition.distanceTo(avatarPosition);
        
        // If user gets too close or too far, maintain optimal viewing distance
        if (distance < 1.0) {
          // User too close - move avatar slightly back
          const direction = new THREE.Vector3().subVectors(avatarPosition, userPosition).normalize();
          this.model.vrm.scene.position.copy(userPosition).add(direction.multiplyScalar(1.5));
        } else if (distance > 4.0) {
          // User too far - move avatar slightly closer
          const direction = new THREE.Vector3().subVectors(userPosition, avatarPosition).normalize();
          this.model.vrm.scene.position.copy(userPosition).add(direction.multiplyScalar(-2.5));
        }
      }
    }
  }

  /**
   * Update avatar to continuously face the user in VR
   */
  public updateVRLookAt() {
    if (this.model?.vrm && this._renderer?.xr.isPresenting && this._camera) {
      // Get the current VR camera position
      const cameraPosition = new THREE.Vector3();
      this._camera.getWorldPosition(cameraPosition);
      
      // Update the look-at target to follow VR headset
      if (this.model.emoteController) {
        // The AutoLookAt system should automatically track the camera
        // But we can enhance it for VR if needed
        const lookAtTarget = this.model.emoteController.getLookAtTarget?.() || cameraPosition;
        
        // Make sure the avatar is always facing the user
        if (this.model.vrm && this.model.vrm.lookAt && this.model.vrm.lookAt.target) {
          this.model.vrm.lookAt.target.position.copy(cameraPosition);
        }
      }
    }
  }

  public update = () => {
    const delta = this._clock.getDelta();
    
    // Setup VR avatar positioning when entering VR
    if (this._renderer?.xr.isPresenting) {
      this.setupVRAvatar();
      this.enableVRMovement();
      this.updateVRLookAt();
    }
    
    // update vrm components
    if (this.model) {
      this.model.update(delta);
    }

    if (this._renderer && this._camera) {
      this._renderer.render(this._scene, this._camera);
    }
  };
}
