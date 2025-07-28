import { LipSyncAnalyzeResult } from "./lipSyncAnalyzeResult";

const TIME_DOMAIN_DATA_LENGTH = 2048;

export class LipSync {
  public readonly audio: AudioContext;
  public readonly analyser: AnalyserNode;
  public readonly timeDomainData: Float32Array;

  public constructor(audio: AudioContext) {
    this.audio = audio;

    this.analyser = audio.createAnalyser();
    this.timeDomainData = new Float32Array(TIME_DOMAIN_DATA_LENGTH);
  }

  public update(): LipSyncAnalyzeResult {
    this.analyser.getFloatTimeDomainData(this.timeDomainData);

    let volume = 0.0;
    for (let i = 0; i < TIME_DOMAIN_DATA_LENGTH; i++) {
      volume = Math.max(volume, Math.abs(this.timeDomainData[i]));
    }

    // cook
    volume = 1 / (1 + Math.exp(-45 * volume + 5));
    if (volume < 0.1) volume = 0;

    return {
      volume,
    };
  }

  public async playFromArrayBuffer(buffer: ArrayBuffer, onEnded?: () => void) {
    const audioBuffer = await this.audio.decodeAudioData(buffer);

    const bufferSource = this.audio.createBufferSource();
    bufferSource.buffer = audioBuffer;

    bufferSource.connect(this.audio.destination);
    bufferSource.connect(this.analyser);
    bufferSource.start();
    if (onEnded) {
      bufferSource.addEventListener("ended", onEnded);
    }
  }

  public async playFromURL(url: string, onEnded?: () => void) {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    this.playFromArrayBuffer(buffer, onEnded);
  }

  public async connectToMediaStream(stream: MediaStream) {
    console.log("LipSync: Connecting to MediaStream", stream);
    console.log("LipSync: Stream tracks:", stream.getTracks());
    console.log("LipSync: Audio context state:", this.audio.state);
    
    // Resume AudioContext if it's suspended (required for autoplay policies)
    if (this.audio.state === 'suspended') {
      console.log("LipSync: Resuming suspended AudioContext");
      try {
        await this.audio.resume();
        console.log("LipSync: AudioContext resumed, new state:", this.audio.state);
      } catch (error) {
        console.error("LipSync: Failed to resume AudioContext:", error);
      }
    }
    
    try {
      const source = this.audio.createMediaStreamSource(stream);
      source.connect(this.analyser);
      console.log("✅ LipSync: Successfully connected MediaStreamSource to analyser");
      
      // Test if we're getting data
      setTimeout(() => {
        this.analyser.getFloatTimeDomainData(this.timeDomainData);
        let testVolume = 0.0;
        for (let i = 0; i < 100; i++) { // Check first 100 samples
          testVolume = Math.max(testVolume, Math.abs(this.timeDomainData[i]));
        }
        console.log("LipSync: Test volume reading:", testVolume);
      }, 500);
      
    } catch (error) {
      console.error("❌ LipSync: Failed to connect MediaStreamSource:", error);
    }
  }

  public disconnectFromMediaStream() {
    console.log("LipSync: Disconnecting from MediaStream");
    // Disconnect all sources from the analyser
    this.analyser.disconnect();
  }
}
