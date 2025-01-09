"use client";

import React, { useCallback, useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { GraphState, GraphNode } from "./GraphDataTransformer";

const ForceGraph2D = dynamic(
  () => import("react-force-graph").then((mod) => mod.ForceGraph2D),
  { ssr: false }
);

const MusicGraph = ({ initialGraphData, onNodeClick }) => {
  const fgRef = useRef();
  const [mounted, setMounted] = useState(false);
  const [imageCache, setImageCache] = useState({});
  const [graphData, setGraphData] = useState(initialGraphData);

  useEffect(() => {
    setMounted(true);
    loadImages(initialGraphData.nodes);
  }, [initialGraphData]);

  const loadImages = (nodes) => {
    nodes.forEach((node) => {
      if (
        node.type === "song" &&
        node.data.artworkUrl &&
        !imageCache[node.id]
      ) {
        const img = new Image();
        img.src = node.data.artworkUrl;
        img.onload = () => {
          setImageCache((prev) => ({
            ...prev,
            [node.id]: img,
          }));
        };
      }
    });
  };

  const handleNodeClick = useCallback(
    async (node) => {
      if (node.id !== "ME" && !node.expanded) {
        try {
          console.log("Fetching tracks for artist:", node.data.artistId);
          const response = await fetch(
            `/api/soundcloud/artist-likes/${node.data.artistId}`
          );
          if (!response.ok) {
            console.error("API response not ok:", response.status);
            throw new Error("Failed to fetch tracks");
          }
          const newTracks = await response.json();
          console.log("Fetched new tracks:", newTracks);

          // Create new graph state with existing nodes and links
          const graphState = new GraphState();

          // Add the center node first
          graphState.addNode(graphData.nodes.find((n) => n.id === "ME"));

          // Add all existing nodes (except center node) and maintain their expanded state
          graphData.nodes.forEach((existingNode) => {
            if (existingNode.id !== "ME") {
              const nodeToAdd = new GraphNode({
                id: existingNode.id,
                title: existingNode.data.title,
                user: {
                  username: existingNode.data.artistName,
                  id: existingNode.data.artistId,
                },
                artwork_url: existingNode.data.artworkUrl,
                created_at: existingNode.data.likedAt,
                permalink_url: existingNode.data.permalink,
              });
              nodeToAdd.expanded = existingNode.expanded;
              graphState.addNode(nodeToAdd);
            }
          });

          // Add all existing links
          graphData.links.forEach((link) => {
            graphState.addLink(
              typeof link.source === "object" ? link.source.id : link.source,
              typeof link.target === "object" ? link.target.id : link.target
            );
          });

          // Add new tracks and connect them to the clicked node
          newTracks.forEach((track) => {
            const newNode = new GraphNode(track);
            graphState.addNode(newNode);
            graphState.addLink(node.id, newNode.id);
          });

          // Mark the clicked node as expanded
          const updatedNode = graphState.nodes.get(node.id);
          if (updatedNode) {
            updatedNode.expanded = true;
          }

          // Update graph data
          const newGraphData = graphState.toVisualizationFormat();

          // Position new nodes near their parent
          const parentNode = newGraphData.nodes.find((n) => n.id === node.id);
          if (parentNode) {
            newTracks.forEach((_, index) => {
              const angle = (2 * Math.PI * index) / newTracks.length;
              const radius = 100; // Distance from parent node
              const newNode = newGraphData.nodes.find(
                (n) => n.id === _.id.toString()
              );
              if (newNode) {
                newNode.x = parentNode.x + radius * Math.cos(angle);
                newNode.y = parentNode.y + radius * Math.sin(angle);
              }
            });
          }

          console.log("New graph data:", newGraphData);
          setGraphData(newGraphData);

          // Load images for new nodes
          loadImages(newGraphData.nodes);

          // Notify parent component
          if (onNodeClick) {
            onNodeClick(node.id);
          }

          // Update force simulation
          if (fgRef.current) {
            fgRef.current.d3Force("charge").strength(-800);
            fgRef.current.d3Force("link").distance(150);
            fgRef.current.d3Force("collision").radius(30);
            fgRef.current.d3ReheatSimulation();
          }
        } catch (error) {
          console.error("Error expanding node:", error);
        }
      }

      // Center view on clicked node with some delay to allow for graph update
      setTimeout(() => {
        if (fgRef.current) {
          fgRef.current.centerAt(node.x, node.y, 1000);
          fgRef.current.zoom(1.5, 1000);
        }
      }, 100);
    },
    [graphData, onNodeClick]
  );

  // Add custom forces when component mounts
  useEffect(() => {
    if (fgRef.current) {
      // Stronger repulsion force
      fgRef.current.d3Force("charge").strength(-800).distanceMax(1000);

      // Shorter link distance for tighter clusters
      fgRef.current.d3Force("link").distance(150).strength(1);

      // Add collision force to prevent node overlap
      fgRef.current.d3Force(
        "collision",
        d3.forceCollide().radius(30).strength(0.8)
      );

      // Add centering force
      fgRef.current.d3Force("center", d3.forceCenter());
    }
  }, []);

  const nodeCanvasObject = useCallback(
    (node, ctx, globalScale) => {
      const BASE_NODE_SIZE = node.type === "user" ? 15 : 12;
      const size = BASE_NODE_SIZE / globalScale;

      // Draw node background
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
      ctx.fillStyle = node.type === "user" ? "#f87171" : "#60a5fa";
      ctx.fill();

      // Draw image for song nodes
      if (node.type === "song" && imageCache[node.id]) {
        ctx.save();
        // Create clipping region
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
        ctx.clip();

        // Draw the image
        const img = imageCache[node.id];
        const imgSize = size * 2;
        ctx.drawImage(img, node.x - size, node.y - size, imgSize, imgSize);
        ctx.restore();

        // Add expansion indicator if not expanded
        if (!node.expanded) {
          ctx.beginPath();
          ctx.arc(node.x + size, node.y - size, size / 3, 0, 2 * Math.PI);
          ctx.fillStyle = "#22c55e";
          ctx.fill();
        }
      } else {
        // Fallback text if no image
        const label =
          node.type === "user" ? node.data.username : node.data.title;
        const fontSize = Math.max(size * 0.8, 6);
        ctx.font = `${fontSize}px Sans-Serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "white";
        ctx.fillText(label, node.x, node.y);
      }

      // Artist name for song nodes
      if (node.type === "song") {
        const fontSize = Math.max(size * 0.6, 4);
        ctx.font = `${fontSize}px Sans-Serif`;
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(node.data.artistName, node.x, node.y + size + fontSize);
      }
    },
    [imageCache]
  );

  if (!mounted) return null;

  return (
    <div className="w-full h-[600px]">
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => "replace"}
        onNodeClick={handleNodeClick}
        linkColor={() => "#cbd5e1"}
        linkWidth={1.5}
        cooldownTicks={100}
        d3AlphaDecay={0.01}
        d3VelocityDecay={0.08}
        nodeRelSize={2}
        minZoom={0.5}
        maxZoom={4}
      />
    </div>
  );
};

export default MusicGraph;
