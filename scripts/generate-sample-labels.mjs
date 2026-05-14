import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import bwipjs from "bwip-js";

const root = process.cwd();
const fixturePath = path.join(root, "docs", "testing", "sample-label-fixtures.json");
const outputPath = path.join(root, "docs", "testing", "sample-labels.html");
const screenOutputPath = path.join(root, "docs", "testing", "sample-labels-screen.html");
const fixtures = JSON.parse(await readFile(fixturePath, "utf8"));

function barcodeSvg(text, options = {}) {
  return bwipjs.toSVG({
    bcid: "code128",
    text,
    includetext: false,
    height: options.height ?? 16,
    scaleX: options.scaleX ?? 1.8,
    scaleY: options.scaleY ?? 1,
    paddingwidth: 0,
    paddingheight: 0,
  });
}

function eanSvg(text) {
  const type = text.length === 12 ? "upca" : "ean13";
  return bwipjs.toSVG({
    bcid: type,
    text,
    includetext: true,
    textsize: 9,
    height: 18,
    scaleX: 1.15,
    scaleY: 1,
    paddingwidth: 0,
    paddingheight: 0,
  });
}

function htmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function compactMac(value) {
  return String(value).replace(/[\s:-]/g, "").toUpperCase();
}

function label(fixture, index) {
  const expected = fixture.expected ?? "REJECT";
  return `
    <article class="label ${fixture.expected ? "" : "label--negative"}">
      <section class="main">
        <header>
          <div>
            <h2>${htmlEscape(fixture.model)}</h2>
            <p><strong>Product:</strong>${htmlEscape(fixture.product)}</p>
            <p><strong>Model:</strong>${htmlEscape(fixture.model)}</p>
          </div>
          <div class="meta">
            <span>V${index + 1}</span>
            <strong>P/N:${htmlEscape(fixture.partNumber)}</strong>
          </div>
        </header>

        <div class="barcode-block">
          <strong>SN:</strong>
          ${barcodeSvg(fixture.serial, { scaleX: 1.35, height: 12 })}
          <span>${htmlEscape(fixture.serial)}</span>
        </div>

        <div class="barcode-block barcode-block--mac">
          <strong>MAC:</strong>
          ${barcodeSvg(fixture.mac, { height: 20, scaleX: 2.2 })}
          <span>MAC ${htmlEscape(compactMac(fixture.mac))}</span>
        </div>

        <div class="barcode-grid">
          <div class="barcode-block">
            <strong>EAN:</strong>
            ${eanSvg(fixture.ean)}
          </div>
          <div class="barcode-block">
            <strong>UPC:</strong>
            ${eanSvg(fixture.upc)}
          </div>
        </div>
      </section>

      <aside>
        <div class="marks">
          <strong>CE</strong>
          <strong>FCC</strong>
          <strong>RoHS</strong>
          <strong>HAC</strong>
          <strong>ISO 9001</strong>
        </div>
        <p>Made in China</p>
      </aside>

      <footer>
        <strong>${htmlEscape(fixture.title)}</strong>
        <span>Expected: ${htmlEscape(expected)}</span>
        <small>${htmlEscape(fixture.notes)}</small>
      </footer>
    </article>`;
}

