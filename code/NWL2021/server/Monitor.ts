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

    const asyncType = {};
    const asyncHook = asyncHooks.createHook({
      init(asyncId, type, triggerAsyncId) {
        if (type != "TickObject") asyncType[asyncId] = type;
      },
      after(asyncId) {
        if (asyncType[asyncId])
          monitor.send({
            origin: "node",
            action: "async after " + asyncType[asyncId],
          });
        delete asyncType[asyncId];
      },
      destroy(asyncId) {
        delete asyncType[asyncId];
      },
      promiseResolve(asyncId) {
        if (asyncType[asyncId])
          monitor.send({
            origin: "node",
            action: "promiseResolve " + asyncType[asyncId],
          });
        delete asyncType[asyncId];
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
