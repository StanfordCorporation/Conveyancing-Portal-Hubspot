import { useRef, useEffect, useState } from "react";

export const VideoBackground = ({ isDarkMode = false }) => {
  const videoRef = useRef(null);
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      console.log("✅ Video loaded successfully");
      setVideoLoaded(true);
      setVideoError(false);
    };

    const handleError = (e) => {
      console.error("❌ Video loading error:", e);
      setVideoError(true);
    };

    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("error", handleError);

    // Try to play
    video.play().catch(err => {
      console.log("Video autoplay prevented (this is normal):", err.message);
    });

    return () => {
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("error", handleError);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Fallback gradient background */}
      <div
        className={`absolute inset-0 transition-all duration-1000 ${
          videoError || !videoLoaded
            ? "opacity-100"
            : "opacity-0"
        }`}
      >
        <div className={`absolute inset-0 ${
          isDarkMode
            ? "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
            : "bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50"
        }`} />
      </div>

      {/* Video element */}
      <video
        ref={videoRef}
        muted
        autoPlay
        loop
        playsInline
        preload="auto"
        className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-1000 ${
          videoLoaded && !videoError ? "opacity-100" : "opacity-0"
        }`}
        style={{
          filter: `brightness(${isDarkMode ? "0.7" : "1"}) saturate(${isDarkMode ? "0.8" : "1.1"})`,
          transition: "filter 0.7s ease"
        }}
      >
        <source src="/videos/Bris_cityscape.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Overlay to ensure text readability */}
      <div
        className={`absolute inset-0 transition-colors duration-700 ${
          isDarkMode
            ? "bg-black/40"
            : "bg-black/25"
        }`}
      />

      {/* Error message for debugging */}
      {videoError && (
        <div className="absolute bottom-4 left-4 bg-red-500/80 text-white px-4 py-2 rounded text-sm z-50">
          Video failed to load. Using fallback background.
        </div>
      )}
    </div>
  );
};
