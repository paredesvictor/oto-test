import loadAudioBuffer from "../lib/load-audio-buffer.js";
import { scale, scaleClip } from "./utilities.js";

export class AudioGraph {
    constructor(audioContext) {
        this.context = audioContext;

        this._masterPan = this.context.createStereoPanner();
        this._masterPan.connect(this.context.destination);
        this._masterPan.pan.value = 0;
        
        this._distoGain = this.context.createGain();
        this._distoGain.connect(this._masterPan);
        this._distoGain.gain.value = 0;
        this._dryGain = this.context.createGain();
        this._dryGain.connect(this._masterPan);
        this._masterDisto = this.context.createWaveShaper();
        this._masterDisto.connect(this._distoGain);
        this._masterDisto.curve = makeDistortionCurve(400);
        this._masterDisto.oversample = "4x";

        this._masterGain = this.context.createGain();
        this._masterGain.connect(this._dryGain);
        this._masterGain.connect(this._masterDisto);

        this._limSpeed = 91;
        this._limDiff = 15;
        this._carSpeed = 0;

        this._players = [];
    }

    async initializeGraph() {
        this._players.push(new NormalSpeed(
            this.context,
            this._masterGain,
            'windStable.wav',
            this._limSpeed,
            this._limDiff,
            true
        ));
        this._players.push(new LimitSpeed(
            this.context,
            this._masterGain,
            'windUnstable.wav',
            this._limSpeed,
            this._limDiff,
            true
        ));
        this._players.push(new Brake(
            this.context,
            this._masterGain,
            'brake.wav',
            this._limSpeed,
            this._limDiff,
            true
        ));
        this._players.push(new SpeedUp(
            this.context,
            this._masterGain,
            'speedUp.wav',
            this._limSpeed,
            this._limDiff
        ));
        this._players.push(new SpeedDown(
            this.context,
            this._masterGain,
            'speedDown.wav',
            this._limSpeed,
            this._limDiff
        ));
        this._players.forEach(async player => await player.initPlayer());

        this._oscGain1 = this.context.createGain();
        this._oscGain1.connect(this._masterGain);
        this._oscGain1.gain.value = 0;
        this._oscGain1.gain.linearRampToValueAtTime(0.05, 2);

        this._osc1 = this.context.createOscillator();
        this._osc1.frequency.value = 90;
        this._osc1.connect(this._oscGain1);
        this._osc1.start();

        this._osc2 = this.context.createOscillator();
        this._osc2.frequency.value = 94.77;
        this._osc2.connect(this._oscGain1);
        this._osc2.start();

        this._oscGain2 = this.context.createGain();
        this._oscGain2.connect(this._masterGain);
        this._oscGain2.gain.value = 0;
        this._oscGain2.gain.linearRampToValueAtTime(0.025, 2);

        this._osc3 = this.context.createOscillator();
        this._osc3.frequency.value = 171.9;
        this._osc3.connect(this._oscGain2);
        this._osc3.start();

        this._osc4 = this.context.createOscillator();
        this._osc4.frequency.value = 176.5;
        this._osc4.connect(this._oscGain2);
        this._osc4.start();
    }

    updateSpeed(speed, acceleration) {
        this._carSpeed = speed;
        this._players.forEach(player => player.updateVolume(speed, acceleration));
        this._osc1.frequency.value = scale(speed, 0, this._limSpeed/2, 90, 170);
        this._osc2.frequency.value = scale(speed, 0, this._limSpeed/2, 94.77, 179.0);
        this._osc3.frequency.value = scale(speed, 0, this._limSpeed/2, 171.9, 324.7);
        this._osc4.frequency.value = scale(speed, 0, this._limSpeed/2, 176.5, 333.5);
    }

    updatePan(tilt) {
        const value = scaleClip(tilt, -Math.PI/4, Math.PI/4, -1, 1);
        this._masterPan.pan.value = value;
        const lateralTolerance = 1 - this._carSpeed**0.75 / 180**0.75;
        this.setDisto(Math.max(Math.abs(value) - lateralTolerance, 0));
        return lateralTolerance;
    }

    setDisto(amount) {
        this._distoGain.gain.value = amount;
        this._dryGain.gain.value = 1 - amount;
    }
}



class AudioPlayer {
    constructor(audioContext, destination, fileName, limSpeed, limDiff, loop=false) {
        this._gain = audioContext.createGain();
        this._gain.connect(destination);
        this._gain.gain.value = 0;

        this._filter = audioContext.createBiquadFilter();
        this._filter.connect(this._gain);
        this._filter.frequency.value = 20000;

        this._loop = loop;
        this._limSpeed = limSpeed;
        this._limDiff = limDiff;
        this._carSpeed = 0;

        this._fileName = fileName;
        this._context = audioContext;
    }

    async initPlayer() {
        this._buffer = await loadAudioBuffer(`./assets/${this._fileName}`, this._context.sampleRate);
        if (this._loop) {
            const source = this._context.createBufferSource();
            source.buffer = this._buffer;
            source.connect(this._filter);
            source.loop = true;
            source.start();
        }
    }

    play() {
        this._gain.gain.value = 1;
        const source = this._context.createBufferSource();
        source.buffer = this._buffer;
        source.connect(this._filter);
        source.loop = false;
        source.start();
    }

    updateVolume(speed, acceleration) {}
}

class NormalSpeed extends AudioPlayer {
    updateVolume(speed, acceleration) {
        let value = speed - (this._limSpeed - this._limDiff);
        value = scaleClip(value, -this._limDiff , this._limDiff, 0, 0.5);
        this._gain.gain.value = value;
        this._filter.frequency.value = frequencyControl(value);
    }
}

class LimitSpeed extends AudioPlayer {
    updateVolume(speed, acceleration) {
        const speedDiff = speed - this._limSpeed;
        this._gain.gain.value = scaleClip(speedDiff, 0, this._limDiff, 0, 1);
    }
}

class Brake extends AudioPlayer {
    updateVolume(speed, acceleration) {
        if (acceleration < -15) {
            this._gain.gain.value = scale(acceleration, -15, -30, 0, 1);
        } else {
            this._gain.gain.value = 0;
        }
    }
}

class SpeedUp extends AudioPlayer {
    updateVolume(speed, acceleration) {
        if (speed > this._limSpeed && this._carSpeed < this._limSpeed) {
            this.play();
        }
        this._carSpeed = speed;
    }
}

class SpeedDown extends AudioPlayer {
    updateVolume(speed, acceleration) {
        if (speed < this._limSpeed && this._carSpeed > this._limSpeed) {
            this.play();
        }
        this._carSpeed = speed;
    }
}

function frequencyControl(value) {
    return 200 * Math.pow(10, 2 * value);
}

function makeDistortionCurve(amount) {
  const k = typeof amount === "number" ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;

  for (let i = 0; i < n_samples; i++) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}