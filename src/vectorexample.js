

		var map = L.map('map');

		var cartodbAttribution = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>';

		var positron = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
			attribution: cartodbAttribution,
			opacity: 1
		}).addTo(map);

		var highlight;
		var clearHighlight = function() {
			if (highlight) {
				vectorGrid.resetFeatureStyle(highlight);
			}
			highlight = null;
        };
        
		var vectorGrid = L.vectorGrid.slicer( euCountries, {
			rendererFactory: L.svg.tile,
			vectorTileLayerStyles: {
				sliced: function(properties, zoom) {
					var p = properties.mapcolor7 % 5;
					return {
                        fill: true,
						fillColor: p === 0 ? '#800026' :
								p === 1 ? '#E31A1C' :
								p === 2 ? '#FEB24C' :
								p === 3 ? '#B2FE4C' : '#FFEDA0',
						fillOpacity: 0.5,
						stroke: true,
						color: 'black',
						weight: 0,
					}
				}
			},
			interactive: true,
			getFeatureId: function(f) {
				return f.properties.wb_a3;
			}
		})
		.on('mouseover', function(e) {
			var properties = e.layer.properties;
			L.popup()
				.setContent(properties.name || properties.type)
				.setLatLng(e.latlng)
				.openOn(map);

			clearHighlight();
			highlight = properties.wb_a3;

			var p = properties.mapcolor7 % 5;
			var style = {
				fillColor: '#800026',
				fillOpacity: 0.5,
				fillOpacity: 1,
				stroke: true,
				fill: true,
				color: 'red',
				opacity: 1,
				weight: 2,
			};

			vectorGrid.setFeatureStyle(properties.wb_a3, style);
		})
		.addTo(map);

		map.on('click', clearHighlight);

		map.setView({ lat: 47.040182144806664, lng: 9.667968750000002 }, 5);

	