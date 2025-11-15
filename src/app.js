import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { feature } from "topojson-client";
import {} from "leaflet.vectorgrid/dist/Leaflet.VectorGrid.bundled.js";

import key from "./key.json";

const DEFAULT_MAP_ZOOM = 7;
const map = L.map("map")
  .setView([52.243333, 5.634167], DEFAULT_MAP_ZOOM)
  .setMaxBounds([
    [49, 3.3],
    [55.4, 7.4],
  ]);

map.attributionControl.addAttribution(
  "<a href='https://www.tno.nl/nl/newsroom/2023/03/geologische-kaart-koninkrijk-nederlanden/'>TNO</a>"
);

// Base map layers
const osmLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
});

const satelliteLayer = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
  }
);

osmLayer.addTo(map);

const loadingControl = L.control({ position: "topleft" });
loadingControl.onAdd = function () {
  const div = L.DomUtil.create("div", "loading-indicator");
  div.innerHTML =
    '<div class="loading-spinner"></div><div class="loading-text">Geologische kaart laden...</div>';
  return div;
};
loadingControl.addTo(map);

// Get the URL for the TopoJSON file - Parcel will copy it to dist
const topoJsonUrl = new URL(
  "./GKNederlandGeolVlak-wgs84-topo-balanced.json",
  import.meta.url
).href;

let clicked = false;
let clickedFeature;
let infoElement;
let geomapVector; // Will be set after data loads

const info = L.control({ position: "bottomright" });

info.onAdd = function () {
  this._div = L.DomUtil.create("div", "info");
  this.update();
  return this._div;
};

info.update = function (props) {
  let html = '<div class="info-header"><h1>Info</h1>';

  if (props) {
    html +=
      '<button class="info-close-btn" aria-label="Close info">&times;</button></div>';

    const linkSegment1 =
      props.NAAM2 ?? props.NAAM1
        ? (props.NAAM2 ?? props.NAAM1).toLowerCase().replace(/\s+/g, "-")
        : null;

    const linkSegment2 = props.NAAM3
      ? props.NAAM3.toLowerCase().replace(/\s+/g, "-")
      : null;

    const dinoloket = "https://www.dinoloket.nl/stratigrafische-nomenclator";

    html += `<h2>${props.LITHOSTRAT ?? ""}</h2>
<p><span class='strong'>Ouderdom</span>: ${props.OUDERDOM ?? ""}</p>
<p>${props.OMSCHRIJVI}</p>
`;

    if (linkSegment1) {
      html += `<ul>
<li><a href="${dinoloket}/${linkSegment1}" rel="noopener">Dinoloket Stratigrafische Nomenclator</a></li>
`;

      if (linkSegment2) {
        html += `<li><a href="${dinoloket}/${linkSegment2}" rel="noopener">Dinoloket Stratigrafische Nomenclator 2</a></li>`;
      }

      html += "</ul>";
    }
  } else {
    html += "</div>";
    html +=
      "Beweeg je muis over een formatie, klik er op om deze vast te zetten";
  }

  this._div.innerHTML = html;

  // Add event listener to close button if it exists
  const closeBtn = this._div.querySelector(".info-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      clearSelection();
    });
  }
};

function clearSelection() {
  if (clickedFeature) {
    geomapVector.resetFeatureStyle(clickedFeature);
  }
  clickedFeature = undefined;
  if (infoElement) {
    infoElement.style.cssText = "outline: none";
  }
  clicked = false;
  info.update();
}

function click({ layer }) {
  const { properties } = layer;

  // If clicking the same feature that's already selected, deselect it
  if (clicked && clickedFeature === properties.id) {
    clearSelection();
  } else {
    // Reset previous selection if any
    if (clickedFeature) {
      geomapVector.resetFeatureStyle(clickedFeature);
    }

    // Select the new feature
    clickedFeature = properties.id;
    if (infoElement) {
      infoElement.style.cssText =
        "outline: 1px solid coral; box-shadow: 1px 7px 40px 0px rgba(0,0,0,0.55);";
    }
    clicked = true;

    const style = {
      stroke: true,
      weight: 3,
      color: "#ff6b35",
      fill: true,
      fillColor: "#ff6b35",
      fillOpacity: 0.85,
    };
    geomapVector.setFeatureStyle(properties.id, style);
    info.update(properties);
  }
}

const hoverStyle = {
  stroke: true,
  weight: 2,
  color: "#1E1E1E",
  fill: true,
  fillColor: "#666",
  fillOpacity: 0.6,
};

function hover({ layer }) {
  const { properties } = layer;

  if (properties.id !== clickedFeature) {
    geomapVector.setFeatureStyle(properties.id, hoverStyle);
  }

  layer.bringToFront();

  if (!clicked) {
    info.update(properties);
  }
}

const DEFAULT_OPACITY = 0.8;

