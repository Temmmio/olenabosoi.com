// Production build into dist/:
//   index.html         the main page, as visitors see it
//   configurator.html  the style configurator, previewing preview.html
//   preview.html       the main page with the configurator hook kept (noindex)
//
//   npm run build                          (link previews point at olenabosoi.com)
//   SITE_URL=https://… npm run build       (another address, e.g. the GitHub Pages preview)
//
// What it does to the pages:
// - index.html drops the configurator hook (js/site-config.js and the hero's
//   ?preview swap): the live site always shows the defaults in css/tokens.css;
// - joins the three stylesheets into one, minified;
// - minifies every local script (same files and order, so nothing changes in
//   how they run);
// - turns every JPEG and PNG the pages use into WebP, at the same size;
// - copies only the files the pages use, and minifies the HTML;
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
const done = new Map(); // files already written, by source path -> published path
const stats = { before: 0, after: 0, files: 0 };

// ---- Shared steps ----
async function minifyScript(src, isModule) {
  if (done.has(src)) return done.get(src);
  const out = await esbuild.transform(await readFile(src, "utf8"), {
    minify: true,
    loader: "js",
    format: isModule ? "esm" : undefined,
    target: "es2020",
  });
  await write(src, out.code);
  const published = `${src}?v=${hash(out.code)}`;
  done.set(src, published);
  return published;
}

async function scripts(html) {
  for (const [tag, attrs, src] of [...html.matchAll(/<script([^>]*) src="(js\/[^"]+)"><\/script>/g)]) {
    html = html.replace(tag, tag.replace(src, await minifyScript(src, attrs.includes('type="module"'))));
  }
  return html;
}

// Local images and fonts the page names: JPEG/PNG to WebP when smaller.
async function assets(html) {
  const refs = new Set(
    [...html.matchAll(/(?:src|href|content)="((?:images|fonts)\/[^"?]+)"|url\('(images\/[^']+)'\)/g)]
      .map((m) => m[1] || m[2]),
  );
  for (const path of refs) {
    if (!done.has(path)) {
      const input = await readFile(path);
      const ext = extname(path).toLowerCase();
      let published = path;
      let output = input;
      if ((ext === ".jpg" || ext === ".jpeg" || ext === ".png") && !KEEP_FORMAT.has(path)) {
        const webp = await sharp(input).webp({ quality: 80, effort: 6 }).toBuffer();
        if (webp.length < input.length) {
          published = path.replace(/\.(jpe?g|png)$/i, ".webp");
          output = webp;
        }
      }
      await write(published, output);
      stats.before += input.length;
      stats.after += output.length;
      stats.files += 1;
      done.set(path, published);
    }
    const published = done.get(path);
    if (published !== path) {
      html = html.replaceAll(`"${path}"`, `"${published}"`).replaceAll(`'${path}'`, `'${published}'`);
    }
  }
  return html;
}

// Files a script names (not visible in the HTML), copied as they are.
async function copyAsIs(paths) {
  for (const path of paths) {
    if (done.has(`copy:${path}`)) continue;
    await mkdir(dirname(join(OUT, path)), { recursive: true });
    await copyFile(path, join(OUT, path));
    done.set(`copy:${path}`, path);
  }
}

const minifyHtml = (html) => minify(html, {
  collapseWhitespace: true,
  conservativeCollapse: true, // keeps one space where there was any, so no words run together
  removeComments: true,
  minifyJS: true,
  minifyCSS: true,
  keepClosingSlash: true,
});

await rm(OUT, { recursive: true, force: true });

// ---- CSS: the site's three stylesheets as one minified file ----
const source = await readFile("index.html", "utf8");
const cssLinks = [...source.matchAll(/<link rel="stylesheet" href="(css\/[^"]+)">\s*/g)];
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
const cssHref = `css/site.min.css?v=${hash(cssCode)}`;
const fonts = [...new TextDecoder().decode(cssCode).matchAll(/url\("?\.\.\/(fonts\/[^")]+)"?\)/g)].map((m) => m[1]);
await copyAsIs(fonts);

// ---- The main page, and its preview copy ----
async function mainPage(keepHook) {
  let html = source;
  if (!keepHook) {
    html = html
      .replace(/\s*<!-- Settings from the configurator[^>]*-->\s*<script src="js\/site-config\.js"><\/script>/, "")
      .replace(/\s*<script>SiteConfig\.applyHero\([^<]*<\/script>/, "");
    if (html.includes("site-config") || html.includes("SiteConfig")) {
      throw new Error("The configurator hook is still in the page: check the markers in build.mjs.");
    }
  } else {
    // Only for the configurator: kept out of search results.
    html = html.replace("<meta charset=\"utf-8\">", "<meta charset=\"utf-8\">\n  <meta name=\"robots\" content=\"noindex\">");
  }
  html = html.replaceAll("https://olenabosoi.com/", SITE_URL);
  cssLinks.forEach((m, i) => {
    html = html.replace(m[0], i === 0 ? `<link rel="stylesheet" href="${cssHref}">\n  ` : "");
  });
  html = await scripts(html);
  html = await assets(html);
  return minifyHtml(html);
}

const index = await mainPage(false);
await write("index.html", index);
// og:image is an absolute address, so the file isn't picked up from the page.
await assets('content="images/og-image.jpg"');
await write("preview.html", await mainPage(true));

// ---- The configurator ----
let configurator = await readFile("configurator.html", "utf8");
configurator = configurator.replaceAll("index.html?preview", "preview.html?preview");
configurator = await scripts(configurator);
await copyAsIs(["css/tokens.css"]);
// The hero photos js/site-config.js offers, named there as JPEG.
const heroPhotos = [...(await readFile("js/site-config.js", "utf8")).matchAll(/src: "(images\/[^"]+)"/g)].map((m) => m[1]);
await copyAsIs(heroPhotos);
await write("configurator.html", await minifyHtml(configurator));

// GitHub Pages: serve the files as they are.
await write(".nojekyll", "");

console.log(`Built ${OUT}/ for ${SITE_URL}`);
console.log(`  CSS  ${kb(cssCode.length)} (one file)`);
console.log(`  images ${kb(stats.before)} -> ${kb(stats.after)} (${stats.files} files)`);
console.log(`  index.html ${kb(Buffer.byteLength(index))}`);
