import L from "leaflet";
import { feature } from "topojson-client";
import {} from "leaflet.vectorgrid/dist/Leaflet.VectorGrid.bundled.js"

// import leaflet css bundle and minify css with webpack
/*
SOON
- RIGHT COLORS?!
- Onclick interactiviy (zoom to?)

LATER
- Iets beters dan GeoJSON verzinnen?
- Show relief or option for satellite background?
- Op zoom getailleerdere kaart laden
- Uit meerdere layers kunnen kiezen
    - Composite layers http://bl.ocks.org/rclark/6705915
    - Check how Macrostat solves this

- MAKE file voor die facking ArcGis naar GeoJSON met kleur etc of zieke oneliner
    1. ogr2ogr shp to geojson
    2. geojson-pick KRTCODE LAND CHRONO_PER CHRONO_EPO < origininelli.geojson > clean.geojson
    3. geojson-join --format=csv     colors.csv     --againstField=CODE_ATLAS     --geojsonField=CODE_ATLAS < geologieNL.json> merged.json
    4. geo2topo

1. Only pick properties we will use in geoJSON
2. Convert to TopoJSON
    geo2topo 

- Update to 2018 map when available
- Links to DinoLoket for formation descriptions
- Geologie van Zuid-Limburg Fly-to Tour
    - Berendsen 2008 -> potrace to geojson -> to mooi formaat
*/

