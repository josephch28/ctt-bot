export function beep(): void {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const osc = ctx.createOscillator();
  const ganancia = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 880;
  ganancia.gain.value = 0.08;
  osc.connect(ganancia);
  ganancia.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}
