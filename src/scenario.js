export class Scenario {
  constructor(steps, callBackNow, callBackSoon, loop = false) {
    this.events = [];
    this.durations = [];
    steps.forEach((step) => {
      this.events.push(step[0]);
      this.durations.push(1000 * step[1]);
    });

    this.callBackNow = callBackNow;
    this.callBackSoon = callBackSoon;
    this.loop = loop;

    this.initScenario();
  }

  initScenario() {
    this.currentSpeed = 0;
    this.currentDuration = 0;
    this.currentIndex = -1;
    this.currentTimerId = 0;
    this.soonTimerId = 0;
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

    if (this.currentIndex <= this.events.length - 2)  {
      this.soonTimerId = setTimeout(
        () => this.callBackSoon(this.events[this.currentIndex + 1]),
        this.currentDuration - 10000
      )
    } else {
      if (this.loop) {
        this.soonTimerId = setTimeout(
          () => this.callBackSoon(this.events[0]),
          this.currentDuration - 10000
        )
      } 
    }

    this.currentTimerId = setTimeout(
      () => this.nextStep(),
      this.currentDuration
    );
    this.callBackNow(this.currentSpeed);
  }

  start() {
    this.nextStep();
  }

  pause() {
    clearTimeout(this.currentTimerId);
    clearTimeout(this.soonTimerId);
    this.elapsedTime = Date.now() - this.refTime;
  }

  resume() {
    // todo : start the "soon" timer
    this.refTime = Date.now();
    this.currentTimerId = setTimeout(
      () => this.nextStep(),
      this.currentDuration - this.elapsedTime
    );
  }

  stop() {
    clearTimeout(this.currentTimerId);
    clearTimeout(this.soonTimerId);
    this.initScenario();
  }
}
