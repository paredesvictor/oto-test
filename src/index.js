import { html, render } from "lit";
import "@ircam/sc-components";

import resumeAudioContext from "../lib/resume-audio-context.js";
import funnyFullScreen from "../lib/funny-full-screen.js";
import { AudioGraph } from "./audioManager.js";
import { SpeedScenario, TurnScenario } from "./scenario.js";

// ------- AUDIO GRAPH ---------------------
const audioContext = new AudioContext();
await resumeAudioContext(audioContext);
const audioGraph = new AudioGraph(audioContext);
audioGraph.initializeGraph();
audioGraph.changeLimit(0);
audioGraph.mute();

// ------- FULLSCREEN ---------------------
funnyFullScreen.enable();
document.documentElement.requestFullscreen();

// ------- SENSORS --------------------------
const accel = new Accelerometer({ frequency: 60 });
const gyro = new Gyroscope({ frequency: 60 });
accel.start();
gyro.start();

// ------- SCENARI ---------------------------
const speedScenario = new SpeedScenario(
  [
    [30, 15],
    [50, 10],
    [80, 10],
    [130, 25],
    [80, 20],
    [50, 20],
    [0, 10],
  ],
  (speed) => {
    changeLimitSign(speed);
    audioGraph.changeLimit(speed);
    audioGraph.play("limitChange");
    hideNextSign();
  },
  (speed) => {
    changeNextSign(speed);
    audioGraph.play("nextLimit");
    setTimeout(() => audioGraph.changeLimitRamp(speed), 2000);
  },
);

const turnScenario = new TurnScenario(
  [
    ["front", 15],
    // ["left", 5],
    // ["front", 5],
    // ["right", 5],
    // ["front", 45],
    // ["left", 5],
    // ["front", 20],
    // ["left", 5],
    // ["front", 5],
    // ["right", 5],
    // ["front", 10],
    // ["right", 5],
    // ["front", 35],
    // ["right", 5],
    // ["front", 10],
  ],
  (direction) => changeTurnSign(direction),
  (_) => {},
);

// ------ VISUAL INTERFACE ----------------------
render(
  html`
    <div id="main-column">
      <div id="main-row">
        <div id="left-elements">
          <img id="logo" src="assets/LogoBlancOTO.svg" />
          <div id="button-row">
            <sc-button @press=${setBrakeBound}></sc-button>
            <sc-button @press=${setCenter}></sc-button>
            <sc-button @press=${setAccelBound}></sc-button>
          </div>
          <sc-toggle
            id="hide-button"
            @change=${hideSpeed}
          ></sc-toggle>
        </div>

        <div id="central-elements">
          <div id="arrow-container">
            <img class="arrow" id="left" src="assets/turn_left.svg" />
            <img class="arrow" id="front" src="assets/turn_front.svg" />
            <img class="arrow" id="right" src="assets/turn_right.svg" />
          </div>
          <h1 id="speed">0</h1>
          <h1 id="unit">km/h</h1>
        </div>

        <div id="right-elements">
          <div id="next-sign-container">
            <img class="next-sign" id="n0" src="assets/limite_0.svg" />
            <img class="next-sign" id="n30" src="assets/limite_30.svg" />
            <img class="next-sign" id="n50" src="assets/limite_50.svg" />
            <img class="next-sign" id="n80" src="assets/limite_80.svg" />
            <img class="next-sign" id="n110" src="assets/limite_110.svg" />
            <img class="next-sign" id="n130" src="assets/limite_130.svg" />
          </div>
          <div id="limit-sign-container">
            <img class="limit-sign" id="l0" src="assets/limite_0.svg" />
            <img class="limit-sign" id="l30" src="assets/limite_30.svg" />
            <img class="limit-sign" id="l50" src="assets/limite_50.svg" />
            <img class="limit-sign" id="l80" src="assets/limite_80.svg" />
            <img class="limit-sign" id="l110" src="assets/limite_110.svg" />
            <img class="limit-sign" id="l130" src="assets/limite_130.svg" />
          </div>
        </div>
      </div>

      <div id="footer-row">
        <sc-toggle
          id="startup-button"
          @change=${toggleButtonCallBack}
        ></sc-toggle>
      </div>
    </div>
  `,
  document.body
);

function hideSpeed(event) {
  const opacity = event.detail.value ? 0 : 1;
  document.getElementById('speed').style.setProperty('opacity',opacity);
  document.getElementById('unit').style.setProperty('opacity',opacity);
}

