import { html, render } from "lit";
import "@ircam/sc-components";

import resumeAudioContext from "../lib/resume-audio-context.js";
import funnyFullScreen from "../lib/funny-full-screen.js";
import loadAudioBuffer from "../lib/load-audio-buffer.js";
import { AudioGraph } from "./audioManager.js";
import { ResonatorEngine } from "./motor.js";

// ------- AUDIO GRAPH
const audioContext = new AudioContext();
await resumeAudioContext(audioContext);

const buffer = await loadAudioBuffer('/assets/noise.wav', audioContext.sampleRate);

const gain = audioContext.createGain();
gain.gain.value = 0.5;
gain.connect(audioContext.destination);

const resonators = new ResonatorEngine(audioContext);
resonators.connect(gain);

const source = audioContext.createBufferSource();
source.buffer = buffer;
source.loop = true;
source.start();
resonators.connectInput(source);
// source.connect(gain);


render(
  html`
    <sc-slider value=0.5
    @input=${e => {
        gain.gain.value = e.detail.value;
    }}
    ></sc-slider>
    <sc-slider id='f' value=0 min=0 max=1
    @input=${e => {
        resonators.setFiltersParam(e.detail.value);
    }}
    ></sc-slider>
    <sc-slider value=1 min=0 max=5
    @input=${e => {
        resonators.QFactor = e.detail.value;
        resonators.setFiltersParam(document.getElementById('f').value);
    }}
    ></sc-slider>
    
  `,
  document.body
);

function display(message) {
  document.getElementById("print").innerText = message;
}