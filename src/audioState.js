export class audioGraph {
    constructor(audioContext) {
        this.context = audioContext;
    }

    async initializeGraph() {
        const buffer = await loadAudioBuffer('./assets/NappeLisse.wav', audioContext.sampleRate);
        const vent = await loadAudioBuffer('./assets/VentInstable_01.wav', audioContext.sampleRate);
        const nappe = await loadAudioBuffer('./assets/NappeLisse.wav', audioContext.sampleRate);

        this.masterPan = audioContext.createStereoPanner();
        masterPan.connect(audioContext.destination);
        masterPan.pan.value = 0;

        this.masterGain = audioContext.createGain();
        masterGain.connect(masterPan);

        this.filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 0;
        filter.connect(masterGain);

        this.filter2 = audioContext.createBiquadFilter();
        filter2.type = 'lowpass';
        filter2.frequency.value = 0;
        filter2.connect(masterGain);

        this.src = audioContext.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        src.connect(filter);

        this.src_nappe = audioContext.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        src.connect(masterGain);

        this.src_vent = audioContext.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        src.connect(filter2);

        this.src.start();
    }
}