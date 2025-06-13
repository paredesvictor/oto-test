import loadAudioBuffer from "../lib/load-audio-buffer.js";
import { ResonatorEngine, AudioPlayer } from "./audioSources.js";
import {
  LowPassFilter,
  RampToValue,
  scale,
  scaleClip,
  frequencyControl,
  volumeControl,
  makeDistortionCurve,
} from "./utilities.js";

export class AudioGraph {
  constructor(audioContext) {
    this.context = audioContext;

    this.output = this.context.createGain();
    this.output.connect(this.context.destination);

    this.masterPan = this.context.createStereoPanner();
    this.masterPan.connect(this.output);
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
      isChangingLimit: false,
      limitFactor: 0,
      limitFilter: new RampToValue(2, 2, () => this.context.currentTime),
      limSpeedFilter: new RampToValue(2, 8, () => this.context.currentTime),
      quickLimSpeedFilter: new RampToValue(2, 2, () => this.context.currentTime),
      filteredLimSpeed: 0,
      limSpeed: 0,
      limDiff: 10,
      speed: 0,
      previousSpeed: 0,
      acceleration: 0,
      input: 0,
      deviation: 0,

      updateLimit() {
        this.filteredLimSpeed = this.limSpeedFilter.update();
        this.limitFactor = this.limitFilter.update();
        this.limSpeed = this.quickLimSpeedFilter.update();
      },

      setLimit(value) {
        this.filteredLimSpeed = value;
        this.limSpeedFilter.set(value);
        this.limSpeed = this.quickLimSpeedFilter.start(value);
        this.limitFilter.start(0);
        this.isChangingLimit = false;
      },

      setLimitRamp(value) {
        if (this.limSpeed === 0) {
          this.setLimit(value);
          this.quickLimSpeedFilter.set(value);
          return;
        }
        if (!this.isChangingLimit) {
          this.limSpeedFilter.start(value);
          this.isChangingLimit = true;
          this.limitFilter.start(1);
        }
      },
    };

    this.sources = {};
  }

  updateSpeed(speed, dt, input) {
    this.state.updateLimit();
    this.state.speed = speed;
    this.state.input = input;
    this.state.acceleration = (speed - this.state.previousSpeed) / dt;
    this.state.deviation = speed - this.state.limSpeed;
    Object.values(this.sources).forEach((source) => source.update(this.state));
    this.state.previousSpeed = speed;
  }

  changeLimit(speed) {
    console.log();
    this.state.setLimit(speed);
  }

  changeLimitRamp(speed) {
    this.state.setLimitRamp(speed);
  }

  updatePan(tilt) {
    const value = scaleClip(-tilt, -Math.PI / 4, Math.PI / 4, -1, 1);
    this.masterPan.pan.value = Math.sign(value) * Math.sqrt(Math.abs(value));
    const lateralTolerance = 1 - (this.state.speed / 180) ** 0.75;
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

  play(source) {
    this.sources[source].play();
  }

  async initializeGraph() {
    // Sources must have an init() and update(speed, accel) method
    this.sources["nearLimit"] = new NearLimit(
      this.context,
      this.masterGain,
      "windStable.wav",
      true
    );

    this.sources["newLimit"] = new NewLimit(
      this.context,
      this.masterGain,
      "windStable.wav",
      true
    );

    this.sources["limit"] = new LimitSpeed(
      this.context,
      this.masterGain,
      "windUnstable.wav",
      true
    );

    this.sources["brake"] = new Brake(
      this.context,
      this.masterGain,
      "brake.wav",
      true
    );

    this.sources["upLimit"] = new SpeedUp(
      this.context,
      this.masterGain,
      "speedUp.wav"
    );

    this.sources["downLimit"] = new SpeedDown(
      this.context,
      this.masterGain,
      "speedDown.wav"
    );

    this.sources["nextLimit"] = new AudioPlayer(
      this.context,
      this.masterGain,
      "AngieBipBrefHigh.wav"
    );

    this.sources["limitChange"] = new AudioPlayer(
      this.context,
      this.masterGain,
      "AngieBipBref_01.wav"
    );

    this.sources["turnOn"] = new AudioPlayer(
      this.context,
      this.output,
      "Allume2.wav"
    );

    this.sources["turnOff"] = new AudioPlayer(
      this.context,
      this.output,
      "Eteint1wav.wav"
    );

    const resonator = new Resonator(this.context, this.masterGain);
    this.sources["resonator"] = resonator;

    this.sources["motor"] = new Motor(
      this.context,
      resonator.input,
      "angenoise.wav",
      true,
      1
    );

    Object.values(this.sources).forEach(async (source) => await source.init());
  }
}

class NearLimit extends AudioPlayer {
  constructor() {
    super(...arguments);
    this.lpfilter = new LowPassFilter(0.2, 0.05);
    this.time = this.context.currentTime || 0;
  }

  update(state) {
    const limDiff = state.limDiff;

    const dt = Math.min(this.context.currentTime - this.time, 0.1);
    this.time = this.context.currentTime;

    const forwardActivity = scaleClip(state.input, 0.03, 0.15, 0, 1);
    const accelFactor = this.lpfilter.process(forwardActivity, dt);
    const value =
      scaleClip(state.deviation, -limDiff, 0, 0, 1); // * (1 - state.limitFactor);
    this.gain.gain.value = accelFactor * volumeControl(value);
    this.filter.frequency.value = frequencyControl(value);
  }
}

class NewLimit extends AudioPlayer {
  update(state) {
    const limDiff = state.limDiff;
    const movingDeviation = state.speed - state.filteredLimSpeed;
    const value =
      scaleClip(movingDeviation, 0, limDiff, 0, 1) * state.limitFactor;
    this.gain.gain.value = volumeControl(value);
    this.filter.frequency.value = frequencyControl(value);
  }
}

class LimitSpeed extends AudioPlayer {
  update(state) {
    const value = scaleClip(state.deviation, 0, state.limDiff, 0, 1);
    this.gain.gain.value = value; // * (1 - state.limitFactor);
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
  update(state) {
    const speed = state.speed;
    const previousSpeed = state.previousSpeed;
    if (speed > state.limSpeed && previousSpeed < state.limSpeed) {
      this.play();
    }
  }
}

class SpeedDown extends AudioPlayer {
  update(state) {
    const speed = state.speed;
    const previousSpeed = state.previousSpeed;
    if (speed < state.limSpeed && previousSpeed > state.limSpeed) {
      this.play();
    }
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
