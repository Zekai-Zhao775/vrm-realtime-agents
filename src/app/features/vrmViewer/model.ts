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
    console.log("🔍 VRM loaded! Analyzing expressions...");
    console.log("Expression manager:", vrm.expressionManager);
    
    if (vrm.expressionManager) {
      const expressions = vrm.expressionManager.expressions || {};
      console.log("📝 All available expression keys:", Object.keys(expressions));
      
      // Test common VRM 1.0 Perfect Sync expressions
      const vrm1Expressions = ["JawOpen", "JawForward", "JawLeft", "JawRight", 
                               "MouthApe", "MouthO", "MouthU", "MouthA", "MouthI", "MouthE",
                               "MouthFunnel", "MouthPucker", "MouthSmile", "MouthSad",
                               "MouthStretch", "MouthDimple", "MouthTightener", "MouthPressLeft", "MouthPressRight"];
      
      console.log("🎭 VRM 1.0 expressions available:");
      vrm1Expressions.forEach(expr => {
        const available = vrm.expressionManager!.getExpression(expr);
        if (available) {
          console.log(`  ✅ ${expr}:`, available);
        } else {
          console.log(`  ❌ ${expr}: not found`);
        }
      });
      
      // Test common VRM 0.x expressions  
      const vrm0Expressions = ["aa", "ii", "uu", "ee", "oo", "blink", "joy", "angry", "sorrow", "fun"];
      
      console.log("🎌 VRM 0.x expressions available:");
      vrm0Expressions.forEach(expr => {
        const available = vrm.expressionManager!.getExpression(expr);
        if (available) {
          console.log(`  ✅ ${expr}:`, available);
        } else {
          console.log(`  ❌ ${expr}: not found`);
        }
      });
      
      // Show raw expression data
      console.log("📊 Raw expressions object:", expressions);
    } else {
      console.error("❌ No expression manager found!");
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
      const { volume, lowFreq, midFreq, highFreq } = this._lipSync.update();

      // Apply advanced multi-expression lip sync
      if (volume > 0.01) {
        this.applyAdvancedLipSync(volume, lowFreq || 0, midFreq || 0, highFreq || 0);
      } else {
        // Close mouth when silent
        this.closeMouth();
      }
    }

    this.emoteController?.update(delta);
    this.mixer?.update(delta);
    this.vrm?.update(delta);
  }

  private applyAdvancedLipSync(volume: number, lowFreq: number, midFreq: number, highFreq: number): void {
    if (!this.vrm?.expressionManager || !this.emoteController) return;

    // Clear previous expressions
    this.clearLipSyncExpressions();

    // Map frequencies to different mouth shapes
    const expressions = this.vrm.expressionManager;
    
    // Try VRM 1.0 expressions first (Perfect Sync)
    const jawOpen = expressions.getExpression("JawOpen");
    const mouthFunnel = expressions.getExpression("MouthFunnel");  
    const mouthPucker = expressions.getExpression("MouthPucker");
    const mouthSmile = expressions.getExpression("MouthSmile");
    
    if (jawOpen) {
      // VRM 1.0 Perfect Sync expressions
      console.log("🎭 Using VRM 1.0 expressions - Volume:", volume.toFixed(3), "Low:", lowFreq.toFixed(3), "Mid:", midFreq.toFixed(3), "High:", highFreq.toFixed(3));
      
      // Primary jaw movement based on overall volume
      this.emoteController.lipSync("JawOpen", volume * 0.7);
      
      // Add variation based on frequency content
      if (mouthFunnel && lowFreq > 0.1) {
        // Low frequencies = rounded mouth shapes (o, u)
        this.emoteController.lipSync("MouthFunnel", lowFreq * volume * 0.5);
      }
      
      if (mouthPucker && midFreq > 0.1) {
        // Mid frequencies = pucker shapes  
        this.emoteController.lipSync("MouthPucker", midFreq * volume * 0.3);
      }
      
    } else {
      // Advanced natural lip sync for VRM 0.x - Multiple expressions based on speech characteristics
      console.log("🎭 Natural Lip Sync - Volume:", volume.toFixed(3), "Low:", lowFreq.toFixed(3), "Mid:", midFreq.toFixed(3), "High:", highFreq.toFixed(3));
      
      // Get available expressions
      const aaExpression = expressions.getExpression("aa");      // Wide open mouth 
      const eeExpression = expressions.getExpression("ee");      // Narrow/closed mouth
      const iiExpression = expressions.getExpression("ii"); 
      const uuExpression = expressions.getExpression("uu");
      const ooExpression = expressions.getExpression("oo");
      
      if (aaExpression && eeExpression) {
        // Advanced natural lip sync with two expressions
        this.applyNaturalLipSyncTwoExpressions(volume, lowFreq, midFreq, highFreq);
      } else if (aaExpression) {
        // Single expression fallback with variation
        this.applySingleExpressionVariation("aa", volume, lowFreq, midFreq, highFreq);
      } else if (eeExpression) {
        // Single expression fallback with variation
        this.applySingleExpressionVariation("ee", volume, lowFreq, midFreq, highFreq);
      }
    }
  }

  private applyNaturalLipSyncTwoExpressions(volume: number, lowFreq: number, midFreq: number, highFreq: number): void {
    // Create natural speech patterns using aa (wide) and ee (narrow)
    
    // Calculate speech characteristics
    const totalFreq = lowFreq + midFreq + highFreq;
    const isVowelSound = totalFreq > 0.15; // Strong frequency content = vowel
    const isConsonant = highFreq > 0.2 && totalFreq < 0.3; // High freq, low total = consonant
    
    // Time-based variation for natural movement
    const time = Date.now() / 1000;
    const naturalVariation = Math.sin(time * 8) * 0.1; // Subtle oscillation
    
    if (isConsonant) {
      // Consonants: Quick narrow mouth movement
      const eeWeight = Math.min(volume * 0.9 + naturalVariation, 1.0);
      this.emoteController?.lipSync("ee", eeWeight);
      console.log("  → Consonant: 'ee' =", eeWeight.toFixed(3));
      
    } else if (lowFreq > midFreq && lowFreq > highFreq) {
      // Low frequency dominant: Open mouth sounds (a, o, ah)
      const aaWeight = Math.min(volume * 0.8 + naturalVariation, 1.0);
      this.emoteController?.lipSync("aa", aaWeight);
      console.log("  → Low freq vowel: 'aa' =", aaWeight.toFixed(3));
      
    } else if (highFreq > 0.15) {
      // High frequency: Narrow mouth sounds (e, i)
      const eeWeight = Math.min(volume * 0.7 + naturalVariation, 1.0);
      this.emoteController?.lipSync("ee", eeWeight);
      console.log("  → High freq vowel: 'ee' =", eeWeight.toFixed(3));
      
    } else if (midFreq > 0.1) {
      // Mid frequency: Blend between shapes
      const blendRatio = midFreq / (midFreq + lowFreq + 0.001);
      const aaWeight = Math.min(volume * (1 - blendRatio) * 0.8 + naturalVariation, 1.0);
      const eeWeight = Math.min(volume * blendRatio * 0.6 + naturalVariation, 1.0);
      
      if (aaWeight > eeWeight) {
        this.emoteController?.lipSync("aa", aaWeight);
        console.log("  → Mid freq blend: 'aa' =", aaWeight.toFixed(3));
      } else {
        this.emoteController?.lipSync("ee", eeWeight);
        console.log("  → Mid freq blend: 'ee' =", eeWeight.toFixed(3));
      }
      
    } else {
      // Default: Alternate based on volume intensity
      const useNarrow = (Math.floor(time * 4) % 2 === 0) && volume > 0.5;
      if (useNarrow) {
        this.emoteController?.lipSync("ee", volume * 0.6 + naturalVariation);
        console.log("  → Default alternate: 'ee'");
      } else {
        this.emoteController?.lipSync("aa", volume * 0.8 + naturalVariation);
        console.log("  → Default alternate: 'aa'");
      }
    }
  }

  private applySingleExpressionVariation(expression: string, volume: number, lowFreq: number, midFreq: number, highFreq: number): void {
    // Add natural variation even with single expression
    const time = Date.now() / 1000;
    const naturalVariation = Math.sin(time * 6) * 0.15; // More variation for single expression
    
    // Frequency-based intensity modulation
    const totalFreq = lowFreq + midFreq + highFreq;
    const frequencyModulation = Math.min(totalFreq * 2, 1.0); // Boost based on frequency content
    
    const finalWeight = Math.min(volume * 0.8 * frequencyModulation + naturalVariation, 1.0);
    this.emoteController?.lipSync(expression, Math.max(finalWeight, 0));
    
    console.log(`  → Single '${expression}' with variation =`, finalWeight.toFixed(3));
  }

  private clearLipSyncExpressions(): void {
    if (!this.vrm?.expressionManager || !this.emoteController) return;
    
    // Clear common lip sync expressions
    const expressions = ["JawOpen", "MouthFunnel", "MouthPucker", "MouthSmile", "aa", "ee", "ii", "uu", "oo"];
    expressions.forEach(expr => {
      if (this.vrm?.expressionManager?.getExpression(expr)) {
        this.emoteController?.lipSync(expr, 0);
      }
    });
  }

  private closeMouth(): void {
    this.clearLipSyncExpressions();
  }
}