const key = {
    "Sb1": {info:`Bligh Bank Lp.; zeezand`, color: `230,255,191`},
    "Sb2": {info:`Terschellingerbank Lp.; omgewerkt (peri-)glaciaal slibhoudend zeezand (slib <10%)`, color: `191,255,166`},
    "Sb3": {info:`Buitenbanken Lp.; omgewerkt grindhoudend rivierzand`, color: `255,191,0`},
    "Sb4": {info:`Indefatigable Grounds Lp.; omgewerkt glaciaal grind en grindhoudend zand`, color: `255,230,217`},
    "U1": {info:`Urania Formatie Western Mud Hole Lp.;zeer fijn omgewerkt (peri-)glaciaal zand en slib (slib >10%)`, color:`153,255,128`},
    "U2": {info:`Urania Formatie Well Hole Lp.; uiterst fijn tot zeer fijn (slbihoudend) zeezand en slib`, color:`204,204,102`},
    "Na1": {info:`<a href="https://www.dinoloket.nl/formatie-van-naaldwijk" target="_blank" rel="noopener">Laagpakket van Schoorl</a> / Zandvoort; duin- en strandzand`, color:`255,255,204`},
    "Na2": {info:`<a href="https://www.dinoloket.nl/formatie-van-naaldwijk" target="_blank" rel="noopener">Formatie van Naaldwijk</a>; zeeklei en -zand`, color:`230,230,74`},
    "Na3": {info:`<a href="https://www.dinoloket.nl/formatie-van-naaldwijk" target="_blank" rel="noopener">Formatie van Naaldwijk</a> / <a href="https://www.dinoloket.nl/formatie-van-nieuwkoop" target="_blank" rel="noopener">Formatie van Nieuwkoop</a>; zeeklei en -zand met inschakelingen van veen`, color:`145,171,0`},
    "Na4": {info:`<a href="https://www.dinoloket.nl/formatie-van-naaldwijk" target="_blank" rel="noopener">Formatie van Naaldwijk</a> op <a href="https://www.dinoloket.nl/formatie-van-nieuwkoop" target="_blank" rel="noopener">Formatie van Nieuwkoop</a>; zeeklei op veen`, color:`217,191,125`},
    "Na5": {info:`<a href="https://www.dinoloket.nl/formatie-van-naaldwijk" target="_blank" rel="noopener">Formatie van Naaldwijk</a> op Pleistocene formaties; zeeklei en -zand op zand`, color:`230,242,125`},
    "Na6": {info:`<a href="https://www.dinoloket.nl/formatie-van-naaldwijk" target="_blank" rel="noopener">Laagpakket van Walcheren</a>; zeeklei en -zand`, color:`230,230,77`},
    "Na7": {info:`<a href="https://www.dinoloket.nl/formatie-van-naaldwijk" target="_blank" rel="noopener">Laagpakket van Walcheren</a> / <a href="https://www.dinoloket.nl/formatie-van-nieuwkoop" target="_blank" rel="noopener">Formatie van Nieuwkoop</a>; zeeklei en -zand met inschakelingen van veen`, color:`217,191,128`},
    "Na8": {info:`<a href="https://www.dinoloket.nl/formatie-van-naaldwijk" target="_blank" rel="noopener">Laagpakket van Walcheren</a> op <a href="https://www.dinoloket.nl/formatie-van-nieuwkoop" target="_blank" rel="noopener">Formatie van Nieuwkoop</a>; zeeklei op veen`, color:`179,153,51`},
    "Na9": {info:`<a href="https://www.dinoloket.nl/formatie-van-naaldwijk" target="_blank" rel="noopener">Laagpakket van Walcheren</a> op <a href="https://www.dinoloket.nl/formatie-van-nieuwkoop" target="_blank" rel="noopener">Formatie van Nieuwkoop</a> op <a href="https://www.dinoloket.nl/formatie-van-naaldwijk" target="_blank" rel="noopener">Laagpakket van Schoorl</a> / Zandvoort; zeeklei op veen op duin- en strandzand`, color:`204,255,128`},
    "Na10": {info:`<a href="https://www.dinoloket.nl/formatie-van-naaldwijk" target="_blank" rel="noopener">Laagpakket van Walcheren</a> op <a href="https://www.dinoloket.nl/formatie-van-naaldwijk" target="_blank" rel="noopener">Laagpakket van Schoorl</a> / Zandvoort; zeeklei op duin- en strandzand`, color:`102,179,51`},
    "Na11": {info:`<a href="https://www.dinoloket.nl/formatie-van-naaldwijk" target="_blank" rel="noopener">Laagpakket van Walcheren</a> op <a href="https://www.dinoloket.nl/formatie-van-nieuwkoop" target="_blank" rel="noopener">Formatie van Nieuwkoop</a> / <a href="https://www.dinoloket.nl/formatie-van-echteld" target="_blank" rel="noopener">Formatie van Echteld</a>; zeeklei en -zand op veen met inschakelingen van rivierklei en -zand`, color:`204,230,102`},
    "Na12": {info:`<a href="https://www.dinoloket.nl/formatie-van-naaldwijk" target="_blank" rel="noopener">Laagpakket van Walcheren</a> op <a href="https://www.dinoloket.nl/formatie-van-echteld" target="_blank" rel="noopener">Formatie van Echteld</a>; zeeklei op rivierzand en -klei`, color:`179,217,51`},
    "Na13": {info:`<a href="https://www.dinoloket.nl/formatie-van-naaldwijk" target="_blank" rel="noopener">Laagpakket van Walcheren</a> op <a href="https://www.dinoloket.nl/formatie-van-nieuwkoop" target="_blank" rel="noopener">Formatie van Nieuwkoop</a>, Hollandveen Lp. op <a href="https://www.dinoloket.nl/formatie-van-naaldwijk" target="_blank" rel="noopener">Laagpakket van Wormer</a>; zeeklei op veen op zeeklei en -zand`, color:`179,242,77`},
    "Na14": {info:`<a href="https://www.dinoloket.nl/formatie-van-naaldwijk" target="_blank" rel="noopener">Laagpakket van Walcheren</a> op <a href="https://www.dinoloket.nl/formatie-van-naaldwijk" target="_blank" rel="noopener">Laagpakket van Wormer</a>; zeeklei en -zand`, color:`230,242,128`},
    "Na15": {info:`<a href="https://www.dinoloket.nl/formatie-van-naaldwijk" target="_blank" rel="noopener">Laagpakket van Walcheren</a> op Pleistocene formaties; zeeklei op zand`, color:`153,179,89`},
    "Na16": {info:`<a href="https://www.dinoloket.nl/formatie-van-naaldwijk" target="_blank" rel="noopener">Laagpakket van Wormer</a>; zeeklei en -zand`, color:`89,153,77`},
    "Na17": {info:`<a href="https://www.dinoloket.nl/formatie-van-naaldwijk" target="_blank" rel="noopener">Laagpakket van Wormer</a> / <a href="https://www.dinoloket.nl/formatie-van-nieuwkoop" target="_blank" rel="noopener">Formatie van Nieuwkoop</a>; zeeklei en -zand met inschakelingen van veen`, color:`191,128,89`},
    "Ni1": {info:`<a href="https://www.dinoloket.nl/formatie-van-nieuwkoop" target="_blank" rel="noopener">Formatie van Nieuwkoop</a>; veen`, color:`153,115,64`},
    "Ni2": {info:`Hollandveen Lp. op <a href="https://www.dinoloket.nl/formatie-van-naaldwijk" target="_blank" rel="noopener">Formatie van Naaldwijk</a>, Lp. van Wormer; veen op zeeklei en -zand`, color:`230,204,166`},
    "Ni3": {info:`<a href="https://www.dinoloket.nl/formatie-van-nieuwkoop" target="_blank" rel="noopener">Formatie van Nieuwkoop</a> / <a href="https://www.dinoloket.nl/formatie-van-echteld" target="_blank" rel="noopener">Formatie van Echteld</a>; veen met inschakelingen van rivierklei en -zand`, color:`230,145,84`},
    "Ni4": {info:`<a href="https://www.dinoloket.nl/formatie-van-nieuwkoop" target="_blank" rel="noopener">Formatie van Nieuwkoop</a> op <a href="https://www.dinoloket.nl/formatie-van-naaldwijk" target="_blank" rel="noopener">Formatie van Naaldwijk</a>}, <a href="https://www.dinoloket.nl/formatie-van-naaldwijk" target="_blank" rel="noopener">Laagpakket van Schoorl</a> / Zandvoort; veen op duin- en strandzand`, color:`128,77,77`},
    "Ni5": {info:`Laagpakket van Griendtsveen; veen`, color:`230,255,242`},
    "Ec1": {info:`<a href="https://www.dinoloket.nl/formatie-van-echteld" target="_blank" rel="noopener">Formatie van Echteld</a>; rivierklei op rivierzand`, color:`179,255,217`},
    "Ec2": {info:`<a href="https://www.dinoloket.nl/formatie-van-echteld" target="_blank" rel="noopener">Formatie van Echteld</a> / <a href="https://www.dinoloket.nl/formatie-van-nieuwkoop" target="_blank" rel="noopener">Formatie van Nieuwkoop</a>; rivierklei en -zand met inschakelingen van veen`, color:`153,255,217`},
    "Ec3": {info:`<a href="https://www.dinoloket.nl/formatie-van-echteld" target="_blank" rel="noopener">Formatie van Echteld</a> / <a href="https://www.dinoloket.nl/formatie-van-nieuwkoop" target="_blank" rel="noopener">Formatie van Nieuwkoop</a> op <a href="https://www.dinoloket.nl/formatie-van-naaldwijk" target="_blank" rel="noopener">Formatie van Naaldwijk</a>; rivierklei en -zand met inschakelingen van veen op zeeklei en -zand`, color:`166,230,191`},
    "Ec4": {info:`<a href="https://www.dinoloket.nl/formatie-van-echteld" target="_blank" rel="noopener">Formatie van Echteld</a> / <a href="https://www.dinoloket.nl/formatie-van-nieuwkoop" target="_blank" rel="noopener">Formatie van Nieuwkoop</a> op <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Formatie van Boxtel</a>; rivierklei en -zand met inschakelingen van veen op zand`, color:`153,204,179`},
    "Ec5": {info:`<a href="https://www.dinoloket.nl/formatie-van-echteld" target="_blank" rel="noopener">Formatie van Echteld</a> op <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Formatie van Boxtel</a>; rivierklei op zand`, color:`140,179,153`},
    "Ec6": {info:`<a href="https://www.dinoloket.nl/formatie-van-echteld" target="_blank" rel="noopener">Formatie van Echteld</a> op Formatie van Kreftenheye; rivierklei op rivierzand en -grind`, color:`128,153,128`},
    "Ec7": {info:`<a href="https://www.dinoloket.nl/formatie-van-echteld" target="_blank" rel="noopener">Formatie van Echteld</a> op <a href="https://www.dinoloket.nl/formatie-van-beegden" target="_blank" rel="noopener">Formatie van Beegden</a>; rivierklei op rivierzand en -grind`, color:`255,255,140`},
    "Bx1": {info:`<a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Laagpakket van Kootwijk</a>; stuifzand`, color:`204,191,77`},
    "Bx2": {info:`<a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Laagpakket van Singraven</a>; beekzand en -leem`, color:`153,153,77`},
    "Bx3": {info:`<a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Laagpakket van Singraven</a>; veen`, color:`242,255,140`},
    "Bx4": {info:`<a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Laagpakket van Delwijnen</a>; rivierduinzand`, color:`255,217,102`},
    "Bx5": {info:`<a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Laagpakket van Wierden</a>; dekzand`, color:`255,191,38`},
    "Bx6": {info:`<a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Formatie van Boxtel</a> met een dek van het <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Laagpakket van Wierden</a>; fluvioperiglaciale afzettingen (leem en zand) met een zanddek`, color:`230,217,128`},
    "Bx7": {info:`<a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Laagpakket van Schimmert</a>; leem (löss)`, color:`230,204,51`},
    "Bx8": {info:`<a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Laagpakket van Schimmert</a> op gestuwde afzettingen; zandige leem (löss) op gestuwd zand en -grind`, color:`204,102,25`},
    "Bx9": {info:`<a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Laagpakket van Wierden</a> op <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Formatie van Boxtel</a>; dekzand op veen`, color:`217,230,255`},
    "Be1": {info:`<a href="https://www.dinoloket.nl/formatie-van-beegden" target="_blank" rel="noopener">Laagpakket van Oost-Maarland</a>; rivierklei op rivierzand en -grind`, color:`191,217,255`},
    "Be2": {info:`<a href="https://www.dinoloket.nl/formatie-van-beegden" target="_blank" rel="noopener">Formatie van Beegden</a>; rivierklei op rivierzand en -grind`, color:`140,191,255`},
    "Be3": {info:`<a href="https://www.dinoloket.nl/formatie-van-beegden" target="_blank" rel="noopener">Formatie van Beegden</a>; rivierzand en -grind`, color:`115,166,255`},
    "Be4": {info:`<a href="https://www.dinoloket.nl/formatie-van-beegden" target="_blank" rel="noopener">Formatie van Beegden</a> veelal met een dek van de <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Formatie van Boxtel</a>, <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Laagpakket van Wierden</a>; rivierzand en -grind veelal met een zanddek`, color:`89,140,255`},
    "Be5": {info:`<a href="https://www.dinoloket.nl/formatie-van-beegden" target="_blank" rel="noopener">Formatie van Beegden</a> met een dek van de <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Formatie van Boxtel</a>, <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Laagpakket van Schimmert</a>; rivierzand en -grind met een dek van leem`, color:`204,217,230`},
    "Kr1": {info:`Formatie van Kreftenheye; rivierzand en -grind`, color:`166,191,230`},
    "Kr2": {info:`Laagpakket van Well met een dek van de <a href="https://www.dinoloket.nl/formatie-van-beegden" target="_blank" rel="noopener">Formatie van Beegden</a>; rivierzand en -grind met een dun dek van zand en klei`,color:`255,204,204`},
    "Dr1": {info:`<a href="https://www.dinoloket.nl/formatie-van-drente" target="_blank" rel="noopener">Laagpakket van Gieten</a>; grondmorene (zandige en grindige leem, keileem)`,color:`255,140,204`},
    "Dr2": {info:`<a href="https://www.dinoloket.nl/formatie-van-drente" target="_blank" rel="noopener">Laagpakket van Gieten</a> met een dek van de <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Formatie van Boxtel</a>, <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Laagpakket van Wierden</a>; grondmorene met een zanddek`,color:`255,179,204`},
    "Dr3": {info:`<a href="https://www.dinoloket.nl/formatie-van-drente" target="_blank" rel="noopener">Laagpakket van Gieten</a> op gestuwde afzettingen; grondmorene op gestuwd zand en grind`,color:`255,77,204`},
    "Dr4": {info:`<a href="https://www.dinoloket.nl/formatie-van-drente" target="_blank" rel="noopener">Laagpakket van Gieten</a> en oudere gestuwde afzettingen; grondmorene en oudere gestuwde afzettingen`,color:`191,153,179`},
    "Dr5": {info:`Laagpakket van Schaarsbergen; glaciofluviale afzettingen (grof zand en grind)`,color:`230,153,25`},
    "Dn1": {info:`<a href="https://www.dinoloket.nl/formatie-van-drachten" target="_blank" rel="noopener">Formatie van Drachten</a> met een dek van de Fm. van Boxtel, <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Laagpakket van Wierden</a>; fluvioperiglaciale afzettingen (leem en zand) met een zanddek`,color:`0,255,204`},
    "Ur1": {info:`Laagpakket van Lingsfort; rivierzand en -grind`,color:`230,242,204`},
    "Pe1": {info:`<a href="https://www.dinoloket.nl/formatie-van-peelo" target="_blank" rel="noopener">Formatie van Peelo</a>; glaciofluviale afzettingen (grof tot fijn zand) en glaciolacustriene afzettingen (zwak siltige klei}, potklei)`,color:`166,179,217`},
    "St1": {info:`<a href="https://www.dinoloket.nl/formatie-van-peelo" target="_blank" rel="noopener">Formatie van Sterksel</a> met een dek van de <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Formatie van Boxtel</a>; rivierzand en -grind met een zanddek`,color:`77,77,255`},
    "Sy1": {info:`<a href="https://www.dinoloket.nl/formatie-van-peelo" target="_blank" rel="noopener">Formatie van Stamproy</a> met een dek van de <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Formatie van Boxtel</a>; fijn tot grof zand en leem met een zanddek`,color:`255,102,153`},
    "Wa1": {info:`<a href="https://www.dinoloket.nl/formatie-van-waalre" target="_blank" rel="noopener">Formatie van Waalre</a> met een dek van de <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Formatie van Boxtel</a>; rivierzand en -klei met een zanddek`,color:`179,217,255`},
    "UAP1": {info:`Formatie van Urk, Appelscha en Peize; door zouttektoniek omhooggedrukt rivierzand en -grind`,color:`204,166,255`},
    "G1": {info:`Gestuwde Pleistocene formaties, veelal rivierzand en -grind`,color:`128,89,128`},
    "G2": {info:`Gestuwde Tertiaire formaties, veelal zeeklei en -zand`,color:`255,255,191`},
    "Ki1": {info:`Kiezeloölietformatie Laagpakket van Waubach; rivierzand en -grind`,color:`255,242,128`},
    "Ki2": {info:`Kiezeloölietformatie Laagpakket van Waubach met een dek van de <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Formatie van Boxtel</a>}, <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Laagpakket van Schimmert</a>; rivierzand en -grind met een dek van leem`,color:`255,242,64`},
    "Oo1": {info:`Formatie van Oosterhout; zeezand`,color:`242,217,0`},
    "Br1": {info:`<a href="https://www.dinoloket.nl/formatie-van-breda" target="_blank" rel="noopener">Formatie van Breda</a> veelal met een dek van de <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Formatie van Boxtel</a>; strandzand}, zeezand en -klei veelal met een dek van leem}, zand of hellingafzettingen`,color:`204,255,0`},
    "Ru1": {info:`Rupelformatie Laagpakket van Boom veelal met een dek van de <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Formatie van Boxtel</a>; zeeklei veelal met een zanddek`,color:`191,242,0`},
    "Ru2": {info:`Rupelformatie Laagpakket van Boom / Bilzen veelal met een dek van de <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Formatie van Boxtel</a>; strandzand}, zeezand en -klei veelal met een dek van leem of hellingafzettingen`,color:`102,204,0`},
    "To1": {info:`<a href="https://www.dinoloket.nl/formatie-van-tongeren" target="_blank" rel="noopener">Formatie van Tongeren</a> veelal met een dek van de <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Formatie van Boxtel</a>; zeezand en -klei veelal met een dek van leem of hellingafzettingen`,color:`3,128,128`},
    "Do1": {info:`<a href="https://www.dinoloket.nl/formatie-van-dongen" target="_blank" rel="noopener">Formatie van Dongen</a> veelal met een dek van de <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Formatie van Boxtel</a>; zeezand en -klei veelal met een zanddek`,color:`166,230,153`},
    "Mt1": {info:`Formatie van Maastricht veelal met een dek van de <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Formatie van Boxtel</a>; kalksteen veelal met een dek van leem of hellingafzettingen`,color:`128,230,128`},
    "Gu1": {info:`Formatie van Gulpen veelal met een dek van de <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Formatie van Boxtel</a>; kalksteen veelal met een dek van leem of hellingafzettingen`,color:`64,230,77`},
    "Va1": {info:`Formatie van Vaals veelal met een dek van de <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Formatie van Boxtel</a>; zand(steen) of klei veelal met een dek van leem of hellingafzettingen`,color:`0,217,0`},
    "Ak1": {info:`Formatie van Aken veelal met een dek van de <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Formatie van Boxtel</a>; zand(steen) en klei veelal met een dek van leem of hellingafzettingen`,color:`0,191,0`},
    "VZK1": {info:`Vlieland Zandsteen en Kleisteen Fm. veelal met een dek van de <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Formatie van Boxtel</a>; mariene zand- en kleisteen veelal met een zanddek`,color:`128,102,179`},
    "MR1": {info:`Muschelkalk en Röt Fm. veelal met een dek van de <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Formatie van Boxtel</a>; kalksteen en kleisteen veelal met een zanddek`,color:`128,102,179`},
    "Ep1": {info:`Formatie van Epen, veelal met een dek van de <a href="https://www.dinoloket.nl/formatie-van-boxtel" target="_blank" rel="noopener">Formatie van Boxtel</a>; schalies en zandsteen}, veelal met een dek van leem of hellingafzettingen`,color:`130,106,127`}
};

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
    accessToken: "pk.eyJ1Ijoid29tcG8iLCJhIjoiN0VyeldPQSJ9.8MYRl2QvtXn9ZJHwJZm5lA"
}).addTo(map);

