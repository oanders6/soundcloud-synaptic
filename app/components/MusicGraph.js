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
  const containerRef = useRef();
  const [mounted, setMounted] = useState(false);
  const [imageCache, setImageCache] = useState({});
  const [graphData, setGraphData] = useState(initialGraphData);

  // Initialize graph with proper center positioning and full screen
  useEffect(() => {
    setMounted(true);
    const handleResize = () => {
      if (containerRef.current && fgRef.current) {
        const { width, height } = document.body.getBoundingClientRect();
        containerRef.current.style.width = `${width}px`;
        containerRef.current.style.height = `${height}px`;
        fgRef.current.width(width);
        fgRef.current.height(height);
        fgRef.current.centerAt(width / 2, height / 2);
        fgRef.current.zoom(1.5);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    loadImages(initialGraphData.nodes);

    return () => window.removeEventListener("resize", handleResize);
  }, [initialGraphData]);

  const loadImages = useCallback(
    (nodes) => {
      nodes.forEach((node) => {
        if (
          node.type === "song" &&
          node.data?.artworkUrl &&
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
    },
    [imageCache]
  );

  const handleNodeRightClick = useCallback((node, event) => {
    event.preventDefault(); // Prevent default context menu
    if (node.type === "song" && node.data?.permalink) {
      window.open(node.data.permalink, "_blank");
    }
  }, []);

  const handleNodeClick = useCallback(
    async (node) => {
      if (!node || !node.type) return;

      if (node.type === "song" && !node.expanded) {
        try {
          console.log("Fetching tracks for artist:", node.data.artistId);
          const response = await fetch(
            `/api/soundcloud/artist-likes/${node.data.artistId}`
          );
          if (!response.ok) {
            throw new Error("Failed to fetch tracks");
          }
          const newTracks = await response.json();

          // Limit to 5 most recent tracks
          const recentTracks = newTracks.slice(0, 5);

          // Create new graph data directly without using GraphState
          const newNodes = [...graphData.nodes];
          const newLinks = [...graphData.links];

          // Mark clicked node as expanded and fix its position
          const clickedNodeIndex = newNodes.findIndex((n) => n.id === node.id);
          if (clickedNodeIndex !== -1) {
            newNodes[clickedNodeIndex] = {
              ...newNodes[clickedNodeIndex],
              expanded: true,
              fx: node.x,
              fy: node.y,
            };
          }

          // Add new nodes in a circle around the clicked node
          const radius = 100;
          recentTracks.forEach((track, index) => {
            const angle = (2 * Math.PI * index) / recentTracks.length;
            const newNode = new GraphNode(track);
            newNode.x = node.x + radius * Math.cos(angle);
            newNode.y = node.y + radius * Math.sin(angle);

            // Add new node and link
            newNodes.push(newNode);
            newLinks.push({
              source: node.id,
              target: newNode.id,
            });
          });

          // Update graph data
          const newGraphData = {
            nodes: newNodes,
            links: newLinks,
          };

          setGraphData(newGraphData);

          // Load images for new nodes
          loadImages(recentTracks.map((track) => new GraphNode(track)));

          if (onNodeClick) {
            onNodeClick(node.id);
          }
        } catch (error) {
          console.error("Error expanding node:", error);
        }
      }

      // Center on clicked node
      if (fgRef.current) {
        fgRef.current.centerAt(node.x, node.y, 1000);
      }
    },
    [graphData, onNodeClick, loadImages]
  );

  const nodeCanvasObject = useCallback(
    (node, ctx, globalScale) => {
      if (!node || !node.data) return;

      const BASE_NODE_SIZE = node.type === "user" ? 15 : 12;
      const size = BASE_NODE_SIZE / globalScale;

      if (node.type === "song") {
        if (imageCache[node.id]) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
          ctx.clip();

          const img = imageCache[node.id];
          const imgSize = size * 2;
          ctx.drawImage(img, node.x - size, node.y - size, imgSize, imgSize);
          ctx.restore();

          // Draw expansion indicator circle on the border
          if (!node.expanded) {
            ctx.beginPath();
            ctx.strokeStyle = "#22c55e";
            ctx.lineWidth = 2 / globalScale;
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
            ctx.stroke();
          }

          // Add clickable indicator
          if (node.data.permalink) {
            ctx.beginPath();
            ctx.fillStyle = "#22c55e";
            const indicatorSize = size * 0.3;
            ctx.arc(
              node.x + size * 0.7,
              node.y - size * 0.7,
              indicatorSize,
              0,
              2 * Math.PI
            );
            ctx.fill();
          }
        } else {
          // Fallback for when image hasn't loaded
          ctx.beginPath();
          ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
          ctx.fillStyle = "#60a5fa";
          ctx.fill();
        }

        // Add artist name below
        const fontSize = Math.max(size * 0.6, 4);
        ctx.font = `${fontSize}px Sans-Serif`;
        ctx.fillStyle = "#94a3b8";
        ctx.textAlign = "center";
        ctx.fillText(
          node.data.artistName || "",
          node.x,
          node.y + size + fontSize
        );
      } else if (node.type === "user") {
        // User node rendering
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
        ctx.fillStyle = "#f87171";
        ctx.fill();

        const label = node.data.username || "Me";
        const fontSize = Math.max(size * 0.8, 6);
        ctx.font = `${fontSize}px Sans-Serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "white";
        ctx.fillText(label, node.x, node.y);
      }
    },
    [imageCache]
  );

  useEffect(() => {
    if (fgRef.current) {
      // Adjust forces for better initial layout
      fgRef.current.d3Force("charge").strength(-100).distanceMax(200);
      fgRef.current.d3Force("link").distance(80).strength(0.3);
      fgRef.current.d3Force("center").strength(0.05);
      fgRef.current.d3Force("collision").radius(25).strength(0.2);
    }
  }, []);

  if (!mounted) return null;

  return (
    <div
      ref={containerRef}
      className="fixed top-0 left-0 right-0 bottom-0 overflow-hidden"
    >
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => "replace"}
        onNodeClick={handleNodeClick}
        onNodeRightClick={handleNodeRightClick}
        linkColor={() => "#cbd5e1"}
        linkWidth={1.5}
        cooldownTicks={100}
        d3AlphaDecay={0.01}
        d3VelocityDecay={0.4}
        nodeRelSize={2}
        minZoom={0.5}
        maxZoom={4}
      />
    </div>
  );
};

export default MusicGraph;
