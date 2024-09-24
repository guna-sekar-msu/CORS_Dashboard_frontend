import React, { useEffect, useRef, useState } from 'react';
import '@arcgis/core/assets/esri/themes/light/main.css';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer';
import BasemapGallery from '@arcgis/core/widgets/BasemapGallery';
import Legend from '@arcgis/core/widgets/Legend';
import Expand from '@arcgis/core/widgets/Expand';
import Search from '@arcgis/core/widgets/Search';
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import esriRequest from '@arcgis/core/request';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import Measurement from '@arcgis/core/widgets/Measurement';
import esriConfig from '@arcgis/core/config';
import * as locator from '@arcgis/core/rest/locator';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import SketchViewModel from '@arcgis/core/widgets/Sketch/SketchViewModel';
import * as geometryEngineAsync from '@arcgis/core/geometry/geometryEngineAsync';
import sendJsonData from '../apiService';

const CORSMap = ({ onLocationFound, outputData, coordinates }) => {
  const mapRef = useRef(null);
  const distanceRef = useRef(null);
  const areaRef = useRef(null);
  const clearRef = useRef(null);
  const radiusRef = useRef(null);
  const radiusDropdownRef = useRef(null);
  const toolbarDivRef = useRef(null);
  const sketchViewModelRef = useRef(null);
  const selectRef = useRef(null);
  const markerLayer = useRef(null);  // Keep track of marker layer reference
  const viewRef = useRef(null);  // Keep track of the view reference
  const [fetchedData, setFetchedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRadius, setSelectedRadius] = useState(0);  // Radius selection state
  const [selectedFeatures, setSelectedFeatures] = useState([]);  // State to store selected features

  // Fetch data once on component mount if outputData is not provided
  useEffect(() => {
    if (!outputData) {
      const date = new Date('2024-04-14');
      const input_data = {
        date: date,
        options: 'Initial Load'
      };
      sendJsonData(input_data)
        .then(response => {
          setFetchedData(response.data);
          setLoading(false);
        })
        .catch(error => {
          console.error("There was an error fetching data!", error);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  // Initialize the map (Only Once)
  useEffect(() => {
    if (loading ) return;  // Prevent re-initialization
    if (!fetchedData && !outputData) {
      console.error("No data available to display on the map");
      return;
    }

    // Set the API key
    esriConfig.apiKey = 'AAPKdc7b2ff2df0643c9862ec9d816a967c68kookelLZzekcspoX5TtjXoVKK9lvFU3vJ6sILgSwqXg8efMFEBCc9NlnqYtlAid';  // Replace with your Esri API key

    let url;
    let presentCount = 0;
    let notPresentCount = 0;
    let prediction_status;

    if (outputData) {
      console.log("from output Data");
      console.log(outputData);
      prediction_status = outputData.mycs2_prediction;
      const blob = new Blob([JSON.stringify(outputData)], {
        type: "application/json",
      });
      url = URL.createObjectURL(blob);
      presentCount = outputData.status_count;
      notPresentCount = outputData.features.length - presentCount;
    } else if (fetchedData) {
      prediction_status = false;  // Assign default value
      console.log("from fetch Data");
      console.log(fetchedData);
      const blob = new Blob([JSON.stringify(fetchedData)], {
        type: "application/json",
      });
      url = URL.createObjectURL(blob);
      presentCount = fetchedData.status_count;
      notPresentCount = fetchedData.features.length - presentCount;
    }

    const template = {
      title: "Site Info",
      content: `<b>Site ID:</b> {SITEID}<br>
                <b> Description: </b> {Description}<br>
                <b> DOMES : </b> {DOMES} <br>`
    };

    // Updated renderer based on status
    const renderer = {
      type: "unique-value",
      field: "STATUS",
      uniqueValueInfos: [
        {
          value: "Present",
          symbol: {
            type: "simple-marker",
            color: "blue",
            size: "8px",
            outline: {
              color: "white",
              width: 1,
            },
          },
          label: `Present (${presentCount})`
        },
        {
          value: "Not Present",
          symbol: {
            type: "simple-marker",
            color: "red",
            size: "8px",
            outline: {
              color: "white",
              width: 1,
            },
          },
          label: `Not Present (${notPresentCount})`
        }
      ]
    };

    const renderer_1 = {
      type: "unique-value",
      field: "STATUS",
      uniqueValueInfos: [
        {
          value: "MYCS2 Prediction",
          symbol: {
            type: "simple-marker",
            color: "orange",
            size: "8px",
            outline: {
              color: "white",
              width: 1,
            },
          },
          label: `MYCS2 Prediction (${presentCount})`
        },
        {
          value: "Observation",
          symbol: {
            type: "simple-marker",
            color: "green",
            size: "8px",
            outline: {
              color: "white",
              width: 1,
            },
          },
          label: `Observation (${notPresentCount})`
        }
      ]
    };

    const geojsonLayer = new GeoJSONLayer({
      url: url,
      popupTemplate: template,
      renderer: prediction_status ? renderer_1 : renderer,
      orderBy: {
        field: "STATUS"
      }
    });

    const polygonGraphicsLayer = new GraphicsLayer(); // Layer to hold the drawn rectangle
    markerLayer.current = new GraphicsLayer();  // Graphics layer for markers
    const map = new Map({
      basemap: "gray-vector",
      layers: [geojsonLayer, polygonGraphicsLayer, markerLayer.current]  // Added markerLayer
    });

    const view = new MapView({
      container: mapRef.current,
      center: [-95.7129, 37.0902],
      zoom: 3,
      map: map
    });

    viewRef.current = view;  // Store the view in the ref for later use

    view.when(() => {
      const legend = new Expand({
        content: new Legend({
          view: view,
          style: "card"
        }),
        view: view,
        expanded: true
      });

      view.ui.add(legend, "bottom-left");

      // Custom Search
      const customSearchSource = {
        placeholder: "Search by SITEID",
        getSuggestions: (params) => {
          return esriRequest(url, {
            responseType: "json"
          }).then((results) => {
            return results.data.features
              .filter((feature) => feature.properties.SITEID.includes(params.suggestTerm))
              .map((feature) => ({
                key: feature.properties.SITEID,
                text: feature.properties.SITEID,
                sourceIndex: params.sourceIndex
              }));
          });
        },
        getResults: (params) => {
          return esriRequest(url, {
            responseType: "json"
          }).then((results) => {
            const filteredFeatures = results.data.features.filter((feature) =>
              feature.properties.SITEID === params.suggestResult.text.trim()
            );

            const searchResults = filteredFeatures.map((feature) => {
              const graphic = new Graphic({
                geometry: new Point({
                  x: feature.geometry.coordinates[0],
                  y: feature.geometry.coordinates[1]
                }),
                attributes: feature.properties
              });

              const buffer = geometryEngine.geodesicBuffer(graphic.geometry, 100, "meters");
              const propertiesString = Object.entries(feature.properties)
                .slice(0, -1)
                .map(([key, value]) => `${key}: ${value}`)
                .join(", ");
              return {
                extent: buffer.extent,
                feature: graphic,
                name: propertiesString,
              };
            });

            return searchResults;
          });
        }
      };

      const searchWidget = new Search({
        view: view,
        sources: [customSearchSource]
      });

      view.ui.add(searchWidget, "top-right");

      // Basemap Gallery
      const basemapGallery = new Expand({
        content: new BasemapGallery({
          view: view,
          container: document.createElement("div"),
        }),
        view: view,
        expanded: false
      });

      view.ui.add(basemapGallery, "top-right");

      // Measurement widget
      const measurement = new Measurement({
        view: view
      });

      view.ui.add(measurement, "bottom-right");

      // Ensure toolbar elements are available before using them
      if (toolbarDivRef.current) {
        view.ui.add(toolbarDivRef.current, "top-left");
      } else {
        console.error("Toolbar div is not found");
      }

      // Initialize SketchViewModel
      sketchViewModelRef.current = new SketchViewModel({
        view: view,
        layer: polygonGraphicsLayer
      });

      // Handle rectangle creation and feature selection
      sketchViewModelRef.current.on('create', async (event) => {
        if (event.state === 'complete') {
          const geometries = polygonGraphicsLayer.graphics.map(graphic => graphic.geometry);
          const queryGeometry = await geometryEngineAsync.union(geometries.toArray());

          const query = geojsonLayer.createQuery();
          query.geometry = queryGeometry;
          query.outFields = ['*'];
          query.returnGeometry = true;

          const results = await geojsonLayer.queryFeatures(query);

          // Set the selected features in state
          setSelectedFeatures(results.features);
        }
      });

      // Toolbar functionality
      distanceRef.current.onclick = function () {
        measurement.activeTool = "distance";
      };

      areaRef.current.onclick = function () {
        measurement.activeTool = "area";
      };

      clearRef.current.onclick = function () {
        measurement.clear();  // Clear any measurement tools
        polygonGraphicsLayer.removeAll();  // Clear all graphics in the graphics layer
        view.graphics.removeAll();  // Clear any other graphics on the view
        setSelectedFeatures([]);  // Clear the selected features from the state
      };

      radiusRef.current.onclick = function () {
        radiusDropdownRef.current.classList.toggle('hidden'); // Show/hide the dropdown
      };

      selectRef.current.onclick = () => {
        view.graphics.removeAll(); // Clear previous graphics
        sketchViewModelRef.current.create('rectangle');
      };
      view.on("click", (event) => {
        const lat = event.mapPoint.latitude.toFixed(2);
        const lon = event.mapPoint.longitude.toFixed(2);

        // Always find the location and pass it to the callback
        const locatorUrl = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer";
        locator.locationToAddress(locatorUrl, {
          location: event.mapPoint
        })
          .then((response) => {
            onLocationFound({
              address: response.address,
              latitude: lat,
              longitude: lon
            });
          })
          .catch((error) => {
            console.error("Error fetching address:", error);
            onLocationFound({
              address: "Address not found",
              latitude: lat,
              longitude: lon
            });
          });
      });
    });
  }, [onLocationFound, outputData, fetchedData, loading]);  // Initialize map only once

  // Handle radius changes without reloading the map
  useEffect(() => {
    if (!viewRef.current) return;

    // On map click, apply the selected radius
    const handleClick = (event) => {
      const lat = event.mapPoint.latitude.toFixed(2);
      const lon = event.mapPoint.longitude.toFixed(2);

      if (!radiusDropdownRef.current.classList.contains('hidden')) {
        const centerPoint = new Point({
          longitude: lon,
          latitude: lat
        });

        const circleGeometry = geometryEngine.geodesicBuffer(centerPoint, selectedRadius, "kilometers");

        const circleGraphic = new Graphic({
          geometry: circleGeometry,
          symbol: {
            type: "simple-fill",
            color: [0, 0, 255, 0.2],
            outline: {
              color: [0, 0, 255, 0.8],
              width: 2
            }
          }
        });

        viewRef.current.graphics.removeAll();  // Remove existing graphics
        viewRef.current.graphics.add(circleGraphic);  // Add new circle
      }

    };

    // Attach the click event listener to the map view
  const clickHandle = viewRef.current.on("click", handleClick);

  // Cleanup the event listener on component unmount
  return () => {
    clickHandle.remove();  // Correct way to remove the event listener
  };
}, [selectedRadius]);  // Re-run only when `selectedRadius` changes

  // Handle coordinates change (Update marker without reloading the map)
  useEffect(() => {
    if (coordinates && viewRef.current && markerLayer.current) {
      const { lat, lon } = coordinates;
      const point = new Point({
        latitude: parseFloat(lat),
        longitude: parseFloat(lon)
      });

      const markerSymbol = {
        type: "simple-marker",  // Style for the marker
        style: "square",
        color: [0,110,51],  // Orange color
        outline: {
          color: [255, 255, 255],  // White outline
          width: 2
        }
      };

      const marker = new Graphic({
        geometry: point,
        symbol: markerSymbol
      });

      markerLayer.current.removeAll();  // Clear previous markers
      markerLayer.current.add(marker);  // Add new marker

      // Fix: Ensure goTo zooms to the correct location without padding
      viewRef.current.goTo({
        center: point,
        zoom: 10  // Adjust zoom level as necessary
      }, {
        animate: true,  // Optional: add animation
        duration: 1000,  // Optional: control duration of zoom
        easing: "ease-in-out",  // Optional: control easing effect
        maxZoom: 15,  // Ensure it doesn't zoom too much
        padding: { top: 0, bottom: 0, left: 0, right: 0 }  // No padding, center exactly on the point
      });
    }
  }, [coordinates]);  // Only update when coordinates change

  return (
    <div>
      <div ref={toolbarDivRef} id="toolbarDiv" className="esri-component esri-widget absolute top-20 left-[1px] z-10">
        <button ref={distanceRef} className="esri-widget--button esri-interactive esri-icon-measure-line" title="Distance Measurement Tool"></button>
        <button ref={areaRef} className="esri-widget--button esri-interactive esri-icon-measure-area" title="Area Measurement Tool"></button>
        <button ref={radiusRef} className="esri-widget--button esri-interactive esri-icon-dial" title="Radius Measurement Tool"></button>
        <button ref={selectRef} className="esri-widget--button esri-interactive esri-icon-checkbox-unchecked" title="Select by Rectangle"></button>
        <div ref={radiusDropdownRef} className="esri-widget esri-interactive absolute top-8 left-[60px] z-10 bg-white shadow-md p-2 rounded hidden">
          <label htmlFor="radius-select">Choose Radius:</label>
          <select id="radius-select" onChange={(e) => setSelectedRadius(Number(e.target.value))} value={selectedRadius}>
            <option value={0}>Choose km</option>
            <option value={50}>50 km</option>
            <option value={100}>100 km</option>
            <option value={200}>200 km</option>
            <option value={500}>500 km</option>
            <option value={1000}>1000 km</option>
          </select>
        </div>
        <button ref={clearRef} className="esri-widget--button esri-interactive esri-icon-trash" title="Clear Measurements"></button>
      </div>
      <div ref={mapRef} className="h-[88vh] w-full"></div>  {/* Attach the map view to this div */}
      
      {/* Display the selected features in a table */}
      <div className="selected-features-table p-4">
        <h3 className="text-lg font-semibold mb-4">Selected Features:</h3>
        {selectedFeatures.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table-auto w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="px-4 py-2 border">Site ID</th>
                  <th className="px-4 py-2 border">Status</th>
                  {/* Add more columns as needed */}
                </tr>
              </thead>
              <tbody>
                {selectedFeatures.map((feature, index) => (
                  <tr key={index} className="odd:bg-white even:bg-gray-50">
                    <td className="px-4 py-2 border">{feature.attributes.SITEID}</td>
                    <td className="px-4 py-2 border">{feature.attributes.STATUS}</td>
                    {/* Add more columns as needed */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600">No features selected.</p>
        )}
      </div>
    </div>
  );
};

export default CORSMap;
