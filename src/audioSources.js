import { scale } from "./utilities";
import loadAudioBuffer from "../lib/load-audio-buffer";
import { frequencyControl } from "./utilities";

export class ResonatorEngine {
	constructor(audioContext) {
		this.audioContext = audioContext;
        this.n = 8;
        this.QFactor = 3;
		this.output = this.audioContext.createGain();

        this.gains = [];
        for (let i=0; i < this.n; i++) {
            const gain = this.audioContext.createGain();
            gain.gain.value = 0.81;
            gain.connect(this.output);
            this.gains.push(gain);
        }

        this.filters = [];
        for (let i=0; i < this.n; i++) {
            const filter = this.audioContext.createBiquadFilter();
            filter.type = "bandpass";
            filter.connect(this.gains[i]);
            this.filters.push(filter);
        }

        this.lowpass = this.audioContext.createBiquadFilter();
        this.lowpass.type = "lowpass";
        this.lowpass.frequency.value = 600;
        this.filters.forEach(node => this.lowpass.connect(node));

        this.input = this.audioContext.createGain();
        this.input.connect(this.lowpass);

        this.setFiltersParam(0);
	}

    setFiltersParam(param) {
        const value = param; // Math.pow(param, 0.5)
        const minMidi = 43;
        const maxMidi = scale(value, 0, 1, 44, 90);

        for (let i=0; i < this.n; i++) {
            let midi = i * (maxMidi - minMidi) / (this.n - 1) + minMidi;
            const freq = (440 * Math.exp(0.057762265 * (midi - 69))); // midi2freq

            this.filters[i].frequency.value = Math.min(freq, 20000); 
            this.filters[i].Q.value = scale(value, 0, 1, 50, 10) * this.QFactor;
        }
        this.lowpass.frequency.value = frequencyControl(value, 600, 2000);
    }

	connectInput(inputNode) {
        inputNode.connect(this.input);
    }

	connect(destination) {
		this.output.connect(destination);
	}
}

export class AudioPlayer {
    constructor(audioContext, destination, fileName, limSpeed, limDiff, loop=false, initGain=0) {
        this.gain = audioContext.createGain();
        this.gain.connect(destination);
        this.gain.gain.value = initGain;

        this.filter = audioContext.createBiquadFilter();
        this.filter.connect(this.gain);
        this.filter.frequency.value = 20000;

        this.loop = loop;
        this.limSpeed = limSpeed;
        this.limDiff = limDiff;
        this.carSpeed = 0;

        this.fileName = fileName;
        this.context = audioContext;
        this.player = this.context.createBufferSource();
    }

    async init() {
        this.buffer = await loadAudioBuffer(`./assets/${this.fileName}`, this.context.sampleRate);
        if (this.loop) {
            this.player = this.context.createBufferSource();
            this.player.buffer = this.buffer;
            this.player.connect(this.filter);
            this.player.loop = true;
            this.player.start();
        }
    }

    play() {
        this.gain.gain.value = 1;
        const player = this.context.createBufferSource();
        player.buffer = this.buffer;
        player.connect(this.filter);
        player.loop = false;
        player.start();
    }

    update(speed, acceleration) {}

    changeLimit(speed) {
        this.limSpeed = speed;
    }
}