import { useCallback, useEffect, useRef } from "react";

type Ctor = typeof AudioContext;

/**
 * Ruido de papel sintetizado em runtime — nenhum arquivo de audio.
 * Ruido branco curto passando por um band-pass que varre de grave para agudo,
 * com envelope de ataque rapido e cauda curta.
 */
export function usePageSound(muted: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      void ctxRef.current?.close();
    },
    [],
  );

  const ensure = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    const Ctx: Ctor | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;
    if (!Ctx) return null;

    const ctx = new Ctx();
    const seconds = 0.32;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      // ruido rosa-ish: branco com um leve arrasto do valor anterior
      const white = Math.random() * 2 - 1;
      data[i] = i === 0 ? white : (data[i - 1] * 0.35 + white * 0.65) * 0.9;
    }
    ctxRef.current = ctx;
    bufferRef.current = buffer;
    return ctx;
  }, []);

  const fire = useCallback(() => {
    const ctx = ensure();
    const buffer = bufferRef.current;
    if (!ctx || !buffer) return;
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = 0.85 + Math.random() * 0.3;

    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 0.8;
    band.frequency.setValueAtTime(720, now);
    band.frequency.exponentialRampToValueAtTime(2800, now + 0.22);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    src.connect(band).connect(gain).connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.34);
  }, [ensure]);

  return useCallback(
    (delayMs = 0) => {
      if (muted) return;
      if (delayMs <= 0) {
        fire();
        return;
      }
      const id = window.setTimeout(fire, delayMs);
      timers.current.push(id);
    },
    [muted, fire],
  );
}
