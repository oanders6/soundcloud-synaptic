"use client";

export default function LoginButton() {
  return (
    <button
      onClick={() => (window.location.href = "/api/auth/login")}
      className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded"
    >
      Connect with SoundCloud
    </button>
  );
}
