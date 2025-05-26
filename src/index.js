import { html, render } from 'lit';
import '@ircam/sc-components';

import resumeAudioContext from '../lib/resume-audio-context.js';
import loadAudioBuffer from '../lib/load-audio-buffer.js';
import funnyFullScreen from '../lib/funny-full-screen.js';
import { scale, LowPassFilter } from './utilities.js';

// AUDIO GRAPH
const audioContext = new AudioContext();
await resumeAudioContext(audioContext);

// const buffer = await loadAudioBuffer('./assets/NappeLisse.wav', audioContext.sampleRate);
// const vent = await loadAudioBuffer('./assets/VentInstable_01.wav', audioContext.sampleRate);
// const nappe = await loadAudioBuffer('./assets/NappeLisse.wav', audioContext.sampleRate);


// const masterPan = audioContext.createStereoPanner();
// masterPan.connect(audioContext.destination);
// masterPan.pan.value = 0;

// const masterGain = audioContext.createGain();
// masterGain.connect(masterPan);

// const filter = audioContext.createBiquadFilter();
// filter.type = 'lowpass';
// filter.frequency.value = 0;
// filter.connect(masterGain);

// const filter2 = audioContext.createBiquadFilter();
// filter2.type = 'lowpass';
// filter2.frequency.value = 0;
// filter2.connect(masterGain);

// const src = audioContext.createBufferSource();
// src.buffer = buffer;
// src.loop = true;
// src.connect(filter);

// const src_nappe = audioContext.createBufferSource();
// src.buffer = buffer;
// src.loop = true;
// src.connect(masterGain);

// const src_vent = audioContext.createBufferSource();
// src.buffer = buffer;
// src.loop = true;
// src.connect(filter2);

// src.start();

function frequencyControl(value, low=0, high=1) {
  const scaledValue = scale(value, low, high, 0, 0.8);
  if (scaledValue < 0.05) {
    filter.frequency.value = 200 * scaledValue / 0.05;
  } else {
    filter.frequency.value = 200 * Math.pow(10, 2 * scaledValue);
  }
}

function display(message) {
  document.getElementById('print').innerText = message;
}

// MOVEMENT INTERACTION
const accel = new Accelerometer({'frequency':60});
const gyro = new Gyroscope({'frequency':60});

let time_accel = audioContext.currentTime;
const lp1 = new LowPassFilter(1.5);

// const lp2 = new LowPassFilter(1);
// const lp3 = new LowPassFilter(1);

accel.addEventListener('reading', () => {
  const currentTime = audioContext.currentTime;
  const dt = currentTime - time_accel;
  time_accel = currentTime;
  const value = accel.y / 9.81;
  const angle = Math.PI / 2 - Math.acos(lp1.process(value, dt));
  // document.getElementById('logo').style.setProperty('transform', `rotate(${-angle}rad)`);
})

let rotation = 0;
let time_gyro = audioContext.currentTime;
gyro.addEventListener('reading', () => {
  const currentTime = audioContext.currentTime;
  const dt = currentTime - time_gyro;
  const value = gyro.z;
  time_gyro = currentTime;
  rotation += value * dt;
  document.getElementById('logo').style.setProperty('transform', `rotate(${rotation}rad)`);
})

// const panInput = quaternions[0] - quaternions[2];
// // document.getElementById('slider1').value = scale_input_speed
// // document.getElementById('slider2').value = scale_speed;
// frequencyControl(speed, low_bound, high_bound);
// masterPan.pan.value = scale(panInput, -0.6, 0.6, -1, 1);
// document.getElementById('f-value').innerText = panInput;

// VIBRATIONS
const navigator = window.navigator;
funnyFullScreen.enable();
render(html`
  <sc-number id="cutoff" value=${lp1.cutoffFrequency}
  @input=${e => {
    lp1.cutoffFrequency = e.detail.value;
  }}
  ></sc-number>
  <sc-toggle
  @change=${e => {
    if (e.detail.value) {
      accel.start();
      gyro.start();
    } else {
      accel.stop();
      gyro.stop();
    }
    }}
    ></sc-toggle>

    <!-- <sc-slider id="slider1" value=0 min=-1 max=1
    ></sc-slider>
    <sc-slider id="slider2" value=0 min=${-Math.PI / 2} max=${Math.PI / 2}
    ></sc-slider>
    <sc-slider id="slider3" value=0 min=${-2 * Math.PI} max=${2 * Math.PI}
    ></sc-slider> -->
    <!-- <sc-slider id="slider4" value=0 min=-1 max=1
    ></sc-slider>
    <sc-slider id="slider5" value=0 min=-1 max=1
    ></sc-slider>
    <sc-slider id="slider6" value=0 min=-1 max=1
    ></sc-slider> -->

    <!-- <p id="print"></p> -->

    <img id="logo" src="assets/logo.png" style="width:200px; rotate:0deg"/>

`, document.body);