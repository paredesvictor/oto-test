export class LowPassFilter {
    constructor(cutoffFrequency = 1) {
        this._prevOutput = 0;
        this._rc = 1 / (2 * Math.PI * cutoffFrequency);
    }

    process(input, dt) {
        const alpha = dt / (dt + this._rc);
        const output = this._prevOutput + alpha * (input - this._prevOutput);
        this._prevOutput = output;
        return output;
    }

    set cutoffFrequency(value) {
        this._rc = 1 / (2 * Math.PI * value);
    }

    get cutoffFrequency() {
        return 1 / (2 * Math.PI * this._rc);
    }
}
 export class Orientation {
    constructor(alpha=0.005) {
        this._angle = 0;
        this._acceleration_value;
    }

    update_accel(value) {

    }

    update_gyro(value) {

    }
 }

export function scale(value, in_low, in_high, out_low, out_high) {
    return (value - in_low) * (out_high - out_low) / (in_high - in_low) + out_low;
}