fetch("jsons/geologieNL.topojson").then(function(response) {
    return response.json();
}).then(function(geologicalmap) {
    
    let geomapVector;
    let clicked = false;
    
    function click(e) {
        // console.log("clicked!", e)

        if (clicked) {
            // console.log("something was already clicked, set clicked to false")
            document.querySelector(".info").style.cssText = "border: none"; 
        } else {
            // set css of box if clicked is true
            document.querySelector(".info").style.cssText = "border: 1px solid black; box-shadow: 1px 7px 40px 0px rgba(0,0,0,0.75);"; 
        }
        clicked = !clicked;

        const properties = e.layer.properties;

        const style = {
            stroke: true,
            weight: 10,
            color: `coral`,
            fill: true,
            fillColor: `coral`,
            fillOpacity: 0.6
        };

        if (timescaleDrawn) timescale.goTo(properties.CHRONO_PER)

        geomapVector.setFeatureStyle(properties.id, style);

        info.update(properties);
    }

    function hover(e) {
        const properties = e.layer.properties;
    
        geomapVector.resetFeatureStyle(properties.id);
    
        const style = {
            stroke: true,
            weight: 2,
            color: `#1E1E1E`,
            fill: true,
            fillColor: `#666`,
            fillOpacity: 0.6
        };
    
        geomapVector.setFeatureStyle(properties.id, style);
    
        e.layer.bringToFront();
        // if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        // }
    
        if (!clicked) { info.update(properties); }
    }
        
    // Convert TopoJSON to GeoJSON
    const geologicalmap_geojson = feature(geologicalmap, geologicalmap.objects.geologieNL);

    var highlight;
    var clearHighlight = function() {
        if (highlight) {
            geomapVector.resetFeatureStyle(highlight);
        }
        highlight = null;
    };

    geomapVector = L.vectorGrid.slicer(geologicalmap_geojson, {
                vectorTileLayerStyles: {
                    sliced: function(properties, zoom) {
                        return {
                            stroke: true,
                            weight: 0.05,
                            opacity: 0.9,
                            color: `#333`,
                            fill: true,
                            fillColor: `rgb(${key[properties.KRTCODE].color})`,
                            fillOpacity: 0.8
                        }
                    }
                },
                interactive: true,
                getFeatureId: function(f) {
                    return f.properties.id;
                }
                }).on(`mouseover`, function(e) {
                    hover(e);
                }).on(`touchstart`, function(e) {
                    hover(e);
                }).on("click", function(e) {
                    click(e);
                }).on(`mouseout`, function(e) {
                    geomapVector.resetFeatureStyle(e.layer.properties.id);
                }).on(`touchend`, function(e) {
                    geomapVector.resetFeatureStyle(e.layer.properties.id);
                }).addTo(map);
})



