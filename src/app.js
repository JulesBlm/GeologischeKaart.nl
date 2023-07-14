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

const map = L.map("mapid")
  .setView([52.243333, 5.634167], 7)
  .setMaxBounds([
    [49, 3.3],
    [55.4, 7.4],
  ]);

// Add the base map
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

let clicked = false;
let clickedFeature;

function click({ layer }) {
  const { properties } = layer;
  geomapVector.resetFeatureStyle(clickedFeature);

  if (clicked) {
    clickedFeature = undefined;
    document.querySelector(".info").style.cssText = "border: none";
  } else {
    clickedFeature = properties.id;
    document.querySelector(".info").style.cssText =
      "border: 1px solid coral; box-shadow: 1px 7px 40px 0px rgba(0,0,0,0.55);";
  }

  clicked = !clicked;

  const style = {
    stroke: true,
    weight: 2,
    color: "coral",
    fill: true,
    fillColor: "coral",
    fillOpacity: 0.6,
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

  if (properties.id !== clickedFeature)
    geomapVector.setFeatureStyle(properties.id, hoverStyle);

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
    // if (!clicked) info.update();
    if (e.propagatedFrom.properties.id !== clickedFeature)
      geomapVector.resetFeatureStyle(e.propagatedFrom.properties.id);
  })
  .on("touchend", (e) => {
    if (e.propagatedFrom.properties.id !== clickedFeature)
      geomapVector.resetFeatureStyle(e.propagatedFrom.properties.id);
  })
  .addTo(map);

const info = L.control();

info.onAdd = function() {

  this._div = L.DomUtil.create("div", "info");
  this.update();

  return this._div;
};

info.update = function(props) {
  let html = "<h1>Info</h4>"

  html += props ? `<h2>${props.LITHOSTRAT}</h2>
<p><span class='strong'>Ouderdom</span>: ${props.OUDERDOM}</p>
<p>${props.OMSCHRIJVI}</p>
<a href="${props.VERWIJZING}" rel="noopener">Dinoloket</a>
` :"Beweeg je muis over een formatie, klik er op om deze vast te zetten"

  this._div.innerHTML = html;
};

info.addTo(map);

L.control.scale().addTo(map);

map.attributionControl.addAttribution(
  "<a href='https://www.tno.nl/nl/newsroom/2023/03/geologische-kaart-koninkrijk-nederlanden/'>TNO</a>"
);
