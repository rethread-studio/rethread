import { OUTPUT_PATH } from "./config";
import { join, resolve } from "path";
import * as fs from "fs";
import * as sharp from "sharp";

interface Option {
  timestamp?: string;
  time?: string;
  site: string;
}

function formatDate(t: string) {
  const d = new Date(parseInt(t));
  d.setSeconds(0);
  d.setMinutes(0);
  d.setMilliseconds(0);
  return d.getTime().toString();
  return (
    ("0" + d.getDate()).slice(-2) +
    "-" +
    ("0" + d.getMonth()).slice(-2) +
    "-" +
    ("0" + d.getHours()).slice(-2) +
    "h"
  );
}

async function returnFile(arg: Option, file: string) {
  const timestamp = await timeToTimestamp(arg);
  const path = join(OUTPUT_PATH, arg.site, timestamp, file);
  if (!fs.existsSync(path)) {
    throw "not_found";
  }
  return resolve(path);
}

async function timeToTimestamp(arg: Option) {
  if (arg.timestamp) {
    return arg.timestamp;
  }
  const sitePath = join(OUTPUT_PATH, arg.site);
  const files = await fs.promises.readdir(sitePath);
  return files.filter((f) => formatDate(f) == arg.time)[0];
}

async function extractCoverage(path) {
  if (!fs.existsSync(path)) {
    throw "not_found";
  }
  const minPath = path.replace("coverage.json", "coverage.min.json");
  if (fs.existsSync(minPath)) {
    return resolve(minPath);
  }
  const data = JSON.parse(
    await (await fs.promises.readFile(path)).toString("utf-8")
  );
  const output = [];
  for (let script of data) {
    for (let func of script.functions) {
      for (let range of func.ranges) {
        output.push([range.endOffset - range.startOffset, range.count]);
      }
    }
  }
  await fs.promises.writeFile(minPath, JSON.stringify(output));
  return resolve(minPath);
}

async function extractCSSCoverage(path) {
  if (!fs.existsSync(path)) {
    throw "not_found";
  }
  const minPath = path.replace("css_coverage.json", "css_coverage.min.json");
  if (fs.existsSync(minPath)) {
    return resolve(minPath);
  }

  const data = JSON.parse(
    await (await fs.promises.readFile(path)).toString("utf-8")
  );
  const output = [];
  for (let range of data) {
    output.push(range.endOffset - range.startOffset);
  }
  await fs.promises.writeFile(minPath, JSON.stringify(output));
  return resolve(minPath);
}

export async function getHtml(arg: Option) {
  return returnFile(arg, "index.html");
}
export async function getProfile(arg: Option) {
  return returnFile(arg, "profile.json");
}
export async function getNetwork(arg: Option) {
  return returnFile(arg, "network.raw.json");
}
export async function getScreenshot(arg: Option) {
  const timestamp = await timeToTimestamp(arg);
  const path = join(OUTPUT_PATH, arg.site, timestamp, "screenshots");
  if (!fs.existsSync(path)) {
    throw "not_found";
  }
  const files = await fs.promises.readdir(path);
  if (files.length == 0) {
    throw "not_found";
  }
  return resolve(join(path, files[files.length - 1]));
}
export async function getCSSCoverage(arg: Option) {
  const timestamp = await timeToTimestamp(arg);
  return await extractCSSCoverage(
    join(OUTPUT_PATH, arg.site, timestamp, "css_coverage.json")
  );
}
export async function getJSCoverage(arg: Option) {
  const timestamp = await timeToTimestamp(arg);
  return await extractCoverage(
    join(OUTPUT_PATH, arg.site, timestamp, "coverage.json")
  );
}
export async function getSites() {
  const files = await fs.promises.readdir(OUTPUT_PATH);
  return files.filter((f) => fs.statSync(join(OUTPUT_PATH, f)).isDirectory());
}

export async function getTimeline() {
  const output = new Set<string>();
  for (let site of await getSites()) {
    const siteFiles = await fs.promises.readdir(join(OUTPUT_PATH, site));
    for (let f of siteFiles) {
      if (Number.isNaN(parseInt(f))) {
        continue;
      }
      const strDate = formatDate(f);
      output.add(strDate);
    }
  }
  return Array.from(output).sort();
}

export async function getGraphImage(arg: Option) {
  const timestamp = await timeToTimestamp(arg);
  const path = join(
    OUTPUT_PATH,
    "images",
    arg.site,
    "graph depth - rings",
    timestamp + ".png"
  );
  if (!fs.existsSync(path)) {
    throw "not_found";
  }
  return resolve(path);
}

export async function getCoverageImage(arg: Option) {
  const timestamp = await timeToTimestamp(arg);
  const path = join(
    OUTPUT_PATH,
    "images",
    arg.site,
    "coverage - voronoi",
    timestamp + ".png"
  );
  if (!fs.existsSync(path)) {
    throw "not_found";
  }
  return resolve(path);
}

export function resize(opt: {
  path: string;
  format?: string | null;
  width: number;
  height?: number;
}) {
  const readStream = fs.createReadStream(opt.path);
  let transform = sharp();
  if (opt.format) {
    transform = transform.toFormat(opt.format as any);
  }
  if (opt.width || opt.height) {
    transform = transform.resize(opt.width, opt.height);
  }

  return readStream.pipe(transform);
}
