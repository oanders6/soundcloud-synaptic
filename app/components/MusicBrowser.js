import React, { useState, useEffect, useCallback } from "react";
import { useKeyPress } from "../hooks/useKeyPress";

const MusicBrowser = ({ initialTracks }) => {
  // State for navigation and display
  const [artistHistory, setArtistHistory] = useState([]);
  const [currentArtistIndex, setCurrentArtistIndex] = useState(0);

  // Main data structures
  const [currentArtist, setCurrentArtist] = useState(null);
  const [artistSongs, setArtistSongs] = useState([]);
  const [artistLikedSongs, setArtistLikedSongs] = useState([]);
  const [currentLikedSongIndex, setCurrentLikedSongIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // New state for artist selection modal
  const [showStartModal, setShowStartModal] = useState(true);
  const [selectedStartTrack, setSelectedStartTrack] = useState(null);

  // New state for selected song to play in widget
  const [selectedSong, setSelectedSong] = useState(null);

  // Reference to track when widget has been loaded
  const [widgetLoaded, setWidgetLoaded] = useState(false);

  // Add sorting state
  const [sortBy, setSortBy] = useState("date"); // 'date', 'plays'
  const [sortDirection, setSortDirection] = useState("desc"); // 'asc', 'desc'

  // Fetch an artist's liked songs
  const fetchArtistLikes = useCallback(async (artistId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/soundcloud/artist-likes/${artistId}`);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch artist likes (Status: ${response.status})`
        );
      }
      const data = await response.json();
      return data;
    } catch (err) {
      console.error("Error fetching artist likes:", err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch an artist's own songs with improved error handling
  const fetchArtistSongs = useCallback(async (artistId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/soundcloud/artist-tracks/${artistId}`);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch artist tracks (Status: ${response.status})`
        );
      }
      const data = await response.json();

      // Check if the response is valid and has tracks
      if (!Array.isArray(data)) {
        console.warn("Invalid track data format:", data);
        setArtistSongs([]);
        setError("Artist tracks data is in an unexpected format");
        return;
      }

      setArtistSongs(data);

      // If no tracks but request was successful, set a specific message
      if (data.length === 0) {
        setError(
          "No tracks available for this artist (they might have private tracks)"
        );
      }
    } catch (err) {
      console.error("Error fetching artist tracks:", err);
      setError(err.message);
      setArtistSongs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize with selected artist from tracks or show selection modal
  useEffect(() => {
    if (initialTracks && initialTracks.length > 0 && selectedStartTrack) {
      // Get the selected track
      const startTrack = selectedStartTrack;
      const startArtist = {
        id: startTrack.user ? startTrack.user.id : startTrack.userId,
        name: startTrack.user ? startTrack.user.username : startTrack.username,
        avatarUrl: startTrack.user
          ? startTrack.user.avatar_url
          : startTrack.avatar_url,
      };

      setCurrentArtist(startArtist);
      setArtistHistory([startArtist]);

      // FIX 1: Fetch the artist's liked songs instead of using initialTracks
      const loadStartingArtistLikes = async () => {
        const likes = await fetchArtistLikes(startArtist.id);
        setArtistLikedSongs(likes.length > 0 ? likes : initialTracks);
        setCurrentLikedSongIndex(0);
      };

      loadStartingArtistLikes();

      // Fetch the artist's own songs
      fetchArtistSongs(startArtist.id);
      setShowStartModal(false);
    }
  }, [initialTracks, selectedStartTrack, fetchArtistLikes, fetchArtistSongs]);

  // Reset widget loaded state when selected song changes
  useEffect(() => {
    if (selectedSong) {
      setWidgetLoaded(false);
      // Force a re-render after a delay to ensure the widget gets recreated
      const timer = setTimeout(() => setWidgetLoaded(true), 100);
      return () => clearTimeout(timer);
    }
  }, [selectedSong]);

  // Navigation handlers
  const handleUpArrow = useCallback(() => {
    if (currentLikedSongIndex > 0) {
      setCurrentLikedSongIndex((prevIndex) => prevIndex - 1);
    }
  }, [currentLikedSongIndex]);

  const handleDownArrow = useCallback(() => {
    if (currentLikedSongIndex < artistLikedSongs.length - 1) {
      setCurrentLikedSongIndex((prevIndex) => prevIndex + 1);
    }
  }, [currentLikedSongIndex, artistLikedSongs]);

  const handleLeftArrow = useCallback(() => {
    if (currentArtistIndex > 0) {
      setCurrentArtistIndex((prevIndex) => prevIndex - 1);
      const prevArtist = artistHistory[currentArtistIndex - 1];
      setCurrentArtist(prevArtist);

      // Load the previous artist's songs and liked songs
      fetchArtistSongs(prevArtist.id);

      const loadPreviousArtistLikes = async () => {
        const likes = await fetchArtistLikes(prevArtist.id);
        setArtistLikedSongs(likes);
        setCurrentLikedSongIndex(0);
      };

      loadPreviousArtistLikes();
    }
  }, [currentArtistIndex, artistHistory, fetchArtistLikes, fetchArtistSongs]);

  const handleRightArrow = useCallback(() => {
    if (artistLikedSongs.length > 0) {
      const currentLikedSong = artistLikedSongs[currentLikedSongIndex];
      const songArtist = {
        id: currentLikedSong.user
          ? currentLikedSong.user.id
          : currentLikedSong.userId,
        name: currentLikedSong.user
          ? currentLikedSong.user.username
          : currentLikedSong.username,
        avatarUrl: currentLikedSong.user
          ? currentLikedSong.user.avatar_url
          : currentLikedSong.avatar_url,
      };

      // Only navigate if this is a different artist
      if (!currentArtist || songArtist.id !== currentArtist.id) {
        setCurrentArtist(songArtist);
        setCurrentArtistIndex(artistHistory.length);
        setArtistHistory((prev) => [...prev, songArtist]);

        // Load the new artist's songs and liked songs
        fetchArtistSongs(songArtist.id);

        const loadNewArtistLikes = async () => {
          const likes = await fetchArtistLikes(songArtist.id);
          setArtistLikedSongs(likes);
          setCurrentLikedSongIndex(0);
        };

        loadNewArtistLikes();
      }
    }
  }, [
    artistLikedSongs,
    currentLikedSongIndex,
    currentArtist,
    artistHistory,
    fetchArtistLikes,
    fetchArtistSongs,
  ]);

  // Set up keyboard listeners
  useKeyPress("ArrowUp", handleUpArrow);
  useKeyPress("ArrowDown", handleDownArrow);
  useKeyPress("ArrowLeft", handleLeftArrow);
  useKeyPress("ArrowRight", handleRightArrow);

  // Get current liked song
  const currentLikedSong = artistLikedSongs[currentLikedSongIndex];

  // Create SoundCloud widget URL for a track
  const getSoundCloudWidgetUrl = (track) => {
    if (!track || !track.permalink_url) return null;

    const encodedUrl = encodeURIComponent(track.permalink_url);
    return `https://w.soundcloud.com/player/?url=${encodedUrl}&color=%23FF7700&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`;
  };

  // Handler for selecting a song to play in the widget
  const handleSelectSong = (track) => {
    console.log("Selected song:", track.title);
    setSelectedSong(track);
  };

  // Handler for selecting a starting track
  const handleSelectStartTrack = (track) => {
    setSelectedStartTrack(track);
  };

  // Helper to format release date
  const formatReleaseDate = (track) => {
    if (track.release_year && track.release_month && track.release_day) {
      return `${track.release_year}-${String(track.release_month).padStart(
        2,
        "0"
      )}-${String(track.release_day).padStart(2, "0")}`;
    } else if (track.created_at) {
      return new Date(track.created_at).toISOString().split("T")[0];
    }
    return "Unknown";
  };

  // Sort tracks based on current sort settings
  const getSortedTracks = useCallback(() => {
    if (!artistSongs || artistSongs.length === 0) return [];

    return [...artistSongs].sort((a, b) => {
      if (sortBy === "plays") {
        const aValue = a.playback_count || 0;
        const bValue = b.playback_count || 0;
        return sortDirection === "desc" ? bValue - aValue : aValue - bValue;
      } else {
        // Date
        let aDate, bDate;

        if (a.release_year) {
          aDate = new Date(
            a.release_year,
            (a.release_month || 1) - 1,
            a.release_day || 1
          );
        } else {
          aDate = new Date(a.created_at || 0);
        }

        if (b.release_year) {
          bDate = new Date(
            b.release_year,
            (b.release_month || 1) - 1,
            b.release_day || 1
          );
        } else {
          bDate = new Date(b.created_at || 0);
        }

        return sortDirection === "desc" ? bDate - aDate : aDate - bDate;
      }
    });
  }, [artistSongs, sortBy, sortDirection]);

  // Handle sort change
  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      // Toggle direction if clicking the same sort option
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new sort and default to descending for new sort option
      setSortBy(newSortBy);
      setSortDirection("desc");
    }
  };

  // Log when widget URL changes to help debug
  useEffect(() => {
    if (selectedSong) {
      const widgetUrl = getSoundCloudWidgetUrl(selectedSong);
      console.log("Widget URL:", widgetUrl);
    }
  }, [selectedSong]);

  // Render selection modal
  if (showStartModal && initialTracks && initialTracks.length > 0) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 max-w-4xl max-h-[80vh] w-full overflow-hidden">
          <h2 className="text-2xl font-bold text-white mb-4 font-univers">
            Choose a starting point
          </h2>
          <p className="text-white mb-1 text-[16px] font-bold font-univers">
            Select a song to begin your exploration:
          </p>
          <p className="text-white mb-2 text-[12px] font-univers">
            {" "}
            The artist's songs will appear on the left, and their most recently
            liked song on the right.
          </p>

          <div className="overflow-y-auto max-h-[50vh]">
            {initialTracks.map((track) => (
              <div
                key={track.id}
                onClick={() => handleSelectStartTrack(track)}
                className="flex items-center gap-4 p-4 hover:bg-white/10 rounded-lg cursor-pointer mb-2 transition-colors font-univers"
              >
                <img
                  src={
                    track.artwork_url ||
                    track.user?.avatar_url ||
                    "/default-artwork.png"
                  }
                  alt={track.title}
                  className="w-16 h-16 rounded object-cover"
                />
                <div>
                  <h3 className="text-white font-medium text-lg">
                    {track.title}
                  </h3>
                  <p className="text-white/70">
                    by{" "}
                    {track.user
                      ? track.user.username
                      : track.username || "Unknown Artist"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render loading state
  if (loading && !currentArtist) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  // Render error state
  if (error && !currentArtist) {
    return (
      <div className="flex items-center justify-center h-screen text-white">
        <p>Error: {error}</p>
      </div>
    );
  }

  // Get sorted tracks
  const sortedTracks = getSortedTracks();

  // Render the main interface
  return (
    <div className="flex flex-col md:flex-row flex-1 max-h-[calc(100vh-4rem)] text-white p-4 pt-0">
      {/* Artist panel - Shows artist's own songs */}
      <div className="w-full md:w-1/2 p-2 flex flex-col h-full max-h-full">
        <div className="bg-black/30 rounded-lg p-4 flex-grow overflow-hidden flex flex-col">
          {loading && artistSongs.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
            </div>
          ) : (
            <>
              {currentArtist && (
                <div className="mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={currentArtist.avatarUrl || "/default-avatar.png"}
                      alt={currentArtist.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <h2 className="text-xl font-bold font-univers">
                        {currentArtist.name}
                      </h2>
                      <p className="text-xs opacity-75 font-univers">
                        Artist Songs
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sorting options */}
              <div className="flex items-center mb-3 text-xs gap-2">
                <span className="opacity-75 font-univers">Sort by:</span>
                <button
                  onClick={() => handleSortChange("date")}
                  className={`px-2 py-1 font-univers rounded ${
                    sortBy === "date"
                      ? "bg-white/30"
                      : "bg-white/10 hover:bg-white/20"
                  }`}
                >
                  Date{" "}
                  {sortBy === "date" && (sortDirection === "desc" ? "↓" : "↑")}
                </button>
                <button
                  onClick={() => handleSortChange("plays")}
                  className={`px-2 py-1 rounded font-univers ${
                    sortBy === "plays"
                      ? "bg-white/30"
                      : "bg-white/10 hover:bg-white/20"
                  }`}
                >
                  Plays{" "}
                  {sortBy === "plays" && (sortDirection === "desc" ? "↓" : "↑")}
                </button>
              </div>

              {error && (
                <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-white/90 text-sm">{error}</p>
                </div>
              )}

              {/* Scrollable track list with enhanced info */}
              <div className="overflow-y-auto flex-grow pb-2">
                {sortedTracks.length > 0 ? (
                  sortedTracks.map((track) => (
                    <div
                      key={track.id}
                      className={`p-2 mb-2 rounded hover:bg-white/10 flex items-center gap-2 cursor-pointer ${
                        selectedSong && selectedSong.id === track.id
                          ? "bg-white/20"
                          : ""
                      }`}
                      onClick={() => handleSelectSong(track)}
                    >
                      <img
                        src={
                          track.artwork_url ||
                          track.user?.avatar_url ||
                          "/default-artwork.png"
                        }
                        alt={track.title}
                        className="w-10 h-10 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate font-univers">
                          {track.title}
                        </p>
                        <div className="flex items-center text-xs opacity-75 space-x-2 font-univers">
                          <span>
                            {track.playback_count?.toLocaleString() || 0} plays
                          </span>
                          <span>•</span>
                          <span title={formatReleaseDate(track)}>
                            {formatReleaseDate(track)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : !loading && !error ? (
                  <p className="text-center text-white/70">
                    No tracks found for this artist
                  </p>
                ) : null}
              </div>

              {/* Widget container */}
              {selectedSong && getSoundCloudWidgetUrl(selectedSong) && (
                <div className="mt-2 pt-2 border-t border-white/20">
                  <h3 className="text-sm font-medium mb-1 font-univers">
                    Selected track
                  </h3>
                  <div
                    className="h-[100px] bg-black/20 rounded-lg relative"
                    style={{ minHeight: "100px" }}
                  >
                    <iframe
                      width="100%"
                      height="100"
                      scrolling="no"
                      frameBorder="no"
                      allow="autoplay"
                      src={getSoundCloudWidgetUrl(selectedSong)}
                      title={selectedSong.title}
                      className="rounded absolute inset-0 w-[full] h-full"
                      onLoad={() =>
                        console.log("Widget loaded for:", selectedSong.title)
                      }
                    ></iframe>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right panel - Shows one liked song at a time */}
      <div className="w-full md:w-1/2 p-2 flex flex-col h-full max-h-full">
        <div className="bg-black/30 rounded-lg p-4 flex-grow overflow-hidden flex flex-col">
          <h2 className="text-xl font-bold font-univers">Liked Songs</h2>
          <p className="mb-2 text-xs text-white/80 font-univers">
            {artistLikedSongs.length > 0
              ? `Song ${currentLikedSongIndex + 1} of ${
                  artistLikedSongs.length
                }`
              : "No liked songs found"}
          </p>

          {currentLikedSong ? (
            <div className="flex flex-col overflow-y-auto h-full pt-2">
              <div className="flex flex-col items-center">
                <h3 className="text-lg font-bold mb-1 text-center font-univers">
                  {currentLikedSong.title}
                </h3>
                <div className="flex flex-row items-center mt-2 mb-1">
                  <img
                    src={
                      currentLikedSong.artwork_url ||
                      currentLikedSong.user?.avatar_url ||
                      "/default-artwork.png"
                    }
                    alt={currentLikedSong.title}
                    className="w-80 h-80 rounded-lg object-cover mb-6"
                  />
                  {/* Enhanced song info */}
                  <div className="flex-row justify-center items-center gap-4 ml-3">
                    <p className="text-xs opacity-75 font-univers">Artist</p>
                    <p className="text-xl font-univers text-white mb-1">
                      {currentLikedSong.user
                        ? currentLikedSong.user.username
                        : "Unknown Artist"}
                    </p>
                    <p className="text-xs opacity-75 font-univers">Plays</p>
                    <p className="text-xl font-bold font-univers mb-1">
                      {currentLikedSong.playback_count?.toLocaleString() || "0"}
                    </p>
                    <p className="text-xs opacity-75 font-univers">Released</p>
                    <p className="text-xl font-bold font-univers">
                      {formatReleaseDate(currentLikedSong)}
                    </p>
                  </div>
                </div>

                {/* SoundCloud Widget */}
                {getSoundCloudWidgetUrl(currentLikedSong) && (
                  <div className="w-full mt-1 mb-3 flex justify-center">
                    <iframe
                      width="75%"
                      height="100"
                      scrolling="no"
                      frameBorder="no"
                      allow="autoplay"
                      src={getSoundCloudWidgetUrl(currentLikedSong)}
                      title={currentLikedSong.title}
                      className="rounded"
                    ></iframe>
                  </div>
                )}

                {/* Navigation buttons */}
                <div className="flex space-x-2 mt-2">
                  <button
                    onClick={handleUpArrow}
                    disabled={currentLikedSongIndex <= 0}
                    className="px-3 py-1 text-sm bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-50 font-univers"
                  >
                    ↑ Previous
                  </button>
                  <button
                    onClick={handleDownArrow}
                    disabled={
                      currentLikedSongIndex >= artistLikedSongs.length - 1
                    }
                    className="px-3 py-1 text-sm bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-50 font-univers"
                  >
                    ↓ Next
                  </button>
                </div>

                <div className="flex space-x-2 mt-2">
                  <button
                    onClick={handleLeftArrow}
                    disabled={currentArtistIndex <= 0}
                    className="px-3 py-1 text-sm bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-50 font-univers"
                  >
                    ← Previous Artist
                  </button>
                  <button
                    onClick={handleRightArrow}
                    className="px-3 py-1 text-sm bg-white/10 rounded-lg hover:bg-white/20 font-univers"
                  >
                    Go to Artist →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex space-x-2 items-center mt-2">
              <button
                onClick={handleLeftArrow}
                disabled={currentArtistIndex <= 0}
                className="px-3 py-1 text-sm bg-white/10 rounded-lg hover:bg-white/20 items-center font-univers disabled:opacity-50"
              >
                ← Go back to previous artist
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MusicBrowser;
