import { execSync } from "child_process";
import * as fs from "fs";
import * as osc from "./osc";

export default class FTrace {
  private _running = false;
  constructor(readonly events: string[]) {}

  public async init() {
    const promises: Promise<any>[] = [];

    try {
      execSync("mount -t tracefs tracefs /sys/kernel/tracing");
    } catch (error) {
      // already mounted
    }

    await this.stop();

    for (const event of this.events) {
      promises.push(this._enableEvent(event));
    }

    return Promise.all(promises);
  }

  async start() {
    this._running = true;
    await this._setParameter("tracing_on", "1");
  }

  stop() {
    this._running = false;
    const promises: Promise<any>[] = [];
    promises.push(this._setParameter("tracing_on", "0"));
    promises.push(this._setParameter("current_tracer", "nop"));
    promises.push(this._setParameter("trace", "-1"));
    promises.push(this._setParameter("set_event", ""));

    return Promise.all(promises);
  }

  private async _enableEvent(name: string) {
    const path = `events/${name}/enable`;
    this._setParameter(path, "1");
  }

  private async _setParameter(name: string, arg: string) {
    const path = "/sys/kernel/tracing/" + name;
    await fs.promises.writeFile(path, arg);
  }

  async readTrace() {
    const path = "/sys/kernel/tracing/trace_pipe";
    const f = await fs.promises.open(path, "r");
    let numEvents = 0;
    let totalNumEvents = 0;
    let numEventsPerSecond = 0;
    let lastDate = new Date();
    while (this._running) {
      const buffer = await f.read({ length: 1024 });
      for (const line of buffer.buffer.toString("utf-8").split("\n")) {
        numEvents += 1;
        totalNumEvents += 1;
        numEventsPerSecond += 1;
        const event = this._parseLine(line);
        if (event) osc.send(event, { address: "/ftrace" });
      }
      numEvents = 0;

      if (new Date().getTime() - lastDate.getTime() >= 1000) {
        lastDate = new Date();
        // console.log(
        //   `Events per second: ${numEventsPerSecond}/s (events: ${totalNumEvents})`
        // );
        numEventsPerSecond = 0;
      }
    }
  }

  private _parseLine(line: string) {
    const process = line.substring(0, 16).trim();
    const pid = parseInt(line.substring(17, 23).trim());
    let pid_offset = 0;
    if (line.substring(23, 24) == " ") {
      pid_offset = 6;
    } else if (line.substring(23, 24) == "[") {
      pid_offset = 5;
    } else {
      // throw new Error("Wrong pid index");
      return;
    }
    const cpu = parseInt(
      line.substring(20 + pid_offset, 22 + pid_offset).trim()
    );
    const timestamp = parseFloat(
      line.substring(30 + pid_offset, 41 + pid_offset).trim()
    );

    const event = line.substring(45 + pid_offset, line.length).trim();
    return { process, timestamp, event, pid, cpu };
  }
}
