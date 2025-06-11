import { html, render } from "lit";
import "@ircam/sc-components";

import resumeAudioContext from "../lib/resume-audio-context.js";
import funnyFullScreen from "../lib/funny-full-screen.js";
import { AudioGraph } from "./audioManager.js";
import { Scenario } from "./scenario.js";

// ------- AUDIO GRAPH ---------------------
const audioContext = new AudioContext();
await resumeAudioContext(audioContext);
const audioGraph = new AudioGraph(audioContext);
audioGraph.initializeGraph();
audioGraph.changeLimit(0);

// ------- SENSORS --------------------------
const accel = new Accelerometer({ frequency: 60 });
const gyro = new Gyroscope({ frequency: 60 });
funnyFullScreen.enable();

// ------ VISUAL INTERFACE ----------------------
render(
  html`

    <div class="main-row">
      <div class="left-element">
        <img id="logo" src="assets/LogoBlancOTO.svg"/>
        <h1 id="print"></h1>
      </div>

      <div class="central-column">
        <div class="central-elements">
          <img id="arrow" src="assets/RondFleche_1.svg" />
          <h1 id="speed">0</h1>
          <h1 id="unit">km/h</h1>
        </div> 
      </div>

      <div class="right-elements">
        <div id="next-sign">
          <img src="assets/limite_30.svg" style="width: 25%" />
        </div>
        <img id="limit-sign" src="assets/limite_130.svg" />
      </div>
    </div>

    <div class="footer-row">
      <div class="button-image">
        <sc-toggle
          class="footer-button"
          id="on-off"
          @change=${(e) => {
            timeSpeed = audioContext.currentTime;
            audioGraph.mute(!e.detail.value);
            if (e.detail.value) {
              console.log("started");
              accel.start();
              gyro.start();
            } else {
              console.log("stopped");
              accel.stop();
              gyro.stop();
              speed = 0;
              updateSpeed(speed);
            }
          }}
        ></sc-toggle>
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

function changeLimitSign(speed) {
  document.getElementById("limit-sign").src = `assets/limite_${speed}.svg`;
}

function rotateArrow(angle) {
  document.getElementById("arrow").style.setProperty("rotate", `${angle}rad`);
}

document.getElementById('on-off').value = false;
 
const noSensorProcess = setInterval(() => {
  // const angle = document.getElementById("angle").value;
  // updateSpeed(angle);
}, 1000 / 60);
const noSensor = true;

// ------- SCENARI ---------------------------
const speedScenario = new Scenario(
  [
    // [30, 10],
    // [50, 10],
    // [80, 10],
    // [90, 10],
    // [110, 10],
    // [130, 10],
    // [80, 10],
    [80, 10],
    [50, 10],
  ],
  (speed) => {
    changeLimitSign(speed);
    audioGraph.changeLimit(speed);
  },
  true
);
speedScenario.start();
display('test');

// ------- ORIENTATION -------------------

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
  if (noSensor) {
    window.clearInterval(noSensorProcess);
  }

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
    display(pitch * 180 / Math.PI);
    rotateLogo(-tilt);
    updateHeading(tilt);
    updateSpeed(pitch);
    audioGraph.updatePan(tilt);
    updateCounter = 0;
  }
});

// Gyroscope update
let timeGyro = audioContext.currentTime;
gyro.addEventListener("reading", () => {
  if (noSensor) {
    window.clearInterval(noSensorProcess);
  }

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
    display(pitch * 180 / Math.PI);
    rotateLogo(-tilt);
    updateSpeed(pitch);
    updateHeading(tilt);
    audioGraph.updatePan(tilt);
    updateCounter = 0;
  }
});

// -------- SPEED -------------------
const pedalCenter = 47; // deg
const pedalDeadzone = 4; //deg
const pedalMaxDiff = 10; // deg
const pedalMinDiff = 15; // deg
const maxSpeed = 180; // km/h
const upResponseTime = (5 * 0.66 * maxSpeed) / 100; // 0 - 100 km/h time
const downResponseTime = (3 * maxSpeed) / 100; // 100 - 0 km/h time
let speed = 0;
let timeSpeed = audioContext.currentTime;
let input = 0;

function updateSpeed(pedalAngle) {
  const currentTime = audioContext.currentTime;
  const dt = currentTime - timeSpeed;
  timeSpeed = currentTime;

  const pedalAngleDeg = (pedalAngle * 180) / Math.PI;
  // if (pedalAngleDeg > pedalCenter + pedalDeadzone / 2) {
  //   // positive acceleration
  //   input = (pedalAngleDeg - pedalCenter - pedalDeadzone / 2) / pedalMaxDiff;
  //   input = Math.min(input, 1);
  //   speed += (input * dt * (maxSpeed - speed)) / upResponseTime;
  //   speed = Math.min(speed, 180);
  // } else if (pedalAngleDeg < pedalCenter - pedalDeadzone / 2) {
  //   // negative acceleration
  //   input = (pedalAngleDeg - pedalCenter + pedalDeadzone / 2) / pedalMaxDiff;
  //   input = Math.max(input, -1);
  //   const newSpeed = Math.max(
  //     speed + (maxSpeed * input * dt) / downResponseTime,
  //     0
  //   );
  // }
  if (pedalAngleDeg < pedalCenter - pedalDeadzone / 2) {
    // positive acceleration
    input = -(pedalAngleDeg - pedalCenter + pedalDeadzone / 2) / pedalMinDiff;
    input = Math.min(input, 1);
    speed += (input * dt * (maxSpeed - speed)) / upResponseTime;
    speed = Math.min(speed, 180);
  } else if (pedalAngleDeg > pedalCenter + pedalDeadzone / 2) {
    // negative acceleration
    input = -(pedalAngleDeg - pedalCenter - pedalDeadzone / 2) / pedalMaxDiff;
    input = Math.max(input, -1);
    const newSpeed = Math.max(
      speed + (maxSpeed * input * dt) / downResponseTime,
      0
    );
    speed = newSpeed;
  }
  setSpeed(speed);
  audioGraph.updateSpeed(speed, dt, input);
}

// -------- ROTATION -------------------
let heading = 0;
let timeHeading = audioContext.currentTime;


function updateHeading(tilt) {
  const current = audioContext.currentTime;
  const dt = current - timeHeading;
  timeHeading = current;
  heading += tilt * dt;
  rotateArrow(heading);
}