async function loadGeologicalMap() {
  try {
    // Fetch as plain JSON - the ?url in development, and Parcel URL in production
    const response = await fetch(topoJsonUrl, {
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    const geologicalmapTopo = JSON.parse(text);

    const geologicalmap = feature(
      geologicalmapTopo,
      geologicalmapTopo.objects["GKNederlandGeolVlak-wgs84"]
    );

    map.removeControl(loadingControl);

    initializeMap(geologicalmap);
  } catch (error) {
    console.error("Error loading geological map:", error);
    const loadingDiv = document.querySelector(".loading-indicator");
    if (loadingDiv) {
      loadingDiv.innerHTML =
        '<div class="loading-error">Error loading map. Please refresh.</div>';
    }
  }
}

function initializeMap(geologicalmap) {
  geomapVector = L.vectorGrid
    .slicer(geologicalmap, {
      vectorTileLayerStyles: {
        sliced: (properties) => {
          const fillColor = key[properties.CODE];

          return {
            stroke: true,
            weight: 0.05,
            opacity: 0.9,
            color: "#333",
            fill: true,
            fillColor,
            fillOpacity: DEFAULT_OPACITY,
          };
        },
      },
      interactive: true,
      getFeatureId: (f) => f.properties.id,
    })
    .on("mouseover", (e) => {
      hover(e);
    })
    .on("touchstart", (e) => {
      hover(e);
    })
    .on("click", (e) => {
      L.DomEvent.stopPropagation(e);
      click(e);
    })
    .on("mouseout", (e) => {
      if (!clicked) info.update();
      if (e.propagatedFrom.properties.id !== clickedFeature)
        geomapVector.resetFeatureStyle(e.propagatedFrom.properties.id);
    })
    .on("touchend", (e) => {
      if (e.propagatedFrom.properties.id !== clickedFeature)
        geomapVector.resetFeatureStyle(e.propagatedFrom.properties.id);
    })
    .addTo(map);

  // Click on map (outside geological features) to deselect
  map.on("click", () => {
    if (clicked) {
      clearSelection();
    }
  });

  info.addTo(map);

  infoElement = document.querySelector(".info");

  L.control.scale().addTo(map);

  const searchControl = L.control({ position: "topright" });

  searchControl.onAdd = function () {
    const div = L.DomUtil.create("div", "search-control");

    div.innerHTML = `
    <div class="search-input-wrapper">
      <input type="text" id="search-input" placeholder="Zoek adres..." />
      <button id="search-clear" class="search-clear-btn" aria-label="Clear search">&times;</button>
    </div>
    <div id="search-results"></div>
  `;

    L.DomEvent.disableClickPropagation(div);

    return div;
  };

  searchControl.addTo(map);

  let searchTimeout;
  const searchInput = document.getElementById("search-input");
  const searchResults = document.getElementById("search-results");
  const searchClearBtn = document.getElementById("search-clear");

  searchClearBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchResults.innerHTML = "";
    searchResults.style.display = "none";
    searchClearBtn.style.display = "none";
  });

  const SEARCH_ZOOM_LEVEL = 12;

  searchResults.addEventListener("click", (e) => {
    const item = e.target.closest(".search-result-item");
    if (item) {
      const lat = parseFloat(item.dataset.lat);
      const lon = parseFloat(item.dataset.lon);
      map.setView([lat, lon], SEARCH_ZOOM_LEVEL);
      searchInput.value = item.textContent.trim();
      searchResults.innerHTML = "";
      searchResults.style.display = "none";
      searchClearBtn.style.display = "block";
    }
  });

  const SEARCH_MIN_CHARS = 3;
  const SEARCH_RESULTS_LIMIT = 5;
  const SEARCH_DEBOUNCE_MS = 300;

  searchInput.addEventListener("input", (e) => {
    searchClearBtn.style.display = e.target.value ? "block" : "none";

    clearTimeout(searchTimeout);
    const query = e.target.value.trim();

    if (query.length < SEARCH_MIN_CHARS) {
      searchResults.innerHTML = "";
      searchResults.style.display = "none";
      return;
    }

    searchTimeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
            `format=json&countrycodes=nl&q=${encodeURIComponent(
              query
            )}&limit=${SEARCH_RESULTS_LIMIT}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }

        const results = await response.json();

        if (results.length === 0) {
          searchResults.innerHTML =
            "<div class='search-result-item'>Geen resultaten</div>";
          searchResults.style.display = "block";
          return;
        }

        searchResults.innerHTML = results
          .map(
            (result) =>
              `<div class='search-result-item' data-lat='${result.lat}' data-lon='${result.lon}'>${result.display_name}</div>`
          )
          .join("");
        searchResults.style.display = "block";
      } catch (error) {
        console.error("Search error:", error);
      }
    }, SEARCH_DEBOUNCE_MS);
  });

  const layerControl = L.control({ position: "topright" });

  layerControl.onAdd = function () {
    const div = L.DomUtil.create("div", "layer-control");

    div.innerHTML = `
    <div class="layer-control-section">
      <h3>Ondergrond</h3>
      <label><input type="radio" name="baselayer" value="osm" checked> Stratenkaart</label>
      <label><input type="radio" name="baselayer" value="satellite"> Satelliet</label>
    </div>
    <div class="layer-control-section">
      <h3>Geologische Kaart</h3>
      <label for="opacity-slider">Transparantie</label>
      <input type="range" id="opacity-slider" min="0" max="100" value="80" />
    </div>
  `;

    L.DomEvent.disableClickPropagation(div);

    return div;
  };

  layerControl.addTo(map);

  // Base layer switching
  document.querySelectorAll('input[name="baselayer"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      if (e.target.value === "osm") {
        map.removeLayer(satelliteLayer);
        map.addLayer(osmLayer);
      } else {
        map.removeLayer(osmLayer);
        map.addLayer(satelliteLayer);
      }
      geomapVector.bringToFront();
    });
  });

  // Opacity control
  document.getElementById("opacity-slider").addEventListener("input", (e) => {
    const opacity = e.target.value / 100;
    geomapVector.setOpacity(opacity);
  });
}

loadGeologicalMap();
