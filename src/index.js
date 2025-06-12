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

// ------- SENSORS --------------------------
const accel = new Accelerometer({ frequency: 60 });
const gyro = new Gyroscope({ frequency: 60 });
funnyFullScreen.enable();
document.documentElement.requestFullscreen();

// ------- SCENARI ---------------------------
const speedScenario = new SpeedScenario(
  [
    // [30, 20],
    // [50, 40],
    // [80, 40],
    // [110, 40],
    // [80, 40],
    // [130, 40],
    // [80, 15],
    // [50, 15],
    [50, 15],
    [30, 10],
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
  true
);

const turnScenario = new TurnScenario(
  [
    [0, 30],
    [-10, 10],
    [10, 30],
    [15, 30],
  ],
  (angle) => (heading = (Math.PI * angle) / 180),
  (angle) => {}
);

accel.start();
gyro.start();

// ------ VISUAL INTERFACE ----------------------
render(
  html`
    <div id="main-column">
      <div id="main-row">
        <div id="left-elements">
          <img id="logo" src="assets/LogoBlancOTO.svg" />
          <h1 id='print'></h1>
        </div>

        <div id="central-column">
          <div id="central-elements">
            <img id="arrow" src="assets/RondFleche_1.svg" />
            <h1 id="speed">0</h1>
            <h1 id="unit">km/h</h1>
          </div>
        </div>

        <div id="right-elements">
          <div id="next-sign-container">
            <img id="next-sign" src="assets/limite_30.svg" />
          </div>
          <img id="limit-sign" src="assets/limite_130.svg" />
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

function buttonOn(active) {
  if (active) {
    document.getElementById("right-elements").style.setProperty("opacity", 1);
    document
      .getElementById("startup-button")
      .style.setProperty("filter", "var(--white-filter)");
  } else {
    document.getElementById("right-elements").style.setProperty("opacity", 0);
    document
      .getElementById("startup-button")
      .style.setProperty("filter", "var(--red-filter)");
  }
}

function display(message) {
  document.getElementById("print").innerText = message;
}

function rotateLogo(angle) {
  document
    .getElementById("main-column")
    .style.setProperty("rotate", `${angle / 15}rad`);
}

function setSpeed(value) {
  document.getElementById("speed").innerText = Math.round(value + 1);
}

function changeLimitSign(speed) {
  document.getElementById("limit-sign").src = `assets/limite_${speed}.svg`;
}

function changeNextSign(speed) {
  document.getElementById("next-sign").src = `assets/limite_${speed}.svg`;
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
let tiltAlpha = 0.95;
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

  if (toggle.value) {
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

  if (toggle.value) {
    rotateLogo(-tilt);
    updateSpeed(pitch);
    updateHeading(tilt);
    audioGraph.updatePan(tilt);
    updateCounter = 0;
  }
});

// -------- SPEED -------------------
const pedalCenter = 56; // deg
const pedalDeadzone = 4; //deg
const pedalMaxDiff = 6; // deg
const pedalMinDiff = 20; // deg
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
  } else {
    input = 0;
  }
  
  setSpeed(speed);
  audioGraph.updateSpeed(speed, dt, input);
}

// -------- ROTATION -------------------
let timeHeading = audioContext.currentTime;
let heading = 0;

function updateHeading(tilt) {
  const current = audioContext.currentTime;
  const dt = current - timeHeading;
  timeHeading = current;
  heading -= tilt * dt;
  rotateArrow(heading);
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
    speed = 0;
    updateSpeed(speed);
    speedScenario.stop();
    turnScenario.stop();
    audioGraph.play("turnOff");
    buttonOn(false);
  }
}