import L from "leaflet";
import { feature } from "topojson-client";
import {} from "leaflet.vectorgrid/dist/Leaflet.VectorGrid.bundled.js"

import key from "./key"
import './main.css';
// import 'leaflet/dist/leaflet.css';

let timescaleDrawn = false;

const map = L.map("mapid")
    .setView([52.243333, 5.634167], 7)
    .setMaxBounds([
        [49, 3.3],
        [55.4, 7.4]
    ]);

// Add the base map
L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
    attribution: "Map data &copy; <a href='https://www.openstreetmap.org/'>OpenStreetMap</a> contributors, <a href='https://creativecommons.org/licenses/by-sa/2.0/'>CC-BY-SA</a>, Imagery © <a href='https://www.mapbox.com/'>Mapbox</a>",
    maxZoom: 13,
    id: "mapbox.outdoors",
    accessToken: MAPBOX_ACCESS_TOKEN
}).addTo(map);

fetch("jsons/geologieNL.topojson").then(function(response) {
    return response.json();
}).then(function(geologicalmap) {
    
    let geomapVector;
    let clicked = false;
    let clickedFeature;
    
    function click({layer}) {
        const {properties} = layer;
        geomapVector.resetFeatureStyle(clickedFeature);
        if (clicked) {
            clickedFeature = undefined;
            document.querySelector(".info").style.cssText = "border: none";
        } else {
            clickedFeature = properties.id;
            document.querySelector(".info").style.cssText = "border: 2px solid coral; box-shadow: 1px 7px 40px 0px rgba(0,0,0,0.75);"; 
        }
        clicked = !clicked;

        const style = {
            stroke: true,
            weight: 2,
            color: `coral`,
            fill: true,
            fillColor: `coral`,
            fillOpacity: 0.6
        };
        geomapVector.setFeatureStyle(properties.id, style);
        info.update(properties);
        if (timescaleDrawn) timescale.goToName(properties.period)
    }

    function hover({layer}) {
        const { properties } = layer;
    
        // Move out of this function
        const style = {
            stroke: true,
            weight: 2,
            color: `#1E1E1E`,
            fill: true,
            fillColor: `#666`,
            fillOpacity: 0.6
        };
    
        if (properties.id !== clickedFeature) geomapVector.setFeatureStyle(properties.id, style);
    
        layer.bringToFront();
    
        if (!clicked) { info.update(properties); }
    }
    
    geomapVector = L.vectorGrid.slicer(feature(geologicalmap, geologicalmap.objects.geologieNL), {
                vectorTileLayerStyles: {
                    sliced: function(properties, zoom) {
                        return {
                            stroke: true,
                            weight: 0.05,
                            opacity: 0.9,
                            color: `#333`,
                            fill: true,
                            fillColor: `rgb(${key[properties.mapCode].color})`,
                            fillOpacity: 0.8
                        }
                    }
                },
                interactive: true,
                getFeatureId: (f) => f.properties.id
                }).on(`mouseover`, e => {
                    hover(e);
                }).on(`touchstart`, e => {
                    hover(e);
                }).on("click", e => {
                    click(e);
                }).on(`mouseout`, e => {
                    if (!clicked) info.update()
                    if (e.layer.properties.id !== clickedFeature) geomapVector.resetFeatureStyle(e.layer.properties.id);
                }).on(`touchend`, e => {
                    if (e.layer.properties.id !== clickedFeature) geomapVector.resetFeatureStyle(e.layer.properties.id);
                }).addTo(map);
})

const info = L.control();

info.onAdd = function(map) {
    this._div = L.DomUtil.create("div", "info");
    this.update();
    return this._div;
};

info.update = function (props) {
    this._div.innerHTML = `<h4>Formatie</h4> <br /> ${props ? `<strong>${props.period} ${props.period}</strong> <p> ${key[props.mapCode].info}</p>` : "Beweeg je muis over een formatie, klik er op om deze vast te zetten. Klik op Tijdschaal onderin om een geologische tijdschaal te vertonen."}`
};

info.addTo(map);

L.control.scale().addTo(map);
map.attributionControl.addAttribution("Geologische Kaart &copy; <a href='https://www.grondwatertools.nl/geologische-overzichtskaart'>TNO Geologische Dienst Nederland</a>");

let timescaleShown = false;
let timescale; // So when a feature is clicked it can acces timescale function, scope

// On click of show timescale button lazy load timescale.js and initialize it
document.querySelector("#showgeotimescale").onclick = (e) => {
    return import(/* webpackChunkName: "timescale" */ './timescale').then(module => {
        timescale = module.default;
        console.log("Show timescale")
        const leafletMap = document.querySelector("#mapid");
        const ghIcon = document.querySelector("#github");
        if (!timescaleDrawn) {
            timescale.init("geotimescale");
            timescaleDrawn = true;
        }    
        
        if (!timescaleShown) {
            ghIcon.style.cssText = "bottom: 180px";
            leafletMap.style.cssText = "height: calc(100vh - 170px)";
        } else {
            leafletMap.style.cssText = "height: 100vh;";
            ghIcon.style.cssText = "bottom: 20px";
        }
        timescaleShown = !timescaleShown;
    }).catch(error => 'An error occurred while loading the component');
};