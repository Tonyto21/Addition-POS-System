// Audio synthesis for supermarket barcode scanner feedback (Web Audio API)
// Works 100% offline with zero external audio assets required

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Supermarket Barcode Scanner Beep
 * Replicates the iconic retail scanner tone (e.g. Datalogic, Honeywell, Symbol/Zebra)
 * High-pitched crisp 2650Hz tone with subtle piezo overtone and rapid envelope
 */
export function playBeep(type: 'success' | 'unknown' | 'error' = 'success') {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (type === 'success') {
      // Authentic Supermarket Cash Register Barcode Beep
      // Primary piezo resonant tone at 2650 Hz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Subtle second harmonic for true hardware scanner timbre
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2650, now);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(5300, now);

      // Instant attack (<1ms), sustained for 65ms, then rapid decay over 15ms (total ~80ms)
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.setValueAtTime(0.4, now + 0.065);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      gain2.gain.setValueAtTime(0.08, now);
      gain2.gain.setValueAtTime(0.08, now + 0.065);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc.start(now);
      osc2.start(now);

      osc.stop(now + 0.085);
      osc2.stop(now + 0.085);

      // Trigger haptic vibration on mobile phone/handheld scanner terminal
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(45);
      }
    } else if (type === 'unknown') {
      // Lower warning tone for uncataloged barcode (480Hz warning beep)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(550, now);
      osc.frequency.linearRampToValueAtTime(420, now + 0.14);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.14);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([60, 40, 60]);
      }
    } else {
      // Error buzzer
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    }
  } catch (err) {
    console.warn('Audio playback error:', err);
  }
}

// Convenient alias for explicit supermarket beep
export const playSupermarketBeep = () => playBeep('success');

