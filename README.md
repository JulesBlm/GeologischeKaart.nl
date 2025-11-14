# GeologischeKaart.nl

Interactive geological map of the Netherlands using TNO Geologische Dienst data.

## Setup

```bash
npm install
npm start
```

Build for production:
```bash
npm run build
```

## Tech Stack

- Leaflet.js for map rendering
- Leaflet.VectorGrid for efficient vector tile rendering
- TopoJSON for compressed geological data (5.7MB vs 34MB GeoJSON)
- Parcel for bundling

## Data

Geological formations from [TNO Geological Survey](https://www.tno.nl/nl/newsroom/2023/03/geologische-kaart-koninkrijk-nederlanden/).

Color codes are mapped in `src/key.json` using formation codes (e.g., "NA1", "BX3", "DR1").

