#!/usr/bin/env node

// build-web-svgs.js — Generates composite front/back SVGs for the web app.
// Uses the same composition logic as the MagicMirror² node_helper.
//
// Usage: node packages/shared/build-web-svgs.js

const path = require("path");
const fs = require("fs");
const { FRONT_MUSCLE_MAP, BACK_MUSCLE_MAP, buildCompositeSvg } = require("./svg-builder");

const mirrorAssets = path.join(__dirname, "assets");
const frontDir = path.join(mirrorAssets, "front_muscles");
const backDir = path.join(mirrorAssets, "back_muscles");
const outDir = path.join(__dirname, "..", "web", "assets");

function readFile(filePath) {
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, "utf8");
  }
  console.warn(`Warning: file not found: ${filePath}`);
  return null;
}

const frontOutline = readFile(path.join(frontDir, "Body black outline.svg"));
const backOutline = readFile(path.join(backDir, "Body black outline.svg"));

if (!frontOutline || !backOutline) {
  console.error("Error: could not load outline SVGs from assets/");
  process.exit(1);
}

const readFileFn = (p) => readFile(p);

const frontSvg = buildCompositeSvg(
  frontOutline,
  path.join(frontDir, "each_muscle_group_separate"),
  FRONT_MUSCLE_MAP,
  "front",
  readFileFn
);

const backSvg = buildCompositeSvg(
  backOutline,
  path.join(backDir, "each_muscle_group_separate"),
  BACK_MUSCLE_MAP,
  "back",
  readFileFn
);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "muscle-front.svg"), frontSvg, "utf8");
fs.writeFileSync(path.join(outDir, "muscle-back.svg"), backSvg, "utf8");

console.log(`Generated: ${path.join(outDir, "muscle-front.svg")}`);
console.log(`Generated: ${path.join(outDir, "muscle-back.svg")}`);
