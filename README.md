# Palette Contrast Matrix
Live page: https://aamirtechs.github.io/palette-contrast-matrix/

Check a whole brand palette at once, every text-on-background pair against WCAG AA and AAA, and export only the combinations that pass, as CSS or Tailwind tokens. It solves a recurring, specific job for the people who hit it every week, in one local page with no account and no upload.

## Features
- Add colours by hex, or import a palette from CSS variable text, a Tailwind snippet or JSON, up to 16 colours.
- The full N by N matrix scores every text on background pair for AA and AAA, normal and large text.
- Filter to passing pairs only, the combinations you can safely ship.
- Failing pairs get a nearest passing shade suggestion made by adjusting lightness only, so the hue stays on brand.
- Export a report CSV, CSS custom properties, or a Tailwind config with your colour names.

## How it works
Load or paste your input in the tool card, set the options, and run it. All parsing, checking and file generation happens locally in the page, and you download the result (a report, a converted file, or a corrected snippet) straight from the browser. It runs entirely in the browser.

## Privacy
Runs 100% in your browser. Your files never leave this device, nothing is uploaded,
and there is no tracking.

## Development
Core logic lives in `src/logic.js` and is shared by the page and the tests.
Run the tests with `npm test`.

## License
MIT, Copyright 2026 Amir Hussain.
