export interface LipSyncAnalyzeResult {
  volume: number;
  lowFreq?: number;   // Low frequencies (o, u sounds)
  midFreq?: number;   // Mid frequencies (a, e sounds)  
  highFreq?: number;  // High frequencies (i, consonants)
}