function buttonOn(active) {
  if (active) {
    document.getElementById("right-elements").style.setProperty("opacity", 1);
    document
      .getElementById("startup-button")
      .style.setProperty("filter", "var(--white-filter)");
    document.getElementById('arrow-container').style.setProperty('opacity', 0.8);
  } else {
    document.getElementById("right-elements").style.setProperty("opacity", 0);
    document
      .getElementById("startup-button")
      .style.setProperty("filter", "var(--red-filter)");
    changeTurnSign('front')
    document.getElementById('arrow-container').style.setProperty('opacity', 0.1);
  }
}

function display(message) {
  document.getElementById("print").innerText = message;
}

function rotateMain(angle) {
  const roundedAngle = Math.round(angle * 1000) / 1000;
  document
    .getElementById("main-column")
    .style.setProperty("rotate", `${roundedAngle / 10}rad`);
}

function changeTurnSign(direction) {
  const signElements = document.getElementsByClassName("arrow");
  for (let i = 0; i < signElements.length; i++) {
    signElements[i].style.setProperty("opacity", 0);
  }
  document.getElementById(direction).style.setProperty("opacity", 1);
}

function setSpeed(value) {
  document.getElementById("speed").innerText = Math.round(value + 1);
}

function changeLimitSign(speed) {
  const signElements = document.getElementsByClassName("limit-sign");
  for (let i = 0; i < signElements.length; i++) {
    signElements[i].style.setProperty("opacity", 0);
  }
  document.getElementById(`l${speed}`).style.setProperty("opacity", 1);
}

function changeNextSign(speed) {
  const signElements = document.getElementsByClassName("next-sign");
  for (let i = 0; i < signElements.length; i++) {
    signElements[i].style.setProperty("visibility", "hidden");
  }
  document
    .getElementById(`n${speed}`)
    .style.setProperty("visibility", "visible");
  document
    .getElementById("next-sign-container")
    .style.setProperty("opacity", 1);
}

function hideNextSign() {
  document
    .getElementById("next-sign-container")
    .style.setProperty("opacity", 0);
}

function rotateArrow(angle) {
  document.getElementById("arrow").style.setProperty("rotate", `${angle}rad`);
}

document.getElementById("startup-button").value = false;

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
const toggle = document.getElementById("startup-button");

const noSensorProcess = setInterval(() => {
  // const angle = document.getElementById("angle").value;
  // updateSpeed(angle);
}, 1000 / 60);
const noSensor = true;

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

  updateCounter += 1;
  if (toggle.value && updateCounter >= 2) {
    rotateMain(-tilt);
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

  updateCounter += 1;
  if (toggle.value && updateCounter >= 2) {
    rotateMain(-tilt);
    updateSpeed(pitch);
    audioGraph.updatePan(tilt);
    updateCounter = 0;
  }
});

// -------- SPEED -------------------
let pedalCenter = 32; // deg
const pedalDeadzone = 1.5; //deg
let pedalMaxDiff = 4; // deg
let pedalMinDiff = 15; // deg
const maxSpeed = 180; // km/h
const upResponseTime = (8 * 0.66 * maxSpeed) / 100; // 0 - 100 km/h time
const downResponseTime = (3 * maxSpeed) / 100; // 100 - 0 km/h time
let speed = -1;
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
      -1
    );
    speed = newSpeed;
  } else {
    input = 0;
  }

  setSpeed(speed);
  audioGraph.updateSpeed(Math.max(0, speed), dt, input);
}

function setCenter(event) {
  const angle = 180 * pitch / Math.PI;
  pedalCenter = angle;
}

function setBrakeBound(event) {
  const angle = 180 * pitch / Math.PI;
  if (angle > pedalCenter + pedalDeadzone / 2) {
    pedalMaxDiff = angle - pedalCenter - pedalDeadzone / 2;
  }
}

function setAccelBound(event) {
  const angle = 180 * pitch / Math.PI;
  if (angle < pedalCenter - pedalDeadzone / 2) {
    pedalMinDiff = pedalCenter - pedalDeadzone / 2 - angle;
  }
}

// --------- STARTUP BUTTON -------------
function toggleButtonCallBack(event) {
  timeSpeed = audioContext.currentTime;
  audioGraph.mute(!event.detail.value);
  if (event.detail.value) {
    console.log("started");
    speedScenario.start();
    turnScenario.start();
    audioGraph.play("turnOn");
    buttonOn(true);
  } else {
    console.log("stopped");
    buttonOn(false);
    speed = -1;
    setSpeed(speed);
    speedScenario.stop();
    turnScenario.stop();
    audioGraph.play("turnOff");
  }
}
