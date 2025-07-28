import * as THREE from "three";
import { VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRMAnimation } from "../../lib/VRMAnimation/VRMAnimation";
import { VRMLookAtSmootherLoaderPlugin } from "../../lib/VRMLookAtSmootherLoaderPlugin/VRMLookAtSmootherLoaderPlugin";
import { LipSync } from "../lipSync/lipSync";
import { EmoteController } from "../emoteController/emoteController";
import { Screenplay } from "../messages/messages";

/**
 * 3Dキャラクターを管理するクラス
 */
export class Model {
  public vrm?: VRM | null;
  public mixer?: THREE.AnimationMixer;
  public emoteController?: EmoteController;

  private _lookAtTargetParent: THREE.Object3D;
  private _lipSync?: LipSync;

  private prevPlayedEmotion: string | null = null;

  constructor(lookAtTargetParent: THREE.Object3D) {
    this._lookAtTargetParent = lookAtTargetParent;
    this._lipSync = new LipSync(new AudioContext());
  }

  public async loadVRM(url: string): Promise<void> {
    const loader = new GLTFLoader();
    loader.register(
      (parser) =>
        new VRMLoaderPlugin(parser, {
          lookAtPlugin: new VRMLookAtSmootherLoaderPlugin(parser),
        })
    );

    const gltf = await loader.loadAsync(url);

    const vrm = (this.vrm = gltf.userData.vrm);
    vrm.scene.name = "VRMRoot";


    VRMUtils.rotateVRM0(vrm);
    this.mixer = new THREE.AnimationMixer(vrm.scene);

    this.emoteController = new EmoteController(vrm, this._lookAtTargetParent);
    
    // Debug: Check available expressions for lip sync
    console.log("VRM loaded! Available expressions:", vrm.expressionManager);
    if (vrm.expressionManager) {
      console.log("Expression names:", Object.keys(vrm.expressionManager.expressions || {}));
      const jawOpen = vrm.expressionManager.getExpression("JawOpen");
      const aa = vrm.expressionManager.getExpression("aa");
      console.log("JawOpen expression:", jawOpen);
      console.log("aa expression:", aa);
    }
  }

  public unLoadVrm() {
    if (this.vrm) {
      VRMUtils.deepDispose(this.vrm.scene);
      this.vrm = null;
    }
  }

  /**
   * VRMアニメーションを読み込む
   *
   * https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm_animation-1.0/README.ja.md
   */
  public async loadAnimation(vrmAnimation: VRMAnimation): Promise<void> {
    const { vrm, mixer } = this;
    if (vrm == null || mixer == null) {
      throw new Error("You have to load VRM first");
    }

    const clip = vrmAnimation.createAnimationClip(vrm);
    const action = mixer.clipAction(clip);
    action.play();
  }

  /**
   * 音声を再生し、リップシンクを行う
   */
  public async speak(buffer: ArrayBuffer | null, screenplay: Screenplay) {
    // prevent flickering of avatar expression
    if (this.prevPlayedEmotion !== screenplay.expression) {
      this.emoteController?.playEmotion(screenplay.expression);
      this.prevPlayedEmotion = screenplay.expression;
    }

    if (!buffer) {
      return;
    }

    await new Promise((resolve) => {
      this._lipSync?.playFromArrayBuffer(buffer, () => {
        resolve(true);
      });
    });
  }

  public async connectToAudioStream(stream: MediaStream) {
    if (this._lipSync) {
      await this._lipSync.connectToMediaStream(stream);
    }
  }

  public disconnectFromAudioStream() {
    if (this._lipSync) {
      this._lipSync.disconnectFromMediaStream();
    }
  }

  public update(delta: number): void {
    if (this._lipSync) {
      const { volume } = this._lipSync.update();

      // Add debugging for volume detection
      if (volume > 0) {
        console.log("🎤 Detected audio volume:", volume);
      }

      // variable for expression controller
      let expression = this.vrm?.expressionManager?.getExpression("JawOpen");
      if (expression) {
        // handle Perfect Sync standard
        console.log("Using JawOpen expression, volume:", volume);
        // @ts-ignore
        this.emoteController?.lipSync("JawOpen", volume);
        // this.emoteController?.lipSync("MouthStretch", 0.4 * volume);
      } else {
        if (volume > 0) {
          console.log("Using 'aa' expression, volume:", volume);
        }
        this.emoteController?.lipSync("aa", volume);
      }
    }

    this.emoteController?.update(delta);
    this.mixer?.update(delta);
    this.vrm?.update(delta);
  }
}
