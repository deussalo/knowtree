// PollingManager — setTimeout-based polling utility.
// Next poll starts after previous response completes.

class PollingManager {
  constructor() {
    this._polls = {};
  }

  start(name, fn, interval) {
    this.stop(name);
    const poll = { active: true };
    this._polls[name] = poll;

    const run = async () => {
      if (!poll.active) return;
      try {
        await fn();
      } catch (e) {
        // Silently retry on next interval
      }
      if (poll.active) {
        poll.timer = setTimeout(run, interval);
      }
    };
    run();
  }

  stop(name) {
    const poll = this._polls[name];
    if (poll) {
      poll.active = false;
      if (poll.timer) clearTimeout(poll.timer);
      delete this._polls[name];
    }
  }

  stopAll() {
    for (const name of Object.keys(this._polls)) {
      this.stop(name);
    }
  }
}
