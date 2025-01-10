"use client";

import React, { useState, useEffect } from "react";
import { transformTracksToGraphData } from "../components/GraphDataTransformer";
import MusicGraph from "../components/MusicGraph";

const Dashboard = () => {
  const [initialGraphData, setInitialGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLikedTracks = async () => {
      try {
        const response = await fetch("/api/soundcloud/likes");
        if (!response.ok) {
          throw new Error("Failed to fetch tracks");
        }

        const tracks = await response.json();
        console.log("Fetched tracks:", tracks);

        const transformedData = transformTracksToGraphData(tracks);
        console.log("Transformed data:", transformedData);

        if (transformedData && transformedData.nodes && transformedData.links) {
          setInitialGraphData(transformedData);
        } else {
          throw new Error("Invalid graph data structure");
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

  const handleNodeClick = async (nodeId) => {
    console.log("Node clicked:", nodeId);
    // You can add additional handling here if needed
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

  const hasValidData =
    initialGraphData &&
    Array.isArray(initialGraphData.nodes) &&
    Array.isArray(initialGraphData.links) &&
    initialGraphData.nodes.length > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Your Music Graph</h1>
      {hasValidData ? (
        <MusicGraph
          initialGraphData={initialGraphData}
          onNodeClick={handleNodeClick}
        />
      ) : (
        <div className="text-red-500">No valid graph data available</div>
      )}

      {/* Debug output */}
      {/* <div className="mt-4 p-4 bg-gray-100 rounded"> */}
      {/* <h2 className="text-lg font-bold mb-2">Debug Data:</h2> */}
      {/* <pre className="overflow-auto"> */}
      {/* {JSON.stringify(initialGraphData, null, 2)} */}
      {/* </pre> */}
      {/* </div> */}
      <iframe
        className="w-[32px] h-[32px]"
        src="https://w.soundcloud.com/icon/?url=http%3A%2F%2Fsoundcloud.com%2Fowen-anderson-612944733&color=orange_white&size=32"
      />
      <div className="absolute bottom-4 right-4" style={{ zIndex: 9999 }}>
        <img
          src="/powered-by-soundcloud.png"
          alt="Powered by SoundCloud"
          width={64}
          height={64}
        />
      </div>
    </div>
  );
};

export default Dashboard;
