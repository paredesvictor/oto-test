export class LowPassFilter {
  constructor(upFrequency = 1, downFrequency = upFrequency) {
    this.prevOutput = 0;
    this.upRC = 1 / (2 * Math.PI * upFrequency);
    this.downRC = 1 / (2 * Math.PI * downFrequency);
  }

  process(input, dt) {
    let alpha = 0;
    if (input - this.prevOutput > 0) {
      alpha = dt / (dt + this.upRC);
    } else {
      alpha = dt / (dt + this.downRC);
    }
    const output = this.prevOutput + alpha * (input - this.prevOutput);
    this.prevOutput = output;
    return output;
  }

  set cutoffFrequency(value) {
    this.upRC = 1 / (2 * Math.PI * value);
  }

  get cutoffFrequency() {
    return 1 / (2 * Math.PI * this.upRC);
  }
}

export class RampToValue {
  constructor(upTime, downTime, timeFunc) {
    this.upTime = upTime;
    this.downTime = downTime;
    this.rate = 0;
    this.target = 0;
    this.currentValue = 0;
    this.getTime = timeFunc;
    this.time = timeFunc();
  }

  start(target) {
    this.target = target;
    this.time = this.getTime();
    const diff = this.target - this.currentValue;
    if (diff === 0) {
      this.rate = 0;
    } else {
    this.rate = diff > 0 ? diff / this.upTime : diff / this.downTime;
    }
  }

  update() {
    if (this.rate === 0) {
      return this.target;
    } else {
      const current = this.getTime();
      const dt = current - this.time;
      this.time = current;
      this.currentValue += this.rate * dt;
      const completed = (this.target - this.currentValue) / this.rate < 0;
      if (completed) {
        this.currentValue = this.target;
        this.rate = 0;
      }
      return this.currentValue;
    }
  }

  set(value) {
    this.target = value;
    this.currentValue = value;
    this.rate = 0;
  }
}

export function scale(value, in_low, in_high, out_low, out_high) {
  if (in_high === in_low) {
    return out_low;
  }
  return (
    ((value - in_low) * (out_high - out_low)) / (in_high - in_low) + out_low
  );
}

export function scaleClip(value, in_low, in_high, out_low, out_high) {
  let output =
    ((value - in_low) * (out_high - out_low)) / (in_high - in_low) + out_low;
  output = Math.min(output, out_high);
  output = Math.max(output, out_low);
  return output;
}

export function frequencyControl(value, minFreq = 200, maxFreq = 20000) {
  const factor = Math.log10(maxFreq / minFreq);
  return 200 * Math.pow(10, factor * value);
}

export function volumeControl(value) {
  return Math.pow(value, 3);
}

export function makeDistortionCurve(amount) {
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
