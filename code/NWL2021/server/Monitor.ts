import { Server, Socket } from "socket.io";
import { event as dbEvent } from "./database/database";
import { MonitoringEvent } from "./types";

import asyncHooks from "async_hooks";

export default class Monitor {
  constructor(readonly io: Server) {
    io.of("component").on("connection", (socket) =>
      this._componentConnect(socket)
    );
    io.of("visualization").on("connection", (socket) =>
      this._visualizationConnect(socket)
    );
    dbEvent.subscribe((event) => this.send(event));

    const monitor = this;
    const asyncHook = asyncHooks.createHook({
      init(asyncId, type, triggerAsyncId) {
        if (type != "TickObject")
          monitor.send({
            origin: "node",
            action: "async init " + type,
          });
      },
    });
    asyncHook.enable();
  }

  private _componentConnect(socket: Socket): void {
    socket.on("event", (data) => this.send(data as MonitoringEvent));
  }

  private _visualizationConnect(socket: Socket): void {
    console.log("visualization connected");
  }

  public send(event: MonitoringEvent) {
    this.io.of("visualization").emit("event", event);
  }
}
