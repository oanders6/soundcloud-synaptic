"use client";

import React, { useState, useEffect } from "react";
import MusicBrowser from "../components/MusicBrowser";
import MusicGraph from "../components/MusicGraph";
import { transformTracksToGraphData } from "../components/GraphDataTransformer";

const Dashboard = () => {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState(null);
  const [graphData, setGraphData] = useState(null);

  useEffect(() => {
    const fetchLikedTracks = async () => {
      try {
        const response = await fetch("/api/soundcloud/likes");
        if (!response.ok) {
          throw new Error("Failed to fetch tracks");
        }

        const tracksData = await response.json();
        console.log("Fetched tracks:", tracksData);

        setTracks(tracksData);

        // Transform tracks for graph view
        if (tracksData && Array.isArray(tracksData) && tracksData.length > 0) {
          try {
            const transformedData = transformTracksToGraphData(tracksData);
            console.log("Transformed graph data:", transformedData);
            setGraphData(transformedData);
          } catch (graphErr) {
            console.error("Error transforming graph data:", graphErr);
            // Continue without graph data - will show error in graph view
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Error in fetchLikedTracks:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchLikedTracks();
  }, []);

  // This is a controlled handler that explicitly sets the view mode
  const handleViewSelection = (mode) => {
    console.log("Switching to view mode:", mode);
    setViewMode(mode);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        Error: {error}
      </div>
    );
  }

  const hasValidData = tracks && Array.isArray(tracks) && tracks.length > 0;
  const hasValidGraphData =
    graphData &&
    Array.isArray(graphData.nodes) &&
    Array.isArray(graphData.links) &&
    graphData.nodes.length > 0;

  // Show view selection if data is loaded but no view is selected yet
  if (hasValidData && viewMode === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FF7700] to-[#FF4500] flex flex-col items-center justify-center">
        <h1 className="text-4xl text-white font-bold mb-8 font-univers">
          Choose Your View
        </h1>
        <div className="flex space-x-6">
          <button
            onClick={() => handleViewSelection("track")}
            className="bg-white text-[#FF7700] font-bold py-4 px-8 rounded-lg shadow-lg hover:bg-gray-100 transition duration-300 text-xl"
          >
            Track Browser
          </button>
          <button
            onClick={() => handleViewSelection("graph")}
            className="bg-white text-[#FF7700] font-bold py-4 px-8 rounded-lg shadow-lg hover:bg-gray-100 transition duration-300 text-xl"
          >
            Music Graph
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen z-0 bg-gradient-to-b from-[#FF7700] to-[#FF4500]">
      {/* View mode switcher - with higher z-index to ensure it's always accessible */}
      <div className="sticky top-0 left-0 right-0 z-50 flex justify-center pt-4 pb-2 bg-gradient-to-b from-[#FF7700]/90 to-[#FF7700]/80 backdrop-blur-sm">
        <div className="bg-white/20 rounded-full p-1 inline-flex shadow-md">
          <button
            onClick={() => handleViewSelection("track")}
            className={`px-6 py-2 rounded-full text-white font-medium transition ${
              viewMode === "track" ? "bg-white/30" : "hover:bg-white/10"
            }`}
          >
            Track View
          </button>
          <button
            onClick={() => handleViewSelection("graph")}
            className={`px-6 py-2 rounded-full text-white font-medium transition ${
              viewMode === "graph" ? "bg-white/30" : "hover:bg-white/10"
            }`}
          >
            Graph View
          </button>
        </div>
      </div>

      {/* Main content area with proper positioning */}
      <div className="relative">
        {!hasValidData ? (
          <div className="text-white p-4">
            No tracks available. Please check your SoundCloud connection.
          </div>
        ) : viewMode === "track" ? (
          <MusicBrowser initialTracks={tracks} />
        ) : viewMode === "graph" && hasValidGraphData ? (
          <div className="h-screen pt-4">
            <MusicGraph initialGraphData={graphData} />
          </div>
        ) : (
          <div className="text-white p-4 text-center">
            Unable to load graph view. Please try track view instead.
          </div>
        )}
      </div>

      <div className="fixed bottom-4 right-4" style={{ zIndex: 40 }}>
        <img
          src="/powered-by-soundcloud.png"
          alt="Powered by SoundCloud"
          width={96}
          height={96}
        />
      </div>
    </div>
  );
};

export default Dashboard;
