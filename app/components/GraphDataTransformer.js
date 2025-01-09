export class GraphNode {
  constructor(songData) {
    this.id = songData.id.toString(); // Ensure ID is a string
    this.type = "song";
    this.data = {
      title: songData.title,
      artistName: songData.user.username,
      artistId: songData.user.id,
      artworkUrl: songData.artwork_url,
      likedAt: songData.created_at,
      permalink: songData.permalink_url,
    };
    this.expanded = false;
  }
}

export class GraphState {
  constructor() {
    this.nodes = new Map();
    this.links = new Set(); // Changed from edges to links
    this.centerNode = {
      id: "ME",
      type: "user",
      data: {
        username: "Me",
      },
    };
  }

  addNode(node) {
    if (!this.nodes.has(node.id)) {
      this.nodes.set(node.id, node);
    }
  }

  addLink(fromNodeId, toNodeId) {
    // Changed from addEdge to addLink
    const linkKey = [fromNodeId, toNodeId].sort().join("-");
    this.links.add(linkKey);
  }

  toVisualizationFormat() {
    const nodes = [
      this.centerNode,
      ...[...this.nodes.values()].map((node) => ({
        id: node.id,
        type: node.type,
        data: node.data,
        expanded: node.expanded,
      })),
    ];

    const links = [...this.links].map((link) => {
      const [source, target] = link.split("-");
      return { source, target };
    });

    return {
      nodes: nodes,
      links: links, // Changed from edges to links
    };
  }
}

export function transformTracksToGraphData(tracks) {
  if (!Array.isArray(tracks)) {
    console.error("Tracks is not an array:", tracks);
    return { nodes: [], links: [] }; // Return empty graph if tracks is invalid
  }

  const graphState = new GraphState();

  // Create nodes for each track and connect them to the center user node
  tracks.forEach((track) => {
    if (track && track.id) {
      // Ensure track is valid
      const node = new GraphNode(track);
      graphState.addNode(node);
      graphState.addLink("ME", node.id);
    }
  });

  return graphState.toVisualizationFormat();
}