function documentShell({ title, body, extraCss = "" }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${htmlEscape(title)}</title>
    <style>
      @page { size: A4; margin: 10mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #111;
        background: #f3f3f0;
        font-family: Arial, Helvetica, sans-serif;
      }
      .sheet {
        display: grid;
        grid-template-columns: 1fr;
        gap: 8mm;
        padding: 10mm;
      }
      .intro {
        grid-column: 1 / -1;
        padding: 0 0 2mm;
      }
      .intro h1 { margin: 0 0 2mm; font-size: 18pt; }
      .intro p { margin: 0; color: #444; font-size: 9pt; }
      .label {
        display: grid;
        grid-template-columns: 1fr 27mm;
        grid-template-rows: 1fr auto;
        min-height: 92mm;
        border: 1px solid #111;
        background: #fff;
        page-break-inside: avoid;
      }
      .main { padding: 7mm 5mm 4mm; }
      header {
        display: flex;
        justify-content: space-between;
        gap: 3mm;
        margin-bottom: 4mm;
      }
      h2 { margin: 0 0 3mm; font-size: 18pt; letter-spacing: 0; }
      p { margin: 1mm 0; font-size: 8.5pt; }
      .meta { text-align: right; font-size: 8pt; }
      .meta span {
        display: inline-block;
        margin-bottom: 2mm;
        padding: 1mm 2mm;
        color: #fff;
        background: #111;
        font-weight: 700;
      }
      .barcode-block { margin: 3mm 0; }
      .barcode-block strong {
        display: block;
        margin-bottom: 1mm;
        font-size: 11pt;
      }
      .barcode-block svg {
        display: block;
        width: 100%;
        max-height: 28mm;
      }
      .barcode-block span {
        display: block;
        margin-top: 1mm;
        font-size: 10pt;
        letter-spacing: 0.03em;
      }
      .barcode-block--mac strong,
      .barcode-block--mac span { font-size: 12pt; font-weight: 700; }
      .barcode-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4mm;
      }
      aside {
        display: grid;
        align-content: center;
        justify-items: center;
        gap: 5mm;
        border-left: 1px solid #111;
        padding: 5mm 2mm;
      }
      .marks {
        display: grid;
        gap: 2mm;
        justify-items: center;
        font-size: 13pt;
      }
      footer {
        grid-column: 1 / -1;
        display: grid;
        gap: 1mm;
        border-top: 1px solid #111;
        padding: 3mm 5mm;
        font-size: 8.5pt;
        background: #f7f7f4;
      }
      footer span { font-family: Consolas, "Courier New", monospace; }
      footer small { color: #555; }
      .label--negative footer { background: #fff1e9; }
      @media screen {
        body { padding: 0; }
        .sheet { max-width: 210mm; margin: 0 auto; background: #fff; }
      }
      ${extraCss}
      @media print {
        body { background: #fff; }
        .sheet { padding: 0; gap: 6mm; }
      }
    </style>
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

const html = documentShell({
  title: "Yealink MAC Scanner Sample Labels",
  body: `<main class="sheet">
      <section class="intro">
        <h1>Yealink MAC Scanner Sample Labels</h1>
        <p>Print this sheet at 100 percent scale. Fixtures marked Expected: REJECT should not be captured automatically. For monitor-based testing, use sample-labels-screen.html instead.</p>
      </section>
      ${fixtures.map(label).join("\n")}
    </main>`,
});

function screenLabel(fixture) {
  const expected = fixture.expected ?? "REJECT";
  return `
    <article class="screen-label ${fixture.expected ? "" : "screen-label--negative"}">
      <header>
        <div>
          <p class="overline">${htmlEscape(fixture.title)}</p>
          <h2>${htmlEscape(fixture.model)}</h2>
        </div>
        <strong>Expected: ${htmlEscape(expected)}</strong>
      </header>
      <div class="screen-barcode">
        <span>MAC:</span>
        ${barcodeSvg(fixture.mac, { height: 28, scaleX: 3 })}
        <strong>MAC ${htmlEscape(compactMac(fixture.mac))}</strong>
      </div>
      <div class="screen-distractors">
        <div>
          <span>SN</span>
          ${barcodeSvg(fixture.serial, { height: 10, scaleX: 1.2 })}
        </div>
        <div>
          <span>EAN</span>
          ${eanSvg(fixture.ean)}
        </div>
      </div>
    </article>`;
}

const screenHtml = documentShell({
  title: "Yealink MAC Scanner Screen Test Labels",
  extraCss: `
      body { background: #eef3ed; }
      .screen-sheet {
        display: grid;
        gap: 24px;
        max-width: 980px;
        margin: 0 auto;
        padding: 24px;
      }
      .screen-label {
        display: grid;
        gap: 18px;
        min-height: 0;
        border: 2px solid #111;
        border-radius: 8px;
        padding: 28px;
        background: #fff;
      }
      .screen-label header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 18px;
        margin: 0;
      }
      .screen-label h2 { font-size: 28px; margin: 0; }
      .overline {
        margin: 0 0 4px;
        color: #536257;
        font-size: 13px;
        font-weight: 800;
        text-transform: uppercase;
      }
      .screen-barcode {
        display: grid;
        gap: 8px;
        padding: 18px;
        border: 2px solid #111;
      }
      .screen-barcode span { font-size: 22px; font-weight: 800; }
      .screen-barcode svg { width: 100%; max-height: 150px; }
      .screen-barcode strong {
        font-size: 26px;
        letter-spacing: 0.04em;
      }
      .screen-distractors {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
        opacity: 0.72;
      }
      .screen-distractors span {
        display: block;
        margin-bottom: 4px;
        font-weight: 800;
      }
      .screen-distractors svg { width: 100%; max-height: 70px; }
      .screen-label--negative .screen-barcode { background: #fff3ec; }
  `,
  body: `<main class="screen-sheet">
      <section class="intro">
        <h1>Yealink MAC Scanner Screen Test Labels</h1>
        <p>Use this page when pointing a mobile camera at a monitor. Zoom the browser to 125-150 percent if needed.</p>
      </section>
      ${fixtures.map(screenLabel).join("\n")}
    </main>`,
});

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, html, "utf8");
await writeFile(screenOutputPath, screenHtml, "utf8");
console.log(`Generated ${path.relative(root, outputPath)} with ${fixtures.length} labels.`);
console.log(`Generated ${path.relative(root, screenOutputPath)} with ${fixtures.length} screen labels.`);
