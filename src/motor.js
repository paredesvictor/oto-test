import { scale } from "./utilities";

export class ResonatorEngine {
	constructor(audioContext) {
		this.audioContext = audioContext;
        this.n = 8;
        this.QFactor = 1;

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

        this.setFiltersParam(0);

        this.input = this.audioContext.createGain();
        this.filters.forEach(node => this.input.connect(node));
	}

    setFiltersParam(param) {
        const value = Math.pow(param, 0.5)
        const minMidi = 30;
        const maxMidi = scale(value, 0, 1, 30, 90);
        for (let i=0; i < this.n; i++) {
            let midi = i * (maxMidi - minMidi) / (this.n - 1) + minMidi;
            midi = scale(midi, 0, 127, 30, 90);
            const freq = (440 * Math.exp(0.057762265 * (midi - 69))); // midi2freq
            console.log(freq);
            this.filters[i].frequency.value = freq; 
            this.filters[i].Q.value = scale(value, 0, 1, 50, 10) * this.QFactor;
            console.log(scale(value, 0, 1, 50, 10) * this.QFactor);
        }
    }

	connectInput(inputNode) {
        inputNode.connect(this.input);
    }

	connect(destination) {
		this.output.connect(destination);
	}
}