var info = L.control();

info.onAdd = function (map) {
    this._div = L.DomUtil.create("div", "info");
    this.update();
    return this._div;
};

info.update = function (props) {
    // console.log(props);
    this._div.innerHTML = `<h4>Formatie</h4> <br /> ${props ? `${props.CHRONO_PER} ${props.CHRONO_EPO} <p> ${key[props.KRTCODE].info}</p>` : "Beweeg je muis over een formatie, klik er op om deze vast te zetten"}`
};

info.addTo(map);


L.control.scale().addTo(map);
map.attributionControl.addAttribution("Geologische Kaart &copy; <a href='https://www.grondwatertools.nl/geologische-overzichtskaart'>TNO Geologische Dienst Nederland</a>");

// legend.addTo(map);
let timescaleShown = false;

// So when a feature is clicked it can acces timescale function
let timescale;

// On click of show timescale button lazy load timescale js and initialize
document.querySelector("#showgeotimescale").onclick = (e) => {
    return import(/* webpackChunkName: "timescale" */ './timescale').then(module => {
        timescale = module.default;
        
        const leafletMap = document.querySelector("#mapid");
        if (!timescaleDrawn) {
            timescale.init("geotimescale");
            timescaleDrawn = true;
        }    
        
        if (!timescaleShown) {
            leafletMap.style.cssText = "height: calc(100vh - 156px)";
        } else {
            leafletMap.style.cssText = "height: 100vh;";
        }
        timescaleShown = !timescaleShown;
    }).catch(error => 'An error occurred while loading the component');
};

window.addEventListener("resize", function(e) {
    if (timescaleDrawn) {
        setTimeout(function() {
            console.log("Resize that mf timescale by transitioning the whole damn thing")
        }, 1500);
    };
});