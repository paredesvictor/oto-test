import { html, render } from "lit";
import "@ircam/sc-components";

import resumeAudioContext from "../lib/resume-audio-context.js";
import loadAudioBuffer from "../lib/load-audio-buffer.js";
import funnyFullScreen from "../lib/funny-full-screen.js";
import { scale, LowPassFilter } from "./utilities.js";



// ------- AUDIO GRAPH
const audioContext = new AudioContext();
await resumeAudioContext(audioContext);


function frequencyControl(value, low = 0, high = 1) {
  const scaledValue = scale(value, low, high, 0, 0.8);
  if (scaledValue < 0.05) {
    filter.frequency.value = (200 * scaledValue) / 0.05;
  } else {
    filter.frequency.value = 200 * Math.pow(10, 2 * scaledValue);
  }
}

// ------- ORIENTATION
const accel = new Accelerometer({ frequency: 60 });
const gyro = new Gyroscope({ frequency: 60 });

let pitchAccel = 0;
let pitchGyro = 0;
let pitch = 0;
let pitchAlpha = 0.95;
let tiltAccel = 0;
let tiltGyro = 0;
let tilt = 0;
let tiltAlpha = 0.8;
let updateCounter = 0;

// Accelerometer update
accel.addEventListener("reading", () => {
  // update pitch from accelerometers reading
  const az = accel.z / 9.81;
  pitchAlpha = 0.8 + (0.2 * pitch) / 1.57;
  pitchAccel = Math.asin(az) || pitchAccel;
  pitch = pitchAlpha * pitchGyro + (1 - pitchAlpha) * pitchAccel;

  // update tilt from accelerometers reading
  const ax = accel.x / 9.81;
  const ay = accel.y / 9.81;
  tiltAccel = Math.atan2(ay, Math.sqrt(az ** 2 + ax ** 2));
  tilt = tiltAlpha * tiltGyro + (1 - tiltAlpha) * tiltAccel;

  // check if gyro has been updated
  updateCounter++;
  if (updateCounter == 2) {
    rotateLogo(-tilt);
    updateSpeed(pitch);
    updateCounter = 0;
  }
});

// Gyroscope update
let timeGyro = audioContext.currentTime;
gyro.addEventListener("reading", () => {
  // get elapsed time since last reading
  const currentTime = audioContext.currentTime;
  const dt = currentTime - timeGyro;
  timeGyro = currentTime;

  // update pitch from gyroscopes reading
  const gy = gyro.y * dt;
  pitchGyro = pitch + gy;
  pitch = pitchAlpha * pitchGyro + (1 - pitchAlpha) * pitchAccel;

  // update tilt from gyroscopes reading
  const gz = gyro.z * dt;
  tiltGyro = tilt - gz;
  tilt = tiltAlpha * tiltGyro + (1 - tiltAlpha) * tiltAccel;

  // check if accelero has been updated
  updateCounter++;
  if (updateCounter == 2) {
    rotateLogo(-tilt);
    updateSpeed(pitch);
    updateCounter = 0;
  }
});

// -------- SPEED
const pedalCenter = 45; // deg
const pedalMaxDiff = 30; // deg
const pedalMinDiff = 10; // deg
const maxSpeed = 180; // km/h
const upResponseTime = (5 * 0.66 * maxSpeed) / 100; // 0 - 100 km/h time
const downResponseTime = (3 * maxSpeed) / 100; // 100 - 0 km/h time
let speed = 0;
let acceleration = 0;
let timeSpeed = audioContext.currentTime;

function updateSpeed(pedalAngle) {
  const currentTime = audioContext.currentTime;
  const dt = currentTime - timeSpeed;
  timeSpeed = currentTime;

  const pedalAngleDeg = (pedalAngle * 180) / Math.PI;
  if (pedalAngleDeg > pedalCenter) {
    // positive acceleration
    acceleration = Math.min((pedalAngleDeg - pedalCenter) / pedalMaxDiff, 1);
    speed += (acceleration * dt * (maxSpeed - speed)) / upResponseTime;
  } else {
    // negative acceleration
    acceleration = Math.max((pedalAngleDeg - pedalCenter) / pedalMinDiff, -1);
    speed = speed + (maxSpeed * acceleration * dt) / downResponseTime;
  }

  speed = Math.max(Math.min(speed, 180), 0);
  setSpeed(speed);
}

// ------- USER INTERFACE

funnyFullScreen.enable(); // user can toggle fullscreen with two fingers

accel.start();
gyro.start();

render(
  html`
    <h1 id="print"></h1>

    <div class="main-row">
      <div class="central-elements">
        <h1 id="speed">0</h1>
        <h1 id="unit">km/h</h1>
      </div>

      <div class="central-elements">
        <img id="logo" src="assets/logo.svg" />
        <!-- <img id="logo" src="assets/logo.png"/> -->
      </div>

      <div class="central-elements">
        <img id="limite" src="assets/limite.svg" />
      </div>
    </div>
  `,
  document.body
);

function display(message) {
  document.getElementById("print").innerText = message;
}

function rotateLogo(angle) {
  document.getElementById("logo").style.setProperty("rotate", `${angle}rad`);
}

function setSpeed(value) {
  document.getElementById("speed").innerText = Math.round(value);
}
