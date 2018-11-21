import json

new_json = open("ids.json", 'w') 

with open("geologieNL.geojson", mode='r') as f:
    data = json.load(f)

    counter = 0
    for feature in data['features']:
        feature['properties']["id"] = counter
        counter += 1
        print feature['properties']

    # json.dump(f, feedsjson)

    json_dump = json.dumps(data)
    new_json.write(json_dump)

