import { geoTimescale } from "@macrostrat/d3-timescale";
import intervals from "@macrostrat/d3-timescale/intervals.nl.json";

const STORAGE_KEY = "geologischekaart:timescale";
const CHART_HEIGHT = 200;
const CHART_HEIGHT_MOBILE = 170;
const MOBILE_BREAKPOINT = 750;
const RESIZE_DEBOUNCE_MS = 150;

// Regional NW-European stages and informal subdivisions used in the map's
// OUDERDOM field, mapped to the ICS intervals of the Dutch timescale data.
const ALIASES = {
  weichselien: ["Laat-Pleistoceen"],
  "vroeg-weichselien": ["Laat-Pleistoceen"],
  "midden-weichselien": ["Laat-Pleistoceen"],
  "laat-weichselien": ["Laat-Pleistoceen"],
  eemien: ["Laat-Pleistoceen"],
  saalien: ["Chibaien"],
  holsteinien: ["Chibaien"],
  elsterien: ["Chibaien"],
  cromerien: ["Calabrien", "Chibaien"],
  bavelien: ["Calabrien"],
  menapien: ["Calabrien"],
  waalien: ["Calabrien"],
  eburonien: ["Gelasien", "Calabrien"],
  tiglien: ["Gelasien"],
  praetiglien: ["Gelasien"],
  "vroeg-holoceen": ["Greenlandien"],
  "midden-holoceen": ["Northgrippien"],
  "laat-holoceen": ["Meghalayen"],
  "vroeg-pleistoceen": ["Gelasien", "Calabrien"],
  "midden-pleistoceen": ["Chibaien"],
  "vroeg-plioceen": ["Zancléen"],
  "laat-plioceen": ["Piacenzien"],
  "vroeg-mioceen": ["Aquitanien", "Burdigalien"],
  "midden-mioceen": ["Langhien", "Serravallien"],
  "laat-mioceen": ["Tortonien", "Messinien"],
  "vroeg-oligoceen": ["Rupelien"],
  "midden-oligoceen": ["Rupelien"],
  "laat-oligoceen": ["Chattien"],
  "vroeg-eoceen": ["Ypresien"],
  "midden-eoceen": ["Lutetien", "Bartonien"],
  "laat-eoceen": ["Priabonien"],
  "vroeg-paleoceen": ["Danien"],
  "laat-paleoceen": ["Selandien", "Thanetien"],
};

// Flat index of the interval tree by lowercased name
const intervalsByName = new Map();
(function index(node) {
  intervalsByName.set(node.name.toLowerCase(), node);
  node.children?.forEach(index);
})(intervals);

/** The aria-label the library puts on each interval's <rect> */
const ariaLabel = (node) => `${node.name}, ${node.start} to ${node.end} Ma`;

function lookupTerm(term) {
  const names = ALIASES[term] ?? [term];
  const nodes = names
    .map((name) => intervalsByName.get(name.toLowerCase()))
    .filter(Boolean);
  return nodes.length ? nodes : null;
}

/**
 * Parse an OUDERDOM string like "Vroeg-Pleistoceen – Laat- Plioceen" into
 * the age range it covers: `{ start, end }` in Ma, oldest boundary first.
 * Returns null when no term is recognised.
 */
