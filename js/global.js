mapboxgl.accessToken = 'pk.eyJ1IjoiaXZwcm9qZWN0IiwiYSI6ImNrcDZuMjZvajAzZDAyd3BibDJvNmJ4bjMifQ.5FpaSBhuOWEDm3m8PQp3Zg';

const map = new mapboxgl.Map({
    container: 'map', // container ID
    // projection: 'winkelTripel',
    style: 'mapbox://styles/ivproject/ckxneoss2ol4114jmeav4mapm', // style URL
    zoom: 1.5 // starting zoom
});

map.addControl(new mapboxgl.NavigationControl());

const geojson_url = 'geojson/country_data.geojson'


let raw_geojson = $.ajax({
    type: "GET",
    url: geojson_url,
    dataType: "json",
    success: function (csvData) {
        console.log('ok')
    }
}).done(result => {

    let filterCollection = {
        type: "FeatureCollection",
    }

    map.addSource('base-country', {
        type: 'geojson',
        data: result
    })

    map.addSource('bsg-country', {
        type: 'geojson',
        data: {}
    })

    let btn = document.querySelectorAll('#filter-bsg input')

    let detail_info = document.querySelectorAll('.detail-info')
    detail_info.forEach(i => {
        i.style.display = 'none'
    })

    let buttonClicked = null;
    let loading_text = document.getElementById('loading-text')

    
    let hoveredStateId = null;

    btn.forEach(async (b, i) => {
        b.style.color = "black";
        b.style.background = "#fff";
        b.onclick = async () => {
            loading_text.style.display = 'none'
            if (buttonClicked !== null) {
                buttonClicked.style.color = "black";
                buttonClicked.style.background = "#fff";
            }

            let data = result.features.filter(a => {
                return a.properties['BSG'] == b.value.toUpperCase()
            })

            detail_info.forEach(i => {
                i.style.display = 'none'
            })

            let id_info = document.getElementById(`${b.value}-info`)
            id_info.style.display = 'block'

            filterCollection['features'] = data
            map.getSource('bsg-country').setData(filterCollection)

            let bbox = turf.extent(filterCollection);
            map.fitBounds(bbox, {
                padding: 50
            });

            buttonClicked = b;
            buttonClicked.style.color = "white";
            buttonClicked.style.background = "#763d8e";

            let pop = document.getElementsByClassName('mapboxgl-popup')
            pop[0].style.display = 'none'
        }
    })

    let coordinates = ''

    const graticule = {
        type: 'FeatureCollection',
        features: []
    };

    for (let lng = -170; lng <= 180; lng += 40) {
        graticule.features.push({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [lng, -90],
                    [lng, 90]
                ]
            },
            properties: {
                value: lng
            }
        });
    }
    for (let lat = -80; lat <= 80; lat += 40) {
        graticule.features.push({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [-180, lat],
                    [180, lat]
                ]
            },
            properties: {
                value: lat
            }
        });
    }


    map.on('load', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                coordinates = [position.coords.latitude, position.coords.longitude];
    
                let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates.reverse().join(",")}.json?access_token=pk.eyJ1IjoiaXZwcm9qZWN0IiwiYSI6ImNrcDZuMjZvajAzZDAyd3BibDJvNmJ4bjMifQ.5FpaSBhuOWEDm3m8PQp3Zg`
                $.get(url, (data) => {
    
                    loading_text.style.display = 'none'
                    let countryOnly = data.features.filter(f => {
                        return f.place_type == 'country'
                    })
    
                    let countryId = countryOnly[0].properties.short_code
                    let filterRawGeojson = result.features.filter(f => {
                        return f.properties['CNTR_ID'] == countryId.toUpperCase()
                    })
    
                    filterCollection['features'] = filterRawGeojson
                    map.getSource('bsg-country').setData(filterCollection)
    
                    let currentProp = filterRawGeojson[0].properties['BSG']
    
                    btn.forEach(async b => {
                        if (buttonClicked !== null) {
    
                            buttonClicked.style.color = "white";
                            buttonClicked.style.background = "#763d8e";
                        }
    
                        if (b.value.toLowerCase() === currentProp.toLowerCase()) {
                            buttonClicked = b;
                            buttonClicked.style.color = "black";
                            buttonClicked.style.background = "#fff";
                            let id_info = document.getElementById(`${b.value.toLowerCase()}-info`)
                            id_info.style.display = 'block'
    
                            let bbox = turf.extent(filterCollection);
                            map.fitBounds(bbox, {
                                padding: 150
                            });
                        }
                    })
                })
            });
        }
    
        map.addLayer({
            'id': 'bsg-country',
            'type': 'fill',
            'source': 'bsg-country',
            'paint': {
                'fill-color': '#F38A2A', // blue color fill
            }
        });

        map.addLayer({
            'id': 'base-country',
            'type': 'fill',
            'source': 'base-country',
            'paint': {
                'fill-outline-color': '#fff',
                'fill-color': 'transparent',
                'fill-opacity': 1.0
            }
        });

        map.addLayer({
            'id': 'base-country-line',
            'type': 'line',
            'source': 'base-country',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#9a9a9a',
                'line-width': 3
            }
        });

        map.addSource('graticule', {
            'type': 'geojson',
            'data': graticule
        });
        map.addLayer({
            'id': 'graticule',
            'type': 'line',
            'source': 'graticule',
            'paint': {
                'line-color': '#ede9eb',
                'line-width': 1.5
            }
        });

        map.on("mousemove", "base-country", function (e) {
            map.getCanvas().style.cursor = 'pointer';
            map.setFilter("base-country-line", ["==", "ISO3_CODE", e.features[0].properties['ISO3_CODE']]);
        });

        map.on("mouseleave", "base-country", function () {
            map.getCanvas().style.cursor = '';
            map.setFilter("base-country-line", ["==", "ISO3_CODE", ""]);
        });


        map.on('click', 'base-country', async (e) => {
            let currentProp = e.features[0].properties['BSG']

            if (currentProp === 'No BSG') {
                loading_text.style.display = 'block'
                detail_info.forEach(i => {
                    i.style.display = 'none'
                })

            } else {
                let selectedInput = document.querySelectorAll(`input[value=${currentProp.toLowerCase()}]`);
                loading_text.style.display = 'none'

                detail_info.forEach(i => {
                    i.style.display = 'none'
                })

                buttonClicked = selectedInput[0];
                buttonClicked.style.color = "black";
                buttonClicked.style.background = "#fff";

                let id_info = document.getElementById(`${currentProp.toLowerCase()}-info`)
                id_info.style.display = 'block'

                btn.forEach(async b => {
                    b.style.color = "black";
                    b.style.background = "#fff";
                    if (buttonClicked !== null) {

                        buttonClicked.style.color = "white";
                        buttonClicked.style.background = "#763d8e";
                    }
                })

            }

            filterCollection['features'] = e.features

            map.getSource('bsg-country').setData(filterCollection)

            new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(e.features[0].properties['NAME_ENGL'])
                .addTo(map);


        });
    })
})

function collapse() {
    let collapsible = document.querySelectorAll('.des')
    let bsg_world = document.getElementById('bsg-world')
    let bsg_title = document.querySelectorAll('.bsg-title')
    collapsible.forEach((c, i) => {
        if (c.style.display === "block") {
            c.style.display = "none";
            bsg_world.style.display = 'none'
            bsg_title[i].style.margin = 0
        } else {
            c.style.display = "block";
            bsg_world.style.display = 'block'
            bsg_title[i].style.marginBottom = '1em'
        }
    })

}
