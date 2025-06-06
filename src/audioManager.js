import loadAudioBuffer from "../lib/load-audio-buffer.js";
import { ResonatorEngine, AudioPlayer } from "./audioSources.js";
import { LowPassFilter, scale, scaleClip, frequencyControl, makeDistortionCurve } from "./utilities.js";

export class AudioGraph {
    constructor(audioContext) {
        this.context = audioContext;

        this.masterPan = this.context.createStereoPanner();
        this.masterPan.connect(this.context.destination);
        this.masterPan.pan.value = 0;
        
        this.distoGain = this.context.createGain();
        this.distoGain.connect(this.masterPan);
        this.distoGain.gain.value = 0;
        this.dryGain = this.context.createGain();
        this.dryGain.connect(this.masterPan);
        this.masterDisto = this.context.createWaveShaper();
        this.masterDisto.connect(this.distoGain);
        this.masterDisto.curve = makeDistortionCurve(400);
        this.masterDisto.oversample = "4x";

        this.masterGain = this.context.createGain();
        this.masterGain.connect(this.dryGain);
        this.masterGain.connect(this.masterDisto);

        this.limSpeed = 0;
        this.limDiff = 10;
        this.carSpeed = 0;
        this.carAcceleration = 0;

        this.sources = [];
    }

    async initializeGraph() {
        // Sources must have an init() and update(speed, accel) method
        this.sources.push(new NearLimit(
            this.context,
            this.masterGain,
            'windStable.wav',
            this.limSpeed,
            this.limDiff,
            true
        ));

        this.sources.push(new LimitSpeed(
            this.context,
            this.masterGain,
            'windUnstable.wav',
            this.limSpeed,
            this.limDiff,
            true
        ));

        this.sources.push(new Brake(
            this.context,
            this.masterGain,
            'brake.wav',
            this.limSpeed,
            this.limDiff,
            true
        ));

        this.sources.push(new SpeedUp(
            this.context,
            this.masterGain,
            'speedUp.wav',
            this.limSpeed,
            this.limDiff
        ));

        this.sources.push(new SpeedDown(
            this.context,
            this.masterGain,
            'speedDown.wav',
            this.limSpeed,
            this.limDiff
        ));

        const resonator = new Resonator(
            this.context,
            this.masterGain,
            this.limSpeed,
            this.limDiff
        );
        this.sources.push(resonator);

        this.sources.push(new Motor(
            this.context,
            resonator.input,
            'angenoise.wav',
            this.limSpeed,
            this.limDiff,
            true,
            1
        ));

        this.sources.forEach(async source => await source.init());
    }

    updateSpeed(speed, dt) {
        const acceleration = (speed - this.carSpeed) / dt;
        this.carSpeed = speed;
        this.sources.forEach(source => source.update(speed, acceleration));
    }

    changeLimit(speed) {
        this.limDiff = speed;
        this.sources.forEach(source => source.changeLimit(speed));
        this.sources.forEach(source => source.update(
            this.carSpeed,
            this.carAcceleration
        ));
    }

    updatePan(tilt) {
        const value = scaleClip(tilt, -Math.PI/4, Math.PI/4, -1, 1);
        this.masterPan.pan.value = value;
        const lateralTolerance = 1 - this.carSpeed**0.75 / 180**0.75;
        this.setDisto(Math.max(Math.abs(value) - lateralTolerance, 0));
    }

    setDisto(amount) {
        this.distoGain.gain.value = amount;
        this.dryGain.gain.value = 1 - amount;
    }

    mute(active) {
        this.masterGain.gain.exponentialRampToValueAtTime(
            active ? 0.0001 : 1,
            this.context.currentTime + 1
        )
    }
}

class NearLimit extends AudioPlayer {
    constructor(audioContext, destination, fileName, limSpeed, limDiff, loop=false, initGain=0) {
        super(audioContext, destination, fileName, limSpeed, limDiff, loop, initGain);
        this.lpfilter = new LowPassFilter(5, 0.05);
        this.time = this.context.currentTime || 0;
    }

    update(speed, acceleration) {
        const current = this.context.currentTime;
        const dt = Math.min(current - this.time, 0.1);
        this.time = current;
        const fAcceleration = this.lpfilter.process(acceleration, dt) || 1;
        const accelFactor = scaleClip(fAcceleration, 0.5, 2, 0, 1);
        console.log(fAcceleration, accelFactor);
        let value = speed - (this.limSpeed - this.limDiff);
        value = scaleClip(value, -this.limDiff , this.limDiff, 0, 0.5);
        this.gain.gain.value = value * accelFactor;
        this.filter.frequency.value = frequencyControl(value);
    }
}

class LimitSpeed extends AudioPlayer {
    update(speed, _) {
        const speedDiff = speed - this.limSpeed;
        this.gain.gain.value = scaleClip(speedDiff, 0, this.limDiff, 0, 1);
    }
}

class Brake extends AudioPlayer {
    update(_, acceleration) {
        if (acceleration < -0.5) {
            this.gain.gain.value = scaleClip(acceleration, -5, -10, 0, 1);
        } else {
            this.gain.gain.value = 0;
        }
    }
}

class SpeedUp extends AudioPlayer {
    update(speed, _) {
        if (speed > this.limSpeed && this.carSpeed < this.limSpeed) {
            this.play();
        }
        this.carSpeed = speed;
    }
}

class SpeedDown extends AudioPlayer {
    update(speed, _) {
        if (speed < this.limSpeed && this.carSpeed > this.limSpeed) {
            this.play();
        }
        this.carSpeed = speed;
    }
}

class Motor extends AudioPlayer {
    update(speed, _) {
        this.player.detune.value = scale(speed, 0, 130, -100, 0);
    }
}

class Resonator extends ResonatorEngine {
    constructor(audioContext, destination, limSpeed, limDiff) {
        super(audioContext);
        this.output.connect(destination);

        this.limSpeed = limSpeed;
        this.limDiff = limDiff;
        this.carSpeed = 0;
    }

    async init() {}

    update(speed, _) {
        const value = scale(speed, 0, 130, 0, 1);
        this.setFiltersParam(value);
    }

    changeLimit(speed) {
        this.limSpeed = speed;
    }
}