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
  private _environment?: THREE.Object3D;
  private _currentEnvironmentType: string = 'gradient';

  constructor() {
    this.isReady = false;

    // scene
    const scene = new THREE.Scene();
    this._scene = scene;

    // Initialize with default environment
    this.setupDefaultEnvironment();

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

  public async loadVrm(url: string) {
    if (this.model?.vrm) {
      this.unloadVRM();
    }

    // gltf and vrm
    this.model = new Model(this._camera || new THREE.Object3D());
    
    try {
      await this.model.loadVRM(url);
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
      
    } catch (error) {
      console.error('❌ Failed to load VRM in viewer:', error);
      // Optionally show user-friendly error message
    }
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

  /**
   * Setup default environment (gradient skybox with subtle room)
   */
  private setupDefaultEnvironment() {
    this.setEnvironment('gradient');
  }

  /**
   * Set the environment type - easily replaceable for future development
   * @param type - Environment type: 'gradient', 'room', 'studio', 'outdoor', 'space'
   */
  public setEnvironment(type: string) {
    // Remove existing environment
    if (this._environment) {
      this._scene.remove(this._environment);
      this._environment = undefined;
    }

    this._currentEnvironmentType = type;

    switch (type) {
      case 'gradient':
        this._environment = this.createGradientEnvironment();
        break;
      case 'room':
        this._environment = this.createRoomEnvironment();
        break;
      case 'studio':
        this._environment = this.createStudioEnvironment();
        break;
      case 'outdoor':
        this._environment = this.createOutdoorEnvironment();
        break;
      case 'space':
        this._environment = this.createSpaceEnvironment();
        break;
      default:
        this._environment = this.createGradientEnvironment();
    }

    if (this._environment) {
      this._scene.add(this._environment);
    }
  }

  /**
   * Get current environment type
   */
  public getCurrentEnvironment(): string {
    return this._currentEnvironmentType;
  }

  /**
   * Create gradient skybox environment
   */
  private createGradientEnvironment(): THREE.Object3D {
    const environment = new THREE.Group();

    // Create gradient skybox
    const skyGeometry = new THREE.SphereGeometry(50, 32, 16);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x4a90e2) },    // Nice blue
        bottomColor: { value: new THREE.Color(0x87ceeb) }, // Sky blue
        offset: { value: 33 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    });

    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    environment.add(sky);

    // Add subtle ground plane
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xf0f0f0,
      transparent: true,
      opacity: 0.3
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    environment.add(ground);

    return environment;
  }

  /**
   * Create room environment
   */
  private createRoomEnvironment(): THREE.Object3D {
    const environment = new THREE.Group();

    // Room walls
    const roomSize = 10;
    const wallHeight = 4;
    const wallMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xe8e8e8,
      transparent: true,
      opacity: 0.8
    });

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(roomSize, roomSize);
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0xd0d0d0 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1;
    environment.add(floor);

    // Back wall
    const backWallGeometry = new THREE.PlaneGeometry(roomSize, wallHeight);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, wallHeight / 2 - 1, -roomSize / 2);
    environment.add(backWall);

    // Side walls
    const sideWallGeometry = new THREE.PlaneGeometry(roomSize, wallHeight);
    const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-roomSize / 2, wallHeight / 2 - 1, 0);
    environment.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(roomSize / 2, wallHeight / 2 - 1, 0);
    environment.add(rightWall);

    return environment;
  }

  /**
   * Create studio environment
   */
  private createStudioEnvironment(): THREE.Object3D {
    const environment = new THREE.Group();

    // Curved backdrop
    const backdropGeometry = new THREE.CylinderGeometry(8, 8, 6, 32, 1, true, 0, Math.PI);
    const backdropMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const backdrop = new THREE.Mesh(backdropGeometry, backdropMaterial);
    backdrop.position.set(0, 2, 0);
    backdrop.rotation.y = Math.PI;
    environment.add(backdrop);

    // Studio floor
    const floorGeometry = new THREE.CircleGeometry(8, 32);
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1;
    environment.add(floor);

    return environment;
  }

  /**
   * Create outdoor environment
   */
  private createOutdoorEnvironment(): THREE.Object3D {
    const environment = new THREE.Group();

    // Sky dome
    const skyGeometry = new THREE.SphereGeometry(50, 32, 16);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x87ceeb) },    // Sky blue
        bottomColor: { value: new THREE.Color(0x98fb98) }, // Pale green
        offset: { value: 33 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    });

    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    environment.add(sky);

    // Grass ground
    const groundGeometry = new THREE.PlaneGeometry(30, 30);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90ee90 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    environment.add(ground);

    return environment;
  }

  /**
   * Create space environment
   */
  private createSpaceEnvironment(): THREE.Object3D {
    const environment = new THREE.Group();

    // Starfield
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1000;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 100;     // x
      positions[i + 1] = (Math.random() - 0.5) * 100; // y  
      positions[i + 2] = (Math.random() - 0.5) * 100; // z
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMaterial = new THREE.PointsMaterial({ 
      color: 0xffffff,
      size: 0.1
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    environment.add(stars);

    // Subtle platform
    const platformGeometry = new THREE.CircleGeometry(3, 16);
    const platformMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x333333,
      transparent: true,
      opacity: 0.5
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.rotation.x = -Math.PI / 2;
    platform.position.y = -1;
    environment.add(platform);

    return environment;
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
