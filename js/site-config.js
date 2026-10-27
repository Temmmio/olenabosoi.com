// Colour and hero settings, shared by the configurator (configurator.html) and
// the main page. The main page applies saved settings only when opened with
// ?preview (the configurator's preview frame, or its "open in a new tab"), so
// visitors always see the defaults in tokens.css.
// Loaded in <head>, before the styles are used: the settings go on <html> as
// inline custom properties, and the scripts that read colours (the headings'
// wave, the name shimmer, the card orbs) read them once on load. So the
// configurator applies a change live (applyLive), then reloads the preview
// once a colour change settles, for those scripts.
(function () {
  var STORAGE_KEY = "ob-site-config";
  var IMAGE_KEY = "ob-site-config-image"; // an uploaded hero photo, as a data URL

  var HERO_IMAGES = {
    hat: { label: "Hat", src: "images/hero-hat.jpg", focus: [51, 45] },
    sunset: { label: "Sunset", src: "images/hero-sunset.jpg", focus: [50, 47] },
    crowd: { label: "Crowd", src: "images/hero-crowd.jpg", focus: [50, 40] },
  };

  // The colour versions made so far. textMix: how much of the text colour
  // goes into the two muted text tones (tokens.css: 70 and 60).
  var PRESETS = {
    main: {
      label: "Main",
      bg: "#000000", fg: "#ffffff", accent: "#ffffff", accentText: "#000000",
      textMix: [70, 60], eyebrowAccent: false, heroEyebrowAccent: false,
      hero: { image: "hat", focus: [51, 45] },
      overlay: { on: false, color: "bg", strength: 100, blend: "color" },
    },
    accent: {
      label: "Accent",
      bg: "#000000", fg: "#ffffff", accent: "#e485fe", accentText: "#000000",
      textMix: [70, 60], eyebrowAccent: true, heroEyebrowAccent: false,
      hero: { image: "hat", focus: [51, 45] },
      overlay: { on: false, color: "bg", strength: 100, blend: "color" },
    },
    orchidLight: {
      label: "Orchid light",
      bg: "#150b18", fg: "#f1ddf6", accent: "#e485fe", accentText: "#150b18",
      textMix: [78, 68], eyebrowAccent: true, heroEyebrowAccent: true,
      hero: { image: "hat", focus: [51, 45] },
      overlay: { on: true, color: "bg", strength: 100, blend: "color" },
    },
    orchid: {
      label: "Orchid",
      bg: "#23002b", fg: "#fae7ff", accent: "#e894ff", accentText: "#23002b",
      textMix: [70, 60], eyebrowAccent: true, heroEyebrowAccent: true,
      hero: { image: "hat", focus: [51, 45] },
      overlay: { on: true, color: "bg", strength: 100, blend: "color" },
    },
    plum: {
      label: "Plum",
      bg: "#170a15", fg: "#f6dbef", accent: "#dc63c6", accentText: "#170a15",
      textMix: [78, 68], eyebrowAccent: true, heroEyebrowAccent: true,
      hero: { image: "hat", focus: [51, 45] },
      overlay: { on: true, color: "accent", strength: 30, blend: "color" },
    },
    peach: {
      label: "Peach",
      bg: "#180c06", fg: "#f9e3d7", accent: "#fca676", accentText: "#180c06",
      textMix: [78, 68], eyebrowAccent: true, heroEyebrowAccent: false,
      hero: { image: "sunset", focus: [50, 47] },
      overlay: { on: false, color: "bg", strength: 100, blend: "color" },
    },
  };

  var OVERLAY_COLORS = { bg: "--bg", accent: "--accent", fg: "--fg" };

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function fromPreset(key) {
    var preset = copy(PRESETS[key] || PRESETS.main);
    delete preset.label;
    preset.preset = PRESETS[key] ? key : "main";
    return preset;
  }

  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function load() {
    var saved = null;
    try { saved = JSON.parse(read(STORAGE_KEY)); } catch (e) {}
    return saved && typeof saved === "object" ? saved : fromPreset("main");
  }

  // Returns false when the browser refuses (a private window, or an uploaded
  // photo too large for its storage).
  function save(config, image) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      if (image) localStorage.setItem(IMAGE_KEY, image);
      else if (image === null) localStorage.removeItem(IMAGE_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  function heroSource(config) {
    var hero = config.hero || {};
    if (hero.image === "custom") return read(IMAGE_KEY) || HERO_IMAGES.hat.src;
    return (HERO_IMAGES[hero.image] || HERO_IMAGES.hat).src;
  }

  // The settings as custom properties on an element (<html>).
  function applyColors(el, config) {
    var set = function (name, value) { el.style.setProperty(name, value); };
    set("--bg", config.bg);
    set("--fg", config.fg);
    set("--accent", config.accent);
    set("--accent-text", config.accentText);
    var mix = config.textMix || [70, 60];
    set("--text-2", "color-mix(in srgb, var(--fg) " + mix[0] + "%, var(--bg))");
    set("--text-3", "color-mix(in srgb, var(--fg) " + mix[1] + "%, var(--bg))");
    set("--text-eyebrow", config.eyebrowAccent ? "var(--accent)" : "var(--text-3)");
    set("--hero-eyebrow", config.heroEyebrowAccent
      ? "var(--accent)"
      : "color-mix(in srgb, var(--fg) 60%, transparent)");
    var overlay = config.overlay || {};
    set("--hero-tint", overlay.on
      ? "color-mix(in srgb, var(" + (OVERLAY_COLORS[overlay.color] || "--bg") + ") " + overlay.strength + "%, transparent)"
      : "transparent");
    set("--hero-tint-blend", overlay.blend || "color");
    // Corner rounding, in % of the design (100 = as designed).
    set("--radius-scale", String((config.radius === undefined ? 100 : config.radius) / 100));
  }

  function applyHero(img, config) {
    if (!img) return;
    var focus = (config.hero && config.hero.focus) || [50, 50];
    var src = heroSource(config);
    if (img.getAttribute("src") !== src) img.src = src;
    img.style.setProperty("--hero-focus", focus[0] + "% " + focus[1] + "%");
  }

  var previewing = /[?&]preview\b/.test(location.search);
  var active = previewing ? load() : null;
  if (active) applyColors(document.documentElement, active);

  window.SiteConfig = {
    STORAGE_KEY: STORAGE_KEY,
    PRESETS: PRESETS,
    HERO_IMAGES: HERO_IMAGES,
    fromPreset: fromPreset,
    load: load,
    save: save,
    heroSource: heroSource,
    loadImage: function () { return read(IMAGE_KEY); },
    // Called by the hero image's own inline script, so the photo is swapped
    // before it starts loading the default one.
    applyHero: function (img) { if (active) applyHero(img, active); },
    // Called by the configurator on every change: everything CSS draws
    // changes at once. The scripts' colours (wave, shimmer, orbs) need a reload.
    applyLive: function (config) {
      if (!previewing) return;
      active = config;
      applyColors(document.documentElement, config);
      applyHero(document.querySelector(".hero__img"), config);
    },
  };
})();
