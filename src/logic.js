"use strict";
// Palette Contrast Matrix core logic: pure functions, no DOM, no fetch.

function normalizeHex(input) {
  let s = String(input || "").trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(s)) s = s.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return "#" + s.toLowerCase();
}

function isValidHex(input) { return normalizeHex(input) !== null; }

function hexToRgb(hex) {
  const n = normalizeHex(hex);
  if (!n) return null;
  return { r: parseInt(n.slice(1, 3), 16), g: parseInt(n.slice(3, 5), 16), b: parseInt(n.slice(5, 7), 16) };
}

function rgbToHex(r, g, b) {
  const p = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return "#" + p(r) + p(g) + p(b);
}

function channelLuminance(v) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return 0.2126 * channelLuminance(rgb.r) + 0.7152 * channelLuminance(rgb.g) + 0.0722 * channelLuminance(rgb.b);
}

function contrastRatio(hexA, hexB) {
  const la = relativeLuminance(hexA), lb = relativeLuminance(hexB);
  if (la == null || lb == null) return null;
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

function assessPair(fg, bg) {
  const ratio = contrastRatio(fg, bg);
  return { fg: normalizeHex(fg), bg: normalizeHex(bg), ratio, aaNormal: ratio >= 4.5, aaaNormal: ratio >= 7, aaLarge: ratio >= 3, aaaLarge: ratio >= 4.5 };
}

function buildMatrix(colors) {
  const list = (colors || []).map(normalizeHex).filter(Boolean);
  const pairs = [];
  list.forEach((fg) => { list.forEach((bg) => { if (fg !== bg) pairs.push(assessPair(fg, bg)); }); });
  return pairs;
}

function filterPassing(pairs, level, large) {
  const lvl = String(level || "AA").toUpperCase();
  return (pairs || []).filter((p) => {
    if (lvl === "AAA") return large ? p.aaaLarge : p.aaaNormal;
    return large ? p.aaLarge : p.aaNormal;
  });
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue = (t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
    r = hue(h + 1 / 3); g = hue(h); b = hue(h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function suggestPassingShade(fg, bg, target) {
  const goal = target || 4.5;
  const fgN = normalizeHex(fg), bgN = normalizeHex(bg);
  if (!fgN || !bgN) return null;
  if (contrastRatio(fgN, bgN) >= goal) return { hex: fgN, ratio: contrastRatio(fgN, bgN), lightnessDelta: 0 };
  const rgb = hexToRgb(fgN);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const bgLum = relativeLuminance(bgN);
  const fgLum = relativeLuminance(fgN);
  const directions = fgLum <= bgLum ? [-1, 1] : [1, -1]; // prefer darkening text on light bg and vice versa
  let best = null;
  for (const dir of directions) {
    for (let step = 1; step <= 100; step++) {
      const l = Math.max(0, Math.min(1, hsl.l + dir * step * 0.01));
      const c = hslToRgb(hsl.h, hsl.s, l);
      const hex = rgbToHex(c.r, c.g, c.b);
      const ratio = contrastRatio(hex, bgN);
      if (ratio >= goal) { const cand = { hex, ratio, lightnessDelta: Math.round(Math.abs(l - hsl.l) * 100) / 100 }; if (!best || cand.lightnessDelta < best.lightnessDelta) best = cand; break; }
      if (l === 0 || l === 1) break;
    }
  }
  return best;
}

function slugName(hex, i) { return "color-" + (i + 1); }

function exportCSSVariables(colors, names) {
  const list = (colors || []).map(normalizeHex).filter(Boolean);
  const lines = [":root {"];
  list.forEach((c, i) => { lines.push("  --" + ((names && names[i]) || slugName(c, i)) + ": " + c + ";"); });
  lines.push("}");
  return lines.join("\n") + "\n";
}

function exportTailwindConfig(colors, names) {
  const list = (colors || []).map(normalizeHex).filter(Boolean);
  const obj = {};
  list.forEach((c, i) => { obj[(names && names[i]) || slugName(c, i)] = c; });
  return "module.exports = {\n  theme: {\n    extend: {\n      colors: " + JSON.stringify(obj, null, 8).replace(/\n/g, "\n      ") + "\n    }\n  }\n};\n";
}

function exportReportCSV(pairs) {
  const lines = ["foreground,background,ratio,aaNormal,aaaNormal,aaLarge,aaaLarge"];
  (pairs || []).forEach((p) => { lines.push([p.fg, p.bg, p.ratio, p.aaNormal ? "pass" : "fail", p.aaaNormal ? "pass" : "fail", p.aaLarge ? "pass" : "fail", p.aaaLarge ? "pass" : "fail"].join(",")); });
  return lines.join("\n") + "\n";
}

function parsePaletteImport(text) {
  const s = String(text || "").trim();
  if (!s) return [];
  if (s.startsWith("{") || s.startsWith("[")) {
    try {
      const obj = JSON.parse(s);
      const vals = Array.isArray(obj) ? obj : Object.values(obj);
      const flat = [];
      vals.forEach((v) => { if (typeof v === "string") flat.push(v); else if (v && typeof v === "object") Object.values(v).forEach((x) => { if (typeof x === "string") flat.push(x); }); });
      return Array.from(new Set(flat.map(normalizeHex).filter(Boolean))).slice(0, 16);
    } catch (e) { /* fall through to text scan */ }
  }
  // CSS variables and Tailwind-ish text: pull every hex token in order
  const found = s.match(/#?[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) || [];
  return Array.from(new Set(found.map(normalizeHex).filter(Boolean))).slice(0, 16);
}

const api = { normalizeHex, isValidHex, hexToRgb, rgbToHex, relativeLuminance, contrastRatio, assessPair, buildMatrix, filterPassing, rgbToHsl, hslToRgb, suggestPassingShade, exportCSSVariables, exportTailwindConfig, exportReportCSV, parsePaletteImport };
if (typeof module !== "undefined" && module.exports) { module.exports = api; }
if (typeof window !== "undefined") { window.PaletteContrastMatrix = api; }
