(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.subEvents = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventConsumer = void 0;
var utils_1 = require("./utils");
/**
 * Private-property implementation.
 *
 * @hidden
 */
var pp = new utils_1.Private();
/**
 * ### class EventConsumer\<T = unknown, E extends SubEvent\<T\> = SubEvent\<T\>>
 *
 * Encapsulates an event object, in order to hide its methods [[emit]] and [[cancelAll]], so the event
 * consumer can only receive the event, but cannot emit it, or cancel other subscriptions.
 *
 * It is a non-extendable class, with the same signature as [[SubEvent]], minus methods [[emit]] and [[cancelAll]].
 *
 * ```ts
 * // Example of using EventConsumer inside a component.
 *
 * import {SubEvent, EventConsumer} from 'sub-events';
 *
 * class MyComponent {
 *
 *     private event: SubEvent<string> = new SubEvent(); // internal, send-receive event
 *
 *     readonly safeEvent: EventConsumer<string>; // public, receive-only event container
 *
 *     constructor() {
 *        this.safeEvent = new EventConsumer(this.event);
 *
 *        // or even simpler:
 *        // this.safeEvent = this.event.toConsumer();
 *
 *        // clients can only receive data from such "safeEvent",
 *        // they cannot emit data or cancel other subscriptions.
 *     }
 * }
 * ```
 */
var EventConsumer = /** @class */ (function () {
    /**
     * Class Constructor.
     *
     * @param event
     * Event object to be encapsulated.
     */
    function EventConsumer(event) {
        pp.set(this, event);
    }
    Object.defineProperty(EventConsumer.prototype, "count", {
        /**
         * Forwards into [[SubEvent.count]] of the contained event.
         */
        get: function () {
            return pp.get(this).count;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(EventConsumer.prototype, "maxSubs", {
        /**
         * Forwards into [[SubEvent.maxSubs]] of the contained event.
         */
        get: function () {
            return pp.get(this).maxSubs;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Forwards into [[SubEvent.subscribe]] of the contained event.
     */
    EventConsumer.prototype.subscribe = function (cb, options) {
        return pp.get(this).subscribe(cb, options);
    };
    /**
     * Forwards into [[SubEvent.once]] of the contained event.
     */
    EventConsumer.prototype.once = function (cb, options) {
        return pp.get(this).once(cb, options);
    };
    /**
     * Forwards into [[SubEvent.toPromise]] of the contained event.
     */
    EventConsumer.prototype.toPromise = function (options) {
        return pp.get(this).toPromise(options);
    };
    /**
     * Forwards into [[SubEvent.getStat]] of the contained event.
     */
    EventConsumer.prototype.getStat = function (options) {
        return pp.get(this).getStat(options);
    };
    return EventConsumer;
}());
exports.EventConsumer = EventConsumer;

},{"./utils":6}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubEventCount = void 0;
var tslib_1 = require("tslib");
var event_1 = require("./event");
/**
 * ### class SubEventCount\<T = unknown\> extends SubEvent\<T\>
 *
 * Extends [[SubEvent]] with event [[onCount]], to observe the number of subscriptions.
 */
var SubEventCount = /** @class */ (function (_super) {
    tslib_1.__extends(SubEventCount, _super);
    /**
     * @constructor
     * Event constructor.
     *
     * @param options
     * Configuration Options.
     */
    function SubEventCount(options) {
        var _this = _super.call(this, options) || this;
        /**
         * Triggered on any change in the number of subscriptions.
         * @event onCount
         */
        _this.onCount = new event_1.SubEvent();
        var eo = options && options.emitOptions;
        _this._notify = function (data) { return _this.onCount.emit(data, eo); };
        return _this;
    }
    /**
     * Cancels all existing subscriptions for the event.
     *
     * It overrides the base implementation, to trigger event [[onCount]]
     * when there was at least one subscription.
     *
     * @returns
     * Number of subscriptions cancelled.
     *
     * @see [[cancel]]
     */
    SubEventCount.prototype.cancelAll = function () {
        var prevCount = this.count;
        if (prevCount) {
            _super.prototype.cancelAll.call(this);
            this._notify({ newCount: 0, prevCount: prevCount });
        }
        return prevCount;
    };
    /**
     * Overrides base implementation, to trigger event [[onCount]] during
     * `subscribe` and `cancel` calls.
     * @hidden
     */
    SubEventCount.prototype._createCancel = function (sub) {
        var _this = this;
        var s = this._subs;
        this._notify({ newCount: s.length, prevCount: s.length - 1 });
        return function () {
            _this._cancelSub(sub);
            _this._notify({ newCount: s.length, prevCount: s.length + 1 });
        };
    };
    return SubEventCount;
}(event_1.SubEvent));
exports.SubEventCount = SubEventCount;

},{"./event":3,"tslib":9}],3:[function(require,module,exports){
(function (process){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubEvent = exports.EmitSchedule = void 0;
var tslib_1 = require("tslib");
var sub_1 = require("./sub");
var consumer_1 = require("./consumer");
/**
 * Schedule for emitting / broadcasting data to subscribers, to be used by method [[emit]].
 * It represents a concurrency strategy for delivering event to subscribers.
 */
var EmitSchedule;
(function (EmitSchedule) {
    /**
     * Data is sent to all subscribers synchronously / immediately.
     *
     * This is the default schedule.
     */
    EmitSchedule["sync"] = "sync";
    /**
     * Data broadcast is fully asynchronous: each subscriber will be receiving the event
     * within its own processor tick (under Node.js), or timer tick (in browsers).
     *
     * Subscribers are enumerated after the initial delay.
     */
    EmitSchedule["async"] = "async";
    /**
     * Wait for the next processor tick (under Node.js), or timer tick (in browsers),
     * and then broadcast data to all subscribers synchronously.
     *
     * Subscribers are enumerated after the delay.
     */
    EmitSchedule["next"] = "next";
})(EmitSchedule = exports.EmitSchedule || (exports.EmitSchedule = {}));
/**
 * ### class SubEvent\<T = unknown\>
 *
 * @class SubEvent
 * @description
 * Core class, implementing event subscription + emitting the event.
 *
 * @see [[subscribe]], [[emit]]
 */
var SubEvent = /** @class */ (function () {
    /**
     * @constructor
     * Event constructor.
     *
     * @param options
     * Configuration Options.
     */
    function SubEvent(options) {
        /**
         * Internal list of subscribers.
         * @hidden
         */
        this._subs = [];
        if (typeof (options !== null && options !== void 0 ? options : {}) !== 'object') {
            throw new TypeError(Stat.errInvalidOptions);
        }
        this.options = options !== null && options !== void 0 ? options : {};
    }
    /**
     * Returns a new [[EventConsumer]] for the event, which physically hides methods [[emit]] and [[cancelAll]].
     *
     * This method simplifies creation of a receive-only event object representation.
     *
     * ```ts
     * const e = new SubEvent<number>(); // full-access, emit-receive event
     *
     * const c = e.toConsumer(); // the same "e" event, but with receive-only access
     *
     * // It is equivalent to the full syntax of:
     * // const c = new EventConsumer<number>(e);
     * ```
     */
    SubEvent.prototype.toConsumer = function () {
        return new consumer_1.EventConsumer(this);
    };
    /**
     * Subscribes to the event.
     *
     * When subscription is no longer needed, method [[cancel]] should be called on the
     * returned object, to avoid performance degradation caused by abandoned subscribers.
     *
     * Method [[getStat]] can help with diagnosing leaked subscriptions.
     *
     * @param cb
     * Event notification callback function.
     *
     * @param options
     * Subscription Options.
     *
     * @returns
     * Object for cancelling the subscription safely.
     *
     * @see [[once]]
     */
    SubEvent.prototype.subscribe = function (cb, options) {
        if (typeof (options !== null && options !== void 0 ? options : {}) !== 'object') {
            throw new TypeError(Stat.errInvalidOptions);
        }
        cb = options && 'thisArg' in options ? cb.bind(options.thisArg) : cb;
        var cancel = function () {
            if (options && typeof options.onCancel === 'function') {
                options.onCancel();
            }
        };
        var name = options && options.name;
        var sub = { event: this, cb: cb, name: name, cancel: cancel };
        if (typeof this.options.onSubscribe === 'function') {
            var ctx = { event: sub.event, name: sub.name, data: sub.data };
            this.options.onSubscribe(ctx);
            sub.data = ctx.data;
        }
        this._subs.push(sub);
        return new sub_1.Subscription({ cancel: this._createCancel(sub), sub: sub });
    };
    /**
     * Subscribes to receive just one event, and cancel the subscription immediately.
     *
     * You may still want to call [[cancel]] on the returned [[Subscription]] object,
     * if you suddenly need to prevent the first event, or to avoid dead once-off
     * subscriptions that never received their event, and thus were not cancelled.
     *
     * @param cb
     * Event notification function, invoked after self-cancelling the subscription.
     *
     * @param options
     * Subscription Options.
     *
     * @returns
     * Object for cancelling the subscription safely.
     *
     * @see [[toPromise]]
     */
    SubEvent.prototype.once = function (cb, options) {
        var sub = this.subscribe(function (data) {
            sub.cancel();
            return cb.call(options && options.thisArg, data);
        }, options);
        return sub;
    };
    /**
     * Broadcasts data to all subscribers, according to the emit schedule,
     * which is synchronous by default.
     *
     * @param data
     * Data to be sent, according to the template type.
     *
     * @param options
     * Event-emitting options.
     *
     * @returns
     * The event object itself.
     */
    SubEvent.prototype.emit = function (data, options) {
        var _this = this;
        var _a;
        if (typeof (options !== null && options !== void 0 ? options : {}) !== 'object') {
            throw new TypeError(Stat.errInvalidOptions);
        }
        var schedule = (_a = (options && options.schedule)) !== null && _a !== void 0 ? _a : EmitSchedule.sync;
        var onFinished = options && typeof options.onFinished === 'function' && options.onFinished;
        var onError = options && typeof options.onError === 'function' && options.onError;
        var start = schedule === EmitSchedule.sync ? Stat.callNow : Stat.callNext;
        var middle = schedule === EmitSchedule.async ? Stat.callNext : Stat.callNow;
        start(function () {
            var r = _this._getRecipients();
            r.forEach(function (sub, index) { return middle(function () {
                if (onError) {
                    try {
                        var res = sub.cb && sub.cb(data);
                        if (res && typeof res.catch === 'function') {
                            res.catch(function (err) { return onError(err, sub.name); });
                        }
                    }
                    catch (e) {
                        onError(e, sub.name);
                    }
                }
                else {
                    sub.cb && sub.cb(data);
                }
                if (onFinished && index === r.length - 1) {
                    onFinished(r.length); // finished sending
                }
            }); });
        });
        return this;
    };
    Object.defineProperty(SubEvent.prototype, "count", {
        /**
         * Current number of live subscriptions.
         */
        get: function () {
            return this._subs.length;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(SubEvent.prototype, "maxSubs", {
        /**
         * Maximum number of subscribers that can receive events.
         * Default is 0, meaning `no limit applies`.
         *
         * Newer subscriptions outside of the maximum quota will start
         * receiving events when the older subscriptions get cancelled.
         *
         * It can only be set with the [[constructor]].
         */
        get: function () {
            var _a;
            return (_a = this.options.maxSubs) !== null && _a !== void 0 ? _a : 0;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Retrieves subscriptions statistics, to help with diagnosing subscription leaks.
     *
     * For this method to be useful, you need to set option `name` when calling [[subscribe]].
     *
     * See also: {@link https://github.com/vitaly-t/sub-events/wiki/Diagnostics Diagnostics}
     *
     * @param options
     * Statistics Options:
     *
     *  - `minUse: number` - Minimum subscription usage/count to be included into the list of named
     *     subscriptions. If subscription is used less times, it will be excluded from the `named` list.
     *
     * @see [[ISubStat]]
     */
    SubEvent.prototype.getStat = function (options) {
        var _a;
        var stat = { named: {}, unnamed: 0 };
        this._subs.forEach(function (s) {
            if (s.name) {
                if (s.name in stat.named) {
                    stat.named[s.name]++;
                }
                else {
                    stat.named[s.name] = 1;
                }
            }
            else {
                stat.unnamed++;
            }
        });
        var minUse = (_a = (options && options.minUse)) !== null && _a !== void 0 ? _a : 0;
        if (minUse > 1) {
            for (var a in stat.named) {
                if (stat.named[a] < minUse) {
                    delete stat.named[a];
                }
            }
        }
        return stat;
    };
    /**
     * Cancels all existing subscriptions for the event.
     *
     * This is a convenience method for some special cases, when you want to cancel all subscriptions
     * for the event at once. Usually, subscribers just call [[cancel]] when they want to cancel their
     * own subscription.
     *
     * This method will always offer much better performance than cancelling each subscription individually,
     * which may become increasingly important when working with a large number of subscribers.
     *
     * @returns
     * Number of subscriptions cancelled.
     *
     * @see [[cancel]]
     */
    SubEvent.prototype.cancelAll = function () {
        var onCancel = typeof this.options.onCancel === 'function' && this.options.onCancel;
        var copy = onCancel ? tslib_1.__spreadArray([], this._subs) : [];
        var n = this._subs.length;
        this._subs.forEach(function (sub) {
            sub.cancel();
            sub.cb = undefined; // prevent further emits
        });
        this._subs.length = 0;
        if (onCancel) {
            copy.forEach(function (c) {
                onCancel({ event: c.event, name: c.name, data: c.data });
            });
        }
        return n;
    };
    /**
     * Creates a new subscription as a promise, to resolve with the next received event value,
     * and cancel the subscription.
     *
     * Examples of where it can be useful include:
     * - verify that a fast-pace subscription keeps receiving data;
     * - peek at fast-pace subscription data for throttled updates;
     * - for simpler receive-once / signal async processing logic.
     *
     * ```ts
     * try {
     *     const nextValue = await myEvent.toPromise({timeout: 1000});
     * } catch(e) {
     *     // Either subscription didn't produce any event after 1 second,
     *     // or myEvent.cancelAll() was called somewhere.
     * }
     * ```
     *
     * The returned promise can reject in two cases:
     *  - when the timeout has been reached (if set via option `timeout`), it rejects with `Event timed out` error;
     *  - when [[cancelAll]] is called on the event object, it rejects with `Event cancelled` error.
     *
     * Note that if you use this method consecutively, you can miss events in between,
     * because the subscription is auto-cancelled after receiving the first event.
     *
     * @param options
     * Subscription Options:
     *
     * - `name` - for the internal subscription name. See `name` in [[ISubOptions]].
     *    In this context, it is also included within any rejection error.
     *
     * - `timeout` - sets timeout in ms (when `timeout` >= 0), to auto-reject with
     *    `Event timed out` error.
     *
     * @see [[once]]
     */
    SubEvent.prototype.toPromise = function (options) {
        var _this = this;
        if (typeof (options !== null && options !== void 0 ? options : {}) !== 'object') {
            throw new TypeError(Stat.errInvalidOptions);
        }
        var _a = options || {}, name = _a.name, _b = _a.timeout, timeout = _b === void 0 ? -1 : _b;
        var timer, selfCancel = false;
        return new Promise(function (resolve, reject) {
            var onCancel = function () {
                if (!selfCancel) {
                    if (timer) {
                        clearTimeout(timer);
                    }
                    reject(new Error(name ? "Event \"" + name + "\" cancelled." : "Event cancelled."));
                }
            };
            var sub = _this.subscribe(function (data) {
                if (timer) {
                    clearTimeout(timer);
                }
                selfCancel = true;
                sub.cancel();
                resolve(data);
            }, { name: name, onCancel: onCancel });
            if (Number.isInteger(timeout) && timeout >= 0) {
                timer = setTimeout(function () {
                    selfCancel = true;
                    sub.cancel();
                    reject(new Error(name ? "Event \"" + name + "\" timed out." : "Event timed out."));
                }, timeout);
            }
        });
    };
    /**
     * Gets all recipients that must receive data.
     *
     * It returns a copy of subscribers array for safe iteration, while applying the
     * maximum limit when it is set with the [[maxSubs]] option.
     *
     * @hidden
     */
    SubEvent.prototype._getRecipients = function () {
        var end = this.maxSubs > 0 ? this.maxSubs : this._subs.length;
        return this._subs.slice(0, end);
    };
    /**
     * Creates unsubscribe callback function for the [[Subscription]] class.
     * @hidden
     *
     * @param sub
     * Subscriber details.
     *
     * @returns
     * Function that implements the [[unsubscribe]] request.
     */
    SubEvent.prototype._createCancel = function (sub) {
        var _this = this;
        return function () {
            _this._cancelSub(sub);
        };
    };
    /**
     * Cancels an existing subscription.
     * @hidden
     *
     * @param sub
     * Subscriber to be removed, which must be on the list.
     */
    SubEvent.prototype._cancelSub = function (sub) {
        this._subs.splice(this._subs.indexOf(sub), 1);
        sub.cancel();
        sub.cb = undefined; // prevent further emits
        if (typeof this.options.onCancel === 'function') {
            var ctx = { event: sub.event, name: sub.name, data: sub.data };
            this.options.onCancel(ctx);
        }
    };
    return SubEvent;
}());
exports.SubEvent = SubEvent;
/**
 * Static isolated methods and properties.
 *
 * @hidden
 */
var Stat = /** @class */ (function () {
    function Stat() {
    }
    Stat.errInvalidOptions = "Invalid \"options\" parameter.";
    // istanbul ignore next: we are not auto-testing in the browser
    /**
     * For compatibility with web browsers.
     */
    Stat.callNext = typeof process === 'undefined' ? setTimeout : process.nextTick;
    Stat.callNow = function (callback) { return callback(); };
    return Stat;
}());

}).call(this)}).call(this,require('_process'))
},{"./consumer":1,"./sub":5,"_process":8,"tslib":9}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventConsumer = exports.SubEventCount = exports.EmitSchedule = exports.SubEvent = exports.Subscription = void 0;
var sub_1 = require("./sub");
Object.defineProperty(exports, "Subscription", { enumerable: true, get: function () { return sub_1.Subscription; } });
var event_1 = require("./event");
Object.defineProperty(exports, "SubEvent", { enumerable: true, get: function () { return event_1.SubEvent; } });
Object.defineProperty(exports, "EmitSchedule", { enumerable: true, get: function () { return event_1.EmitSchedule; } });
var count_1 = require("./count");
Object.defineProperty(exports, "SubEventCount", { enumerable: true, get: function () { return count_1.SubEventCount; } });
var consumer_1 = require("./consumer");
Object.defineProperty(exports, "EventConsumer", { enumerable: true, get: function () { return consumer_1.EventConsumer; } });

},{"./consumer":1,"./count":2,"./event":3,"./sub":5}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subscription = void 0;
/**
 * ### class Subscription
 *
 * Represents an event subscription, and a safe way to cancel it.
 *
 * @see [[cancel]]
 */
var Subscription = /** @class */ (function () {
    /**
     * @hidden
     */
    function Subscription(init) {
        var _this = this;
        this._cancel = init.cancel;
        this.name = init.sub.name;
        var cc = init.sub.cancel;
        init.sub.cancel = function () {
            _this._cancel = null;
            cc();
        };
    }
    Object.defineProperty(Subscription.prototype, "live", {
        /**
         * Indicates whether the subscription is live / active.
         *
         * It can be useful to subscribers when [[cancelAll]] is used without their knowledge.
         */
        get: function () {
            return !!this._cancel;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Cancels the live subscription. The subscriber won't receive any more events.
     *
     * It also sets flag [[live]] to `false`.
     *
     * @returns
     * - `true` - subscription has been successfully cancelled
     * - `false` - nothing happened, as subscription wasn't live
     *
     * @see [[cancelAll]]
     */
    Subscription.prototype.cancel = function () {
        if (this._cancel) {
            this._cancel();
            this._cancel = null;
            return true;
        }
        return false;
    };
    return Subscription;
}());
exports.Subscription = Subscription;

},{}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Private = void 0;
var private_1 = require("./private");
Object.defineProperty(exports, "Private", { enumerable: true, get: function () { return private_1.Private; } });

},{"./private":7}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Private = void 0;
/**
 * Implements proper private properties.
 *
 * @hidden
 */
var Private = /** @class */ (function () {
    function Private() {
        this.propMap = new WeakMap();
    }
    Private.prototype.get = function (obj) {
        return this.propMap.get(obj);
    };
    Private.prototype.set = function (obj, val) {
        this.propMap.set(obj, val);
    };
    return Private;
}());
exports.Private = Private;

},{}],8:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],9:[function(require,module,exports){
(function (global){(function (){
/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global global, define, System, Reflect, Promise */
var __extends;
var __assign;
var __rest;
var __decorate;
var __param;
var __metadata;
var __awaiter;
var __generator;
var __exportStar;
var __values;
var __read;
var __spread;
var __spreadArrays;
var __spreadArray;
var __await;
var __asyncGenerator;
var __asyncDelegator;
var __asyncValues;
var __makeTemplateObject;
var __importStar;
var __importDefault;
var __classPrivateFieldGet;
var __classPrivateFieldSet;
var __createBinding;
(function (factory) {
    var root = typeof global === "object" ? global : typeof self === "object" ? self : typeof this === "object" ? this : {};
    if (typeof define === "function" && define.amd) {
        define("tslib", ["exports"], function (exports) { factory(createExporter(root, createExporter(exports))); });
    }
    else if (typeof module === "object" && typeof module.exports === "object") {
        factory(createExporter(root, createExporter(module.exports)));
    }
    else {
        factory(createExporter(root));
    }
    function createExporter(exports, previous) {
        if (exports !== root) {
            if (typeof Object.create === "function") {
                Object.defineProperty(exports, "__esModule", { value: true });
            }
            else {
                exports.__esModule = true;
            }
        }
        return function (id, v) { return exports[id] = previous ? previous(id, v) : v; };
    }
})
(function (exporter) {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };

    __extends = function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };

    __assign = Object.assign || function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };

    __rest = function (s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    };

    __decorate = function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };

    __param = function (paramIndex, decorator) {
        return function (target, key) { decorator(target, key, paramIndex); }
    };

    __metadata = function (metadataKey, metadataValue) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
    };

    __awaiter = function (thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };

    __generator = function (thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    };

    __exportStar = function(m, o) {
        for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p)) __createBinding(o, m, p);
    };

    __createBinding = Object.create ? (function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
    }) : (function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });

    __values = function (o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m) return m.call(o);
        if (o && typeof o.length === "number") return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    };

    __read = function (o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    };

    /** @deprecated */
    __spread = function () {
        for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read(arguments[i]));
        return ar;
    };

    /** @deprecated */
    __spreadArrays = function () {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    };

    __spreadArray = function (to, from) {
        for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
            to[j] = from[i];
        return to;
    };

    __await = function (v) {
        return this instanceof __await ? (this.v = v, this) : new __await(v);
    };

    __asyncGenerator = function (thisArg, _arguments, generator) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var g = generator.apply(thisArg, _arguments || []), i, q = [];
        return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
        function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
        function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
        function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);  }
        function fulfill(value) { resume("next", value); }
        function reject(value) { resume("throw", value); }
        function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
    };

    __asyncDelegator = function (o) {
        var i, p;
        return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
        function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; } : f; }
    };

    __asyncValues = function (o) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator], i;
        return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
        function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
        function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
    };

    __makeTemplateObject = function (cooked, raw) {
        if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
        return cooked;
    };

    var __setModuleDefault = Object.create ? (function(o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
        o["default"] = v;
    };

    __importStar = function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        __setModuleDefault(result, mod);
        return result;
    };

    __importDefault = function (mod) {
        return (mod && mod.__esModule) ? mod : { "default": mod };
    };

    __classPrivateFieldGet = function (receiver, state, kind, f) {
        if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
        return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
    };

    __classPrivateFieldSet = function (receiver, state, value, kind, f) {
        if (kind === "m") throw new TypeError("Private method is not writable");
        if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
        return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
    };

    exporter("__extends", __extends);
    exporter("__assign", __assign);
    exporter("__rest", __rest);
    exporter("__decorate", __decorate);
    exporter("__param", __param);
    exporter("__metadata", __metadata);
    exporter("__awaiter", __awaiter);
    exporter("__generator", __generator);
    exporter("__exportStar", __exportStar);
    exporter("__createBinding", __createBinding);
    exporter("__values", __values);
    exporter("__read", __read);
    exporter("__spread", __spread);
    exporter("__spreadArrays", __spreadArrays);
    exporter("__spreadArray", __spreadArray);
    exporter("__await", __await);
    exporter("__asyncGenerator", __asyncGenerator);
    exporter("__asyncDelegator", __asyncDelegator);
    exporter("__asyncValues", __asyncValues);
    exporter("__makeTemplateObject", __makeTemplateObject);
    exporter("__importStar", __importStar);
    exporter("__importDefault", __importDefault);
    exporter("__classPrivateFieldGet", __classPrivateFieldGet);
    exporter("__classPrivateFieldSet", __classPrivateFieldSet);
});

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[4])(4)
});
