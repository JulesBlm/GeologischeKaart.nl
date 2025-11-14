import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { feature } from "topojson-client";
import {} from "leaflet.vectorgrid/dist/Leaflet.VectorGrid.bundled.js";

import geologicalmapTopo from "./GKNederlandGeolVlak-wgs84-topo.json";
import key from "./key.json";

const geologicalmap = feature(
  geologicalmapTopo,
  geologicalmapTopo.objects["GKNederlandGeolVlak-wgs84"]
);

const map = L.map("map")
  .setView([52.243333, 5.634167], 7)
  .setMaxBounds([
    [49, 3.3],
    [55.4, 7.4],
  ]);

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

let clicked = false;
let clickedFeature;

function click({ layer }) {
  const { properties } = layer;
  geomapVector.resetFeatureStyle(clickedFeature);

  if (clicked) {
    clickedFeature = undefined;
    document.querySelector(".info").style.cssText = "outline: none";
  } else {
    clickedFeature = properties.id;
    document.querySelector(".info").style.cssText =
      "outline: 1px solid coral; box-shadow: 1px 7px 40px 0px rgba(0,0,0,0.55);";
  }

  clicked = !clicked;

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

const geomapVector = L.vectorGrid
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
          fillOpacity: 0.8,
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

const info = L.control({ position: "bottomright" });

info.onAdd = function () {
  this._div = L.DomUtil.create("div", "info");
  this.update();

  return this._div;
};

info.update = function (props) {
  let html = "<h1>Info</h1>";

  if (props) {
    const linkSegment1 = (props.NAAM2 ?? props.NAAM1)
      .toLowerCase()
      .replace(/\s+/g, "-");

    const linkSegment2 = props.NAAM3
      ? props.NAAM3.toLowerCase().replace(/\s+/g, "-")
      : null;

    const dinoloket = "https://www.dinoloket.nl/stratigrafische-nomenclator";

    html += `<h2>${props.LITHOSTRAT}</h2>
<p><span class='strong'>Ouderdom</span>: ${props.OUDERDOM}</p>
<p>${props.OMSCHRIJVI}</p>
<ul>
<li><a href="${dinoloket}/${linkSegment1}" rel="noopener">Dinoloket Stratigrafische Nomenclator</a></li>
`;

    if (linkSegment2) {
      html += `<li><a href="${dinoloket}/${linkSegment2}" rel="noopener">Dinoloket Stratigrafische Nomenclator 2</a></li>`;
    }

    html += "</ul>";
  } else {
    html +=
      "Beweeg je muis over een formatie, klik er op om deze vast te zetten";
  }

  this._div.innerHTML = html;
};

info.addTo(map);

L.control.scale().addTo(map);

// Geocoding search control
const searchControl = L.control({ position: "topright" });

searchControl.onAdd = function () {
  const div = L.DomUtil.create("div", "search-control");

  div.innerHTML = `
    <input type="text" id="search-input" placeholder="Zoek adres..." />
    <div id="search-results"></div>
  `;

  L.DomEvent.disableClickPropagation(div);

  return div;
};

searchControl.addTo(map);

let searchTimeout;
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");

searchInput.addEventListener("input", (e) => {
  clearTimeout(searchTimeout);
  const query = e.target.value.trim();

  if (query.length < 3) {
    searchResults.innerHTML = "";
    searchResults.style.display = "none";
    return;
  }

  searchTimeout = setTimeout(async () => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          `format=json&countrycodes=nl&q=${encodeURIComponent(query)}&limit=5`
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
            `<div class='search-result-item' data-lat='${result.lat}' data-lon='${result.lon}'>
          ${result.display_name}
        </div>`
        )
        .join("");
      searchResults.style.display = "block";

      // Add click handlers to results
      document.querySelectorAll(".search-result-item").forEach((item) => {
        item.addEventListener("click", () => {
          const lat = parseFloat(item.dataset.lat);
          const lon = parseFloat(item.dataset.lon);
          map.setView([lat, lon], 12);
          searchInput.value = item.textContent;
          searchResults.innerHTML = "";
          searchResults.style.display = "none";
        });
      });
    } catch (error) {
      console.error("Search error:", error);
    }
  }, 300);
});

// Combined layer and opacity control
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
  });
});

// Opacity control
document.getElementById("opacity-slider").addEventListener("input", (e) => {
  const opacity = e.target.value / 100;
  geomapVector.setOpacity(opacity);
});

map.attributionControl.addAttribution(
  "<a href='https://www.tno.nl/nl/newsroom/2023/03/geologische-kaart-koninkrijk-nederlanden/'>TNO</a>"
);
