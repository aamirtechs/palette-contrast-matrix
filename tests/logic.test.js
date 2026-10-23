"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../src/logic.js");

test("hex parsing handles 3 and 6 digit forms and rejects junk", () => {
  assert.equal(L.normalizeHex("#FFF"), "#ffffff");
  assert.equal(L.normalizeHex("0B1F3A"), "#0b1f3a");
  assert.equal(L.normalizeHex("#12"), null);
  assert.equal(L.isValidHex("#d4a72c"), true);
  assert.deepEqual(L.hexToRgb("#000000"), { r: 0, g: 0, b: 0 });
});

test("relative luminance of black is 0 and white is 1", () => {
  assert.equal(L.relativeLuminance("#000000"), 0);
  assert.ok(Math.abs(L.relativeLuminance("#ffffff") - 1) < 0.001);
});

test("contrast ratio black on white is 21 and identical colours are 1", () => {
  assert.equal(L.contrastRatio("#000000", "#ffffff"), 21);
  assert.equal(L.contrastRatio("#123456", "#123456"), 1);
  assert.equal(L.contrastRatio("#ffffff", "#000000"), 21);
});

test("matrix builds every ordered pair and assesses AA and AAA", () => {
  const pairs = L.buildMatrix(["#000000", "#ffffff", "#777777"]);
  assert.equal(pairs.length, 6); // 3 x 2 ordered pairs, no self pairs
  const bw = pairs.find((p) => p.fg === "#000000" && p.bg === "#ffffff");
  assert.equal(bw.aaNormal, true);
  assert.equal(bw.aaaNormal, true);
});

test("passing filter respects level and large text", () => {
  const pairs = L.buildMatrix(["#000000", "#ffffff", "#999999"]);
  const aa = L.filterPassing(pairs, "AA", false);
  const aaLarge = L.filterPassing(pairs, "AA", true);
  assert.ok(aaLarge.length >= aa.length);
  assert.ok(aa.every((p) => p.ratio >= 4.5));
});

test("nearest passing shade suggestion fixes a failing grey on white", () => {
  const before = L.contrastRatio("#999999", "#ffffff");
  assert.ok(before < 4.5);
  const s = L.suggestPassingShade("#999999", "#ffffff", 4.5);
  assert.ok(s);
  assert.ok(s.ratio >= 4.5);
  assert.ok(s.lightnessDelta > 0);
});

test("suggestion returns the colour unchanged when it already passes", () => {
  const s = L.suggestPassingShade("#000000", "#ffffff", 4.5);
  assert.equal(s.hex, "#000000");
  assert.equal(s.lightnessDelta, 0);
});

test("CSS variables export", () => {
  const css = L.exportCSSVariables(["#0b1f3a", "#d4a72c"], ["navy", "gold"]);
  assert.match(css, /--navy: #0b1f3a;/);
  assert.match(css, /--gold: #d4a72c;/);
});

test("Tailwind config export", () => {
  const out = L.exportTailwindConfig(["#0b1f3a"], ["navy"]);
  assert.match(out, /module\.exports/);
  assert.match(out, /"navy": "#0b1f3a"/);
});

test("palette import from CSS variable text and JSON", () => {
  const fromCSS = L.parsePaletteImport(":root { --navy: #0b1f3a; --gold: #d4a72c; }");
  assert.deepEqual(fromCSS, ["#0b1f3a", "#d4a72c"]);
  const fromJSON = L.parsePaletteImport('{"navy":"#0b1f3a","gold":"#d4a72c"}');
  assert.deepEqual(fromJSON, ["#0b1f3a", "#d4a72c"]);
  const fromArray = L.parsePaletteImport('["#000000","#ffffff"]');
  assert.deepEqual(fromArray, ["#000000", "#ffffff"]);
});

test("report CSV export lists ratios and verdicts", () => {
  const csv = L.exportReportCSV(L.buildMatrix(["#000000", "#ffffff"]));
  assert.match(csv, /foreground,background,ratio/);
  assert.match(csv, /#000000,#ffffff,21,pass/);
});
