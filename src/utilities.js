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

export function scale(value, in_low, in_high, out_low, out_high) {
    if (in_high === in_low) {
        return out_low;
    }
    return (value - in_low) * (out_high - out_low) / (in_high - in_low) + out_low;
}

export function scaleClip(value, in_low, in_high, out_low, out_high) {
    let output = (value - in_low) * (out_high - out_low) / (in_high - in_low) + out_low;
    output = Math.min(output, out_high);
    output = Math.max(output , out_low);
    return output;
}