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

  // FIX 2: Handler for selecting a song to play in the widget
  const handleSelectSong = (track) => {
    console.log("Selected song:", track.title);
    setSelectedSong(track);
  };

  // Handler for selecting a starting track
  const handleSelectStartTrack = (track) => {
    setSelectedStartTrack(track);
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
          <h2 className="text-2xl font-bold text-white mb-4">
            Choose a starting point
          </h2>
          <p className="text-white/80 mb-6">
            Select an artist or song to begin your exploration
          </p>

          <div className="overflow-y-auto max-h-[50vh]">
            {initialTracks.map((track) => (
              <div
                key={track.id}
                onClick={() => handleSelectStartTrack(track)}
                className="flex items-center gap-4 p-4 hover:bg-white/10 rounded-lg cursor-pointer mb-2 transition-colors"
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

  // Render the main interface
  return (
    <div className="flex flex-col md:flex-row h-screen w-full text-white p-4">
      {/* Artist panel - Shows artist's own songs */}
      <div className="w-full md:w-1/2 p-4 flex flex-col">
        <div className="bg-black/30 rounded-lg p-6 flex-grow overflow-hidden flex flex-col">
          {loading && artistSongs.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
            </div>
          ) : (
            <>
              {currentArtist && (
                <div className="mb-6">
                  <div className="flex items-center gap-4">
                    <img
                      src={currentArtist.avatarUrl || "/default-avatar.png"}
                      alt={currentArtist.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div>
                      <h2 className="text-2xl font-bold">
                        {currentArtist.name}
                      </h2>
                      <p className="text-sm opacity-75">Artist Songs</p>
                    </div>
                  </div>
                </div>
              )}

              {/* FIX: Make sure this container doesn't take all the space */}
              <div className="overflow-y-auto flex-grow pb-4">
                {error && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <p className="text-white/90">{error}</p>
                  </div>
                )}

                {/* FIX 2: Make artist tracks clickable */}
                {artistSongs.length > 0 ? (
                  artistSongs.map((track, index) => (
                    <div
                      key={track.id}
                      className={`p-3 mb-2 rounded hover:bg-white/10 flex items-center gap-3 cursor-pointer ${
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
                        className="w-12 h-12 rounded object-cover"
                      />
                      <div>
                        <p className="font-medium">{track.title}</p>
                        <p className="text-xs opacity-75">
                          {track.playback_count
                            ? `${track.playback_count.toLocaleString()} plays`
                            : ""}
                        </p>
                      </div>
                    </div>
                  ))
                ) : !loading && !error ? (
                  <p className="text-center text-white/70">
                    No tracks found for this artist
                  </p>
                ) : null}
              </div>

              {/* FIX: Widget container with fixed height and styling */}
              {selectedSong && getSoundCloudWidgetUrl(selectedSong) && (
                <div className="mt-4 pt-4 border-t border-white/20">
                  <h3 className="text-lg font-medium mb-2">Now Playing</h3>
                  <p className="text-sm mb-2">{selectedSong.title}</p>
                  <div
                    className="h-[166px] bg-black/20 rounded-lg relative"
                    style={{ minHeight: "166px" }}
                  >
                    <iframe
                      width="100%"
                      height="166"
                      scrolling="no"
                      frameBorder="no"
                      allow="autoplay"
                      src={getSoundCloudWidgetUrl(selectedSong)}
                      title={selectedSong.title}
                      className="rounded absolute inset-0 w-full h-full"
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
      <div className="w-full md:w-1/2 p-4 flex flex-col">
        <div className="bg-black/30 rounded-lg p-6 flex-grow overflow-hidden">
          <h2 className="text-2xl font-bold mb-2">Liked Songs</h2>
          <p className="mb-4 text-sm">
            {artistLikedSongs.length > 0
              ? `Song ${currentLikedSongIndex + 1} of ${
                  artistLikedSongs.length
                }`
              : "No liked songs found"}
          </p>

          {currentLikedSong ? (
            <div className="flex flex-col items-center">
              <img
                src={
                  currentLikedSong.artwork_url ||
                  currentLikedSong.user?.avatar_url ||
                  "/default-artwork.png"
                }
                alt={currentLikedSong.title}
                className="w-full max-w-md h-auto rounded-lg object-cover mb-4"
              />
              <h3 className="text-xl font-bold mb-1">
                {currentLikedSong.title}
              </h3>
              <p className="text-sm mb-4">
                by{" "}
                {currentLikedSong.user
                  ? currentLikedSong.user.username
                  : "Unknown Artist"}
              </p>

              {/* SoundCloud Widget */}
              {getSoundCloudWidgetUrl(currentLikedSong) && (
                <div className="w-full max-w-md mt-2 mb-6">
                  <iframe
                    width="100%"
                    height="166"
                    scrolling="no"
                    frameBorder="no"
                    allow="autoplay"
                    src={getSoundCloudWidgetUrl(currentLikedSong)}
                    title={currentLikedSong.title}
                    className="rounded"
                  ></iframe>
                </div>
              )}

              <div className="flex space-x-4 mt-8">
                <button
                  onClick={handleUpArrow}
                  disabled={currentLikedSongIndex <= 0}
                  className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-50"
                >
                  ↑ Previous Liked Song
                </button>
                <button
                  onClick={handleDownArrow}
                  disabled={
                    currentLikedSongIndex >= artistLikedSongs.length - 1
                  }
                  className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-50"
                >
                  ↓ Next Liked Song
                </button>
              </div>

              <div className="flex space-x-4 mt-4">
                <button
                  onClick={handleLeftArrow}
                  disabled={currentArtistIndex <= 0}
                  className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-50"
                >
                  ← Previous Artist
                </button>
                <button
                  onClick={handleRightArrow}
                  className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20"
                >
                  Go to Artist →
                </button>
              </div>
            </div>
          ) : (
            <p className="text-center">
              No liked songs available for this artist
            </p>
          )}
        </div>
      </div>

      {/* Navigation guide */}
      <div className="absolute bottom-16 left-4 bg-black/50 p-3 rounded-lg text-sm">
        <p>Use arrow keys to navigate:</p>
        <p>↑↓ Browse liked songs</p>
        <p>← Go back to previous artist</p>
        <p>→ Go to song's artist</p>
      </div>
    </div>
  );
};

export default MusicBrowser;
