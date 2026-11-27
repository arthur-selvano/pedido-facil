const SOUND_STORAGE_KEY = "pf_pdv_sound_enabled";

export function loadSoundPreference() {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(SOUND_STORAGE_KEY);
    if (raw === null) return true;
    return raw === "true";
  } catch {
    return true;
  }
}

export function saveSoundPreference(enabled) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, String(Boolean(enabled)));
  } catch {
    // Ignora erro de armazenamento
  }
}

/**
 * Toca um aviso sonoro curto em dois tons (estilo campainha de balcão)
 * usando Web Audio API, sem depender de arquivos externos de áudio.
 */
export function playNewOrderChime() {
  if (typeof window === "undefined") return;

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const notes = [
      { freq: 880, start: 0, duration: 0.16 },
      { freq: 1174.66, start: 0.18, duration: 0.28 },
    ];

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(note.freq, now + note.start);

      gain.gain.setValueAtTime(0.001, now + note.start);
      gain.gain.exponentialRampToValueAtTime(0.22, now + note.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + note.start + note.duration,
      );

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + note.start);
      osc.stop(now + note.start + note.duration + 0.02);
    }

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 800);
  } catch {
    // Alguns navegadores bloqueiam som antes de uma interação do usuário
  }
}
