import { useState } from "react";

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  // Dynamically points to localhost during dev or your Render backend URL in production
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const handleFetch = async (e) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setError("");
    setData(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweetUrl: url }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to fetch");
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8">
        <h1 className="text-3xl font-extrabold text-center tracking-tight mb-2 bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
          X Video Downloader
        </h1>
        <p className="text-slate-400 text-center text-sm mb-6">
          Paste a tweet link below to extract and download high-quality videos.
        </p>

        <form onSubmit={handleFetch} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://x.com/username/status/..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-sky-500/20 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Fetch Video"}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-950/50 border border-red-800 text-red-300 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        {data && (
          <div className="mt-6 space-y-4 border-t border-slate-800 pt-6 animate-fadeIn">
            <div className="flex items-center space-x-3">
              <img
                src={data.avatar}
                alt={data.author}
                className="w-10 h-10 rounded-full bg-slate-800"
              />
              <div>
                <h3 className="font-bold text-sm text-slate-200">
                  {data.author}
                </h3>
                <p className="text-xs text-slate-500">@{data.username}</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 line-clamp-3 bg-slate-950 p-3 rounded-lg border border-slate-800/60">
              {data.text}
            </p>

            <div className="relative rounded-xl overflow-hidden aspect-video bg-black border border-slate-800">
              <img
                src={data.thumbnail}
                alt="Thumbnail"
                className="w-full h-full object-cover opacity-80"
              />
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Available Resolutions
              </h4>
              {data.videos.map((vid, idx) => {
                const qualityLabel = vid.bitrate
                  ? `HD (${Math.round(vid.bitrate / 1000)} kbps)`
                  : `SD Quality`;
                
                const proxyDownloadUrl = `${API_BASE_URL}/api/proxy-download?url=${encodeURIComponent(vid.url)}`;

                return (
                  <a
                    key={idx}
                    href={proxyDownloadUrl}
                    className="flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700/85 rounded-xl border border-slate-700/60 transition-all group"
                  >
                    <span className="text-sm font-medium text-slate-200">
                      {qualityLabel}
                    </span>
                    <span className="text-xs font-semibold text-sky-400 group-hover:underline">
                      Download MP4 ↓
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}