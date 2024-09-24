import React, { useState } from "react";
import CORSMap from "./CORSMap";
import SiteStats from "./SiteStats";

const ParentFeature = () => {
  const [outputData, setOutputData] = useState(null); // State to hold the output data from SiteStats
  const [locationInfo, setLocationInfo] = useState({
    address: "",
    latitude: "",
    longitude: ""
  });
  console.log(locationInfo);
  const [coordinates, setCoordinates] = useState(null);  // State for the coordinates from SiteStats

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-blue-500 text-white p-5 text-center">
        <h1>CORS Sites Dashboard</h1>
      </header>
      <div className="flex flex-1">
        <div className="flex-[5] p-2.5 relative">
          <CORSMap onLocationFound={setLocationInfo} outputData={outputData} coordinates={coordinates} /> {/* Pass outputData to CORSMap */}
        </div>
        <div className="flex-1 p-5 bg-gray-200 overflow-y-auto">
          <SiteStats setOutputData={setOutputData} setCoordinates={setCoordinates}/> {/* Pass setOutputData to SiteStats */}
          {locationInfo.address && (
            <div className="mt-5 p-2.5 border border-gray-300 rounded-lg bg-gray-100 w-full">
              <h2 className="mb-2.5">Selected Location's</h2>
              <p className="my-1 text-base"><strong>Latitude:</strong> {locationInfo.latitude}</p>
              <p className="my-1 text-base"><strong>Longitude:</strong> {locationInfo.longitude}</p>
              <p className="my-1 text-base"><strong>Address:</strong> {locationInfo.address}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParentFeature;