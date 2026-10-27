// Production build of the main page (index.html) into dist/.
//   npm run build                          (link previews point at olenabosoi.com)
//   SITE_URL=https://… npm run build       (another address, e.g. the GitHub Pages preview)
// What it does:
// - drops the configurator hook (js/site-config.js and the hero's ?preview swap):
//   the live site always shows the defaults in css/tokens.css;
// - joins the three stylesheets into one, minified;
// - minifies every local script (same files and order, so nothing changes in
//   how they run);
// - turns every JPEG and PNG the page uses into WebP, at the same size;
// - copies only the files the page uses, and minifies the HTML;
// - adds ?v=<hash> to the CSS and JS links, so a new build is never cached
//   behind an old one.
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import * as esbuild from "esbuild";
import { minify } from "html-minifier-terser";
import sharp from "sharp";

const OUT = "dist";
const SITE_URL = (process.env.SITE_URL || "https://olenabosoi.com/").replace(/\/?$/, "/");
// Kept as JPEG: link previews (Facebook, LinkedIn, iMessage) don't all read WebP.
const KEEP_FORMAT = new Set(["images/og-image.jpg"]);

const hash = (data) => createHash("sha256").update(data).digest("hex").slice(0, 10);
const write = async (path, data) => {
  await mkdir(dirname(join(OUT, path)), { recursive: true });
  await writeFile(join(OUT, path), data);
};
const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;

await rm(OUT, { recursive: true, force: true });
let html = await readFile("index.html", "utf8");

// ---- Configurator hook out ----
html = html
  .replace(/\s*<!-- Settings from the configurator[^>]*-->\s*<script src="js\/site-config\.js"><\/script>/, "")
  .replace(/\s*<script>SiteConfig\.applyHero\([^<]*<\/script>/, "");
if (html.includes("site-config") || html.includes("SiteConfig")) {
  throw new Error("The configurator hook is still in the page: check the markers in build.mjs.");
}

// ---- Link previews: absolute addresses for this build ----
html = html.replaceAll("https://olenabosoi.com/", SITE_URL);

// ---- CSS: one minified file ----
const cssLinks = [...html.matchAll(/<link rel="stylesheet" href="(css\/[^"]+)">\s*/g)];
const css = await esbuild.build({
  stdin: {
    contents: cssLinks.map((m) => `@import "./${m[1].slice(4)}";`).join("\n"),
    resolveDir: "css",
    loader: "css",
  },
  bundle: true,
  minify: true,
  write: false,
  external: ["../fonts/*"],
  logLevel: "warning",
});
const cssCode = css.outputFiles[0].contents;
await write("css/site.min.css", cssCode);
cssLinks.forEach((m, i) => {
  html = html.replace(m[0], i === 0 ? `<link rel="stylesheet" href="css/site.min.css?v=${hash(cssCode)}">\n  ` : "");
});
const cssText = new TextDecoder().decode(cssCode);
for (const [, font] of cssText.matchAll(/url\("?\.\.\/(fonts\/[^")]+)"?\)/g)) {
  await mkdir(join(OUT, "fonts"), { recursive: true });
  await copyFile(font, join(OUT, font));
}

// ---- JS: each local script minified in place ----
for (const [tag, attrs, src] of [...html.matchAll(/<script([^>]*) src="(js\/[^"]+)"><\/script>/g)]) {
  const code = await readFile(src, "utf8");
  const isModule = attrs.includes('type="module"');
  const out = await esbuild.transform(code, {
    minify: true,
    loader: "js",
    format: isModule ? "esm" : undefined,
    target: "es2020",
  });
  await write(src, out.code);
  html = html.replace(tag, tag.replace(src, `${src}?v=${hash(out.code)}`));
}

// ---- Images: every local one the page names, JPEG/PNG to WebP ----
const refs = new Set(
  [...html.matchAll(/(?:src|href|content)="((?:images|fonts)\/[^"?]+)"|url\('((?:images)\/[^']+)'\)/g)]
    .map((m) => m[1] || m[2]),
);
// og:image is an absolute address; its file still has to ship.
refs.add("images/og-image.jpg");
let before = 0;
let after = 0;
for (const path of refs) {
  const ext = extname(path).toLowerCase();
  const input = await readFile(path);
  before += input.length;
  if ((ext === ".jpg" || ext === ".jpeg" || ext === ".png") && !KEEP_FORMAT.has(path)) {
    const webp = path.replace(/\.(jpe?g|png)$/i, ".webp");
    const output = await sharp(input).webp({ quality: 80, effort: 6 }).toBuffer();
    // Keep the original when WebP isn't smaller.
    if (output.length < input.length) {
      await write(webp, output);
      after += output.length;
      html = html.replaceAll(`"${path}"`, `"${webp}"`).replaceAll(`'${path}'`, `'${webp}'`);
      continue;
    }
  }
  await write(path, input);
  after += input.length;
}

// ---- HTML ----
html = await minify(html, {
  collapseWhitespace: true,
  conservativeCollapse: true, // keeps one space where there was any, so no words run together
  removeComments: true,
  minifyJS: true,
  minifyCSS: true,
  keepClosingSlash: true,
});
await write("index.html", html);
// GitHub Pages: serve the files as they are.
await write(".nojekyll", "");

console.log(`Built ${OUT}/ for ${SITE_URL}`);
console.log(`  CSS  ${kb(cssCode.length)} (one file)`);
console.log(`  images ${kb(before)} -> ${kb(after)} (${refs.size} files)`);
console.log(`  HTML ${kb(Buffer.byteLength(html))}`);
