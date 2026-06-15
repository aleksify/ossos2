// A tiny bowed-cello synth built straight on the Web Audio API, so level 14's
// music is generated in real time and locked to the beat platforms instead of a
// pre-baked track. Two detuned saws + a sine sub through a low-pass, with a bow
// swell and fade-in vibrato, approximate a cello closely enough for a game.
export class Cello {
    private ctx: AudioContext;
    private master: GainNode;

    constructor(ctx: AudioContext, volume = 0.3) {
        this.ctx = ctx;
        this.master = ctx.createGain();
        this.master.gain.value = volume;
        this.master.connect(ctx.destination);
    }

    setVolume(v: number): void {
        this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
    }

    /** Bow a note at the given MIDI pitch for durationSec (plus a release tail). */
    note(midi: number, durationSec: number, velocity = 0.8): void {
        const ctx = this.ctx;
        const t = ctx.currentTime;
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        const peak = 0.9 * velocity;
        const sustain = 0.62 * velocity;
        const attack = 0.1; // bow swell, not a percussive onset
        const decay = 0.16;
        const release = 0.35;
        const hold = Math.max(durationSec, attack + decay);
        const end = t + hold + release + 0.05;

        // the low-pass opens during the attack for a bowed articulation
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 0.7;
        filter.frequency.setValueAtTime(freq * 2, t);
        filter.frequency.linearRampToValueAtTime(Math.min(4200, freq * 6), t + attack);

        const amp = ctx.createGain();
        amp.gain.setValueAtTime(0.0001, t);
        amp.gain.linearRampToValueAtTime(peak, t + attack);
        amp.gain.linearRampToValueAtTime(sustain, t + attack + decay);
        amp.gain.setValueAtTime(sustain, t + hold);
        amp.gain.exponentialRampToValueAtTime(0.0001, t + hold + release);
        filter.connect(amp);
        amp.connect(this.master);

        const voices: OscillatorNode[] = [];
        for (const detune of [-7, 7]) {
            const o = ctx.createOscillator();
            o.type = 'sawtooth';
            o.frequency.value = freq;
            o.detune.value = detune;
            o.connect(filter);
            o.start(t);
            o.stop(end);
            voices.push(o);
        }
        // a sine an octave down adds body without mud
        const sub = ctx.createOscillator();
        const subGain = ctx.createGain();
        sub.type = 'sine';
        sub.frequency.value = freq / 2;
        subGain.gain.value = 0.5;
        sub.connect(subGain);
        subGain.connect(filter);
        sub.start(t);
        sub.stop(end);

        // vibrato fades in after the onset, the way a player settles into a note
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 5.2;
        lfoGain.gain.setValueAtTime(0, t);
        lfoGain.gain.linearRampToValueAtTime(7, t + attack + 0.15);
        lfo.connect(lfoGain);
        for (const o of voices) lfoGain.connect(o.detune);
        lfo.start(t);
        lfo.stop(end);
    }

    dispose(): void {
        this.master.disconnect();
    }
}
