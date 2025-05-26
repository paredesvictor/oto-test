import { html, render } from 'lit';
import '@ircam/sc-components';

import resumeAudioContext from '../lib/resume-audio-context.js';
import loadAudioBuffer from '../lib/load-audio-buffer.js';
import funnyFullScreen from '../lib/funny-full-screen.js';
import { scale, LowPassFilter} from './utilities.js';

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

function rotateLogo(angle) {
  document.getElementById('logo').style.setProperty('rotate', `${angle}rad`);
}

function setSliderValue(id, value){
  document.getElementById(`slider${id}`).value = value;
}

// MOVEMENT INTERACTION
const accel = new Accelerometer({'frequency':60});
const gyro = new Gyroscope({'frequency':60});
const lp1 = new LowPassFilter(1.5);

let timeAccel = audioContext.currentTime;
let pitch_accel = 0;
let pitch_gyro = 0;
let pitch = 0;
let pitch_a = 0.6;
let tilt_accel = 0;
let tilt_gyro = 0;
let tilt = 0;
let tilt_a = 0.8;

accel.addEventListener('reading', () => {
  const currentTime = audioContext.currentTime;
  const dt = currentTime - timeAccel;
  timeAccel = currentTime;
  const ax = accel.x / 9.81;
  const ay = accel.y / 9.81;
  const az = accel.z / 9.81;
  setSliderValue(1, (Math.PI / 2 - Math.asin(ax)));
  setSliderValue(2, (Math.asin(az)));
  pitch_accel = (Math.PI / 2 - Math.asin(ax)) || pitch_accel;
  pitch = pitch_a * pitch_gyro + (1 - pitch_a) * pitch_accel;
  tilt_accel = Math.atan2(ay, Math.sqrt(az**2 + ax**2));
  tilt = tilt_a * tilt_gyro + (1 - tilt_a) * tilt_accel;
  rotateLogo(-tilt);
})

let timeGyro = audioContext.currentTime;
gyro.addEventListener('reading', () => {
  const currentTime = audioContext.currentTime;
  const dt = currentTime - timeGyro;
  const gy = gyro.y;
  const gz = gyro.z;
  timeGyro = currentTime;
  pitch_gyro = pitch + gy * dt;
  pitch = pitch_a * pitch_gyro + (1 - pitch_a) * pitch_accel;
  tilt_gyro = tilt - gz * dt;
  tilt = tilt_a * tilt_gyro + (1 - tilt_a) * tilt_accel;
  rotateLogo(-tilt);
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
accel.start();
gyro.start();

render(html`

  <sc-slider id="slider1" value=0 min=0 max=1.57
  ></sc-slider>
  <sc-slider id="slider2" value=0 min=0 max=1.57
  ></sc-slider>

  <img id="logo" src="assets/logo.png" style="width:200px; rotate:0deg"/>

`, document.body);