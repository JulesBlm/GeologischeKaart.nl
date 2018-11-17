import L from 'leaflet';
// import Data from './data.xml';

/*
SOON
- Show names
- Colours
- Onclick interactiviy

LATER
- Add geotimescale and link it
- Show relief?
*/

const map = L.map('mapid')
    .setView([52.243333, 5.634167], 7)
    .setMaxBounds([
        [50.45, 3.3],
        [54.4, 7.4]
    ]);

L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 11,
    id: 'mapbox.outdoors',
    accessToken: 'pk.eyJ1Ijoid29tcG8iLCJhIjoiN0VyeldPQSJ9.8MYRl2QvtXn9ZJHwJZm5lA'
}).addTo(map);

function style(feature) {
    // let color = "#ff00ff";
    // if (feature.properties.color) { color = feature.properties.color.str.split(" ").join(',') }; 

    // console.log(feature.properties.color, color);
    return {
        fillColor: `rgb(${feature.properties.color})`,
        weight: 0.8,
        opacity: 1,
        color: 'black',
        fillOpacity: 0.7
    };
}

function highlightFeature(e) {
	var layer = e.target;

	layer.setStyle({
		weight: 5,
		color: '#666',
		dashArray: '',
		fillOpacity: 0.7
	});

	if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
		layer.bringToFront();
	}

	info.update(layer.feature.properties);
}


fetch("jsons/geologieNL.geojson").then(function(response) {
    return response.json();
}).then(function(geologicalmap) {
    
    function highlightFeature(e) {
        var layer = e.target;

        layer.setStyle({
            weight: 1,
            fillColor: '#333',
            fillOpacity: 0.7
        });
    
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
    
        info.update(layer.feature.properties);
    }
    
	let geojson;

	function resetHighlight(e) {
		geojson.resetStyle(e.target);
		info.update();
	}

    function clicked(e) {
        console.log(e)
        map.fitBounds(e.target.getBounds());
        info.update(layer.feature.properties);
        console.log("clicked!!", layer.feature.properties)
    }
    
    function onEachFeature(feature, layer) {
        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: clicked
        });
    }
    
    geojson = L.geoJSON(geologicalmap, {
            style: style,
        	onEachFeature: onEachFeature
        }).addTo(map);
})

var info = L.control();

info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info');
    this.update();
    return this._div;
};

info.update = function (props) {
    this._div.innerHTML = `<h4>Formatie</h4> <br /> ${props ? props.CHRONO : "hover dan"}`
};

info.addTo(map);

map.attributionControl.addAttribution('TNO &copy; <a href="https://www.grondwatertools.nl/geologische-overzichtskaart">TNO Geologische Dienst Nederland</a>');