export function parseAgeRange(ouderdom) {
  if (!ouderdom) return null;

  const tokens = ouderdom
    .toLowerCase()
    .replace(/\.$/, "")
    .replace(/(\S)-\s+/g, "$1-") // "Laat- Plioceen" -> "Laat-Plioceen"
    .split(/\s+[–—-]\s+|,|\s+en\s+|\s+tot\s+|\s+of\s+|\//)
    .map((t) => t.replace(/\(.*?\)/g, "").trim())
    .filter(Boolean);

  const matched = [];
  for (const token of tokens) {
    // Try the whole token, then drop trailing qualifiers one word at a time
    // ("weichselien laat-glaciaal" -> "weichselien")
    const words = token.split(/\s+/);
    for (let n = words.length; n > 0; n--) {
      const nodes = lookupTerm(words.slice(0, n).join(" "));
      if (nodes) {
        matched.push(...nodes);
        break;
      }
    }
  }

  if (!matched.length) return null;

  return {
    start: Math.max(...matched.map((n) => n.start)),
    end: Math.min(...matched.map((n) => n.end)),
  };
}

const span = (range) => range.start - range.end;

const overlaps = (node, range) =>
  node.start > range.end && node.end < range.start;

/** Length of the part of the range inside the node, in Ma */
const overlapSpan = (node, range) =>
  Math.max(
    0,
    Math.min(node.start, range.start) - Math.max(node.end, range.end),
  );

// The timescale is linear, so a Quaternary range is a hairline when the view
// is zoomed to the interval that fully contains it (the Holocene is 0.45% of
// the Quaternary). Stop descending once the range fills a readable share of
// the focused interval instead.
const MIN_RANGE_SHARE = 0.2;
// ...but only descend into a child that still shows most of the range
const MIN_CHILD_COVERAGE = 0.8;

/** Interval to zoom to so that the range is visible and in context */
function findFocusInterval(range) {
  let node = intervals;
  for (;;) {
    if (span(range) / span(node) >= MIN_RANGE_SHARE) return node;
    const child = node.children
      ?.map((c) => ({ c, covered: overlapSpan(c, range) / span(range) }))
      .reduce((best, x) => (x.covered > best.covered ? x : best), {
        covered: 0,
      }).c;
    if (
      !child ||
      overlapSpan(child, range) / span(range) < MIN_CHILD_COVERAGE
    ) {
      return node;
    }
    node = child;
  }
}

/**
 * Bottom-of-screen panel with the geologic timescale, linked to the map
 * selection. Hidden by default; the choice is remembered in localStorage.
 */
export function createTimescalePanel({ onVisibilityChange } = {}) {
  const panel = document.getElementById("timescale-panel");
  const chartContainer = document.getElementById("timescale");
  const selectionLabel = document.getElementById("timescale-selection");
  const closeButton = panel.querySelector(".timescale-close-btn");

  let instance = null;
  let svg = null;
  let renderedWidth = 0;
  let selection = null; // { props, range }

  function rectFor(node) {
    return svg?.querySelector(`rect[aria-label="${ariaLabel(node)}"]`);
  }

  function zoomTo(node) {
    const focus = instance.focus.data;
    // The library toggles: clicking the focused interval zooms back out
    if (focus.name === node.name && focus.start === node.start) return;
    rectFor(node)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }

  // Dim the intervals outside the selected age range, mirroring the
  // library's own hover highlight (fill-opacity on the cell groups)
  function applyHighlight() {
    if (!svg) return;
    for (const rect of svg.querySelectorAll("rect[aria-label]")) {
      const [name, ages] = rect.getAttribute("aria-label").split(", ");
      const node = intervalsByName.get(name.toLowerCase());
      let opacity = 1;
      if (selection?.range && node) {
        // Pridoli is both an epoch and an age with identical bounds, so
        // match on the label's ages rather than the (shared) name
        const [start, end] = ages.split(" to ").map(parseFloat);
        opacity = overlaps({ start, end }, selection.range) ? 1 : 0.35;
      }
      rect.parentElement.setAttribute("fill-opacity", opacity);
    }
  }

  function updateLabel() {
    if (!selection) {
      selectionLabel.textContent = "Selecteer een formatie op de kaart";
      return;
    }
    const { props, range } = selection;
    const name = props.LITHOSTRAT ?? "";
    const ouderdom = props.OUDERDOM ?? "";
    selectionLabel.innerHTML = "";
    const strong = document.createElement("strong");
    strong.textContent = name;
    selectionLabel.append(strong);
    if (ouderdom) selectionLabel.append(` · ${ouderdom}`);
    if (!range) selectionLabel.append(" · niet op de tijdschaal gevonden");
  }

  function syncChartToSelection() {
    if (!instance) return;
    if (selection?.range) {
      zoomTo(findFocusInterval(selection.range));
    } else {
      zoomTo(intervals);
    }
    applyHighlight();
  }

  function render() {
    const width = chartContainer.clientWidth;
    if (!width || width === renderedWidth) return;
    renderedWidth = width;

    chartContainer.replaceChildren();
    instance = geoTimescale("#timescale", {
      width,
      height:
        window.innerWidth <= MOBILE_BREAKPOINT
          ? CHART_HEIGHT_MOBILE
          : CHART_HEIGHT,
      intervals,
    });
    svg = chartContainer.querySelector("svg");
    // The library resets its hover highlight on pointerleave; restore ours
    // afterwards (listeners run in registration order)
    svg.addEventListener("pointerleave", applyHighlight);

    syncChartToSelection();
  }

  function isVisible() {
    return !panel.hidden;
  }

  function setVisible(visible) {
    if (visible === isVisible()) return;
    panel.hidden = !visible;
    document.body.classList.toggle("has-timescale", visible);
    try {
      localStorage.setItem(STORAGE_KEY, visible ? "1" : "0");
    } catch {
      // Storage unavailable (private mode, blocked); the toggle still works
    }
    if (visible) render();
    onVisibilityChange?.(visible);
  }

  function select(props) {
    selection = { props, range: parseAgeRange(props.OUDERDOM) };
    updateLabel();
    syncChartToSelection();
  }

  function clear() {
    selection = null;
    updateLabel();
    syncChartToSelection();
  }

  closeButton.addEventListener("click", () => setVisible(false));

  let resizeTimeout;
  new ResizeObserver(() => {
    if (!isVisible()) return;
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(render, RESIZE_DEBOUNCE_MS);
  }).observe(chartContainer);

  updateLabel();

  let remembered = false;
  try {
    remembered = localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // ignore
  }
  if (remembered) setVisible(true);

  return { select, clear, setVisible, isVisible };
}
