/**
 * The driver of the Python tasks (`edu-python/quests`) on an engine in the same thread: tests in Node and checks
 * on a server. It has no time limit: the caller runs it where a long program can be stopped (a worker thread).
 */
import type { DriverFactory } from "../quests/run.ts";
import { type Engine } from "./engine.ts";
export declare const engineDriver: (engine: Engine) => DriverFactory;
