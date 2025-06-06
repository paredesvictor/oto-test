import loadAudioBuffer from "../lib/load-audio-buffer.js";
import { ResonatorEngine, AudioPlayer } from "./audioSources.js";
import {
  LowPassFilter,
  scale,
  scaleClip,
  frequencyControl,
  volumeControl,
  makeDistortionCurve,
} from "./utilities.js";

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

    this.state = {
      time: audioContext.currentTime,
      context: audioContext,
      rate: 0,
      filteredLimSpeed: 0,
      limSpeed: 0,
      limDiff: 10,
      speed: 0,
      previousSpeed: 0,
      acceleration: 0,
      input: 0,
      deviation: 0,

      updateLimit() {
        const current = this.context.currentTime;
        this.filteredLimSpeed += this.rate * Math.min(current - this.time, 0.1);
        if (
          this.rate !== 0 &&
          (this.limSpeed - this.filteredLimSpeed) / this.rate < 0
        ) {
          this.filteredLimSpeed = this.limSpeed;
          this.rate = 0;
        }
        this.time = current;
      },

      setLimit(value) {
        if (this.limSpeed === 0) {
          this.limSpeed = value;
          this.filteredLimSpeed = value;
          this.rate = 0;
          return;
        }
        const diff = value - this.filteredLimSpeed;
        this.rate = diff > 0 ? diff / 2 : diff / 5;
        this.limSpeed = value;
      },
    };

    this.sources = [];
  }

  async initializeGraph() {
    // Sources must have an init() and update(speed, accel) method
    this.sources.push(
      new NearLimit(this.context, this.masterGain, "windStable.wav", true)
    );

    this.sources.push(
      new LimitSpeed(this.context, this.masterGain, "windUnstable.wav", true)
    );

    this.sources.push(
      new Brake(this.context, this.masterGain, "brake.wav", true)
    );

    this.sources.push(
      new SpeedUp(this.context, this.masterGain, "speedUp.wav")
    );

    this.sources.push(
      new SpeedDown(this.context, this.masterGain, "speedDown.wav")
    );

    const resonator = new Resonator(this.context, this.masterGain);
    this.sources.push(resonator);

    this.sources.push(
      new Motor(this.context, resonator.input, "angenoise.wav", true, 1)
    );

    this.sources.forEach(async (source) => await source.init());
  }

  updateSpeed(speed, dt, input) {
    this.state.updateLimit();
    this.state.speed = speed;
    this.state.input = input;
    this.state.acceleration = (speed - this.state.previousSpeed) / dt;
    this.state.deviation = speed - this.state.filteredLimSpeed;
    this.sources.forEach((source) => source.update(this.state));
    this.state.previousSpeed = speed;
  }

  changeLimit(speed) {
    this.state.setLimit(speed);
    this.sources.forEach((source) => source.update(this.state));
  }

  updatePan(tilt) {
    const value = scaleClip(tilt, -Math.PI / 4, Math.PI / 4, -1, 1);
    this.masterPan.pan.value = value;
    const lateralTolerance = 1 - this.state.speed ** 0.75 / 180 ** 0.75;
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
    );
  }
}

class NearLimit extends AudioPlayer {
  constructor() {
    super(...arguments);
    this.lpfilter = new LowPassFilter(1, 0.05);
    this.time = this.context.currentTime || 0;
  }

  update(state) {
    const limDiff = state.limDiff;

    const dt = Math.min(this.context.currentTime - this.time, 0.1);
    this.time = this.context.currentTime;

    const forwardActivity = scaleClip(state.input, 0.03, 0.15, 0, 1);
    const accelFactor = this.lpfilter.process(forwardActivity, dt);

    const value = scaleClip(state.deviation, -limDiff, 0, 0, 1);

    this.gain.gain.value = accelFactor * volumeControl(value);
    this.filter.frequency.value = frequencyControl(value);
  }
}

class LimitSpeed extends AudioPlayer {
  update(state) {
    this.gain.gain.value = scaleClip(state.deviation, 0, state.limDiff, 0, 1);
  }
}

class Brake extends AudioPlayer {
  update(state) {
    this.gain.gain.value = volumeControl(
      0.75 * scaleClip(state.acceleration || 0, -6, -15, 0, 1)
    );
  }
}

class SpeedUp extends AudioPlayer {
  constructor() {
    super(...arguments);
    this.previousLimSpeed = 0;
  }

  update(state) {
    const speed = state.speed;
    const previousSpeed = state.previousSpeed;
    if (speed > state.limSpeed && previousSpeed < this.previousLimSpeed) {
      this.play();
    }
    this.previousLimSpeed = state.limSpeed;
  }
}

class SpeedDown extends AudioPlayer {
  constructor() {
    super(...arguments);
    this.previousLimSpeed = 0;
  }

  update(state) {
    const speed = state.speed;
    const previousSpeed = state.previousSpeed;
    if (speed < state.limSpeed && previousSpeed > this.previousLimSpeed) {
      this.play();
    }
    this.previousLimSpeed = state.limSpeed;
  }
}

class Motor extends AudioPlayer {
  update(state) {
    this.player.detune.value = scale(state.speed, 0, 130, -100, 0);
  }
}

class Resonator extends ResonatorEngine {
  constructor(audioContext, destination) {
    super(audioContext);
    this.output.connect(destination);
  }

  async init() {}

  update(state) {
    const value = scale(state.speed, 0, 130, 0, 1);
    this.setFiltersParam(value);
  }
}
