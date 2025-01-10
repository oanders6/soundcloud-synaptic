"use client";

export default function LoginButton() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#FF7700]">
      <h1 className="text-6xl font-bold tracking-wider text-white mb-4">
        SYNAPTIC
      </h1>
      <p className="text-xl text-white opacity-90 mb-8">
        Graph visualization for music discovery
      </p>
      <button
        className="px-12 py-4 text-lg uppercase tracking-wider text-white border-2 border-white 
                   hover:bg-white hover:text-[#FF7700] transition-colors duration-300"
        onClick={() => (window.location.href = "/api/auth/login")}
      >
        Connect with SoundCloud
      </button>
    </div>
  );
}
