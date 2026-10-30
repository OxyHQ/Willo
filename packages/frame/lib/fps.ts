/** How long a measurement counts frames for. */
const SAMPLE_MS = 1000;

/**
 * Frames the screen drew over the last second, counted with
 * `requestAnimationFrame` (on both platforms). It is the number that told us,
 * on the studio's Chromecast, that blurred cards cost half the frame rate; the
 * frame reports it with each heartbeat so the app can show it.
 */
export function measureFps(): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0;
    let start: number | null = null;
    const step = (now: number) => {
      if (start === null) start = now;
      const elapsed = now - start;
      if (elapsed >= SAMPLE_MS) {
        resolve(Math.round((frames * 1000) / elapsed));
        return;
      }
      frames += 1;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
