export class Scenario {
  constructor(steps, callBack, loop = false) {
    this.events = [];
    this.durations = [];
    steps.forEach((step) => {
      this.events.push(step[0]);
      this.durations.push(1000 * step[1]);
    });

    this.callBack = callBack;
    this.loop = loop;

    this.initScenario();
  }

  initScenario() {
    this.currentSpeed = 0;
    this.currentDuration = 0;
    this.currentIndex = -1;
    this.currentTimerId = 0;
    this.stepElapsed = 0;
    this.refTime = 0;
  }

  nextStep() {
    if (this.currentIndex === this.events.length - 1) {
      this.initScenario();
      if (this.loop) {
        this.start();
      }
      return;
    }

    this.refTime = Date.now();

    this.currentIndex += 1;
    this.currentSpeed = this.events[this.currentIndex];
    this.currentDuration = this.durations[this.currentIndex];

    this.currentTimerId = setTimeout(
      () => this.nextStep(),
      this.currentDuration
    );

    this.callBack(this.currentSpeed);
  }

  start() {
    this.nextStep();
  }

  pause() {
    clearTimeout(this.currentTimerId);
    this.elapsedTime = Date.now() - this.refTime;
  }

  resume() {
    this.refTime = Date.now();
    this.currentTimerId = setTimeout(
      () => this.nextStep(),
      this.currentDuration - this.elapsedTime
    );
  }

  stop() {
    clearTimeout(this.currentTimerId);
    this.initScenario();
  }
}
