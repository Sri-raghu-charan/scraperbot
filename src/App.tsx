/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  Compass, 
  Star, 
  EyeOff, 
  Download, 
  Loader2, 
  Globe, 
  Navigation,
  Layers,
  Moon,
  Sun,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getTravelIntelligence, type Place, type TravelIntelligenceResponse } from './services/gemini';

// BUG FIX: API key check must happen at module load time since Vite injects it
// at build/dev time via define, not at runtime. Check for empty string too.
const API_KEY_CONFIGURED = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 0);

export default function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TravelIntelligenceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'Famous' | 'Underrated'>('all');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // BUG FIX: Show API key error on mount, not inside async call
    if (!API_KEY_CONFIGURED) {
      setError("Groq API Key is missing. Please add GROQ_API_KEY to your .env file. Get a free key at https://console.groq.com");
    }
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
    }
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);
    setData(null); // BUG FIX: Clear stale data before new search
    try {
      const result = await getTravelIntelligence(query.trim());
      setData(result);
      setFilter('all'); // BUG FIX: Reset filter on new search so results are visible
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const downloadJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `travel-intelligence-${data.requested_area.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // BUG FIX: Normalize popularity comparison (handle casing edge cases from AI)
  const filteredPlaces = data?.places.filter(p =>
    filter === 'all' || p.popularity === filter
  ) || [];

  return (
    <div className="min-h-screen bg-bg text-ink font-sans selection:bg-accent selection:text-white transition-colors duration-500 overflow-x-hidden relative">
      {/* Atmospheric Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-accent/5 blur-[120px] animate-pulse" />
        <div className="absolute top-[40%] -right-[10%] w-[50%] h-[50%] rounded-full bg-accent/3 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-line px-6 py-4 md:px-12 md:py-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-4 group cursor-pointer">
            <div className="w-12 h-12 bg-accent flex items-center justify-center rounded-2xl shadow-lg shadow-accent/20 group-hover:scale-105 transition-transform duration-300">
              <Globe className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif italic text-2xl md:text-3xl leading-none tracking-tight">Tour Go</h1>
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-40 mt-1.5 font-mono font-medium">Global Discovery Engine</p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsDark(!isDark)}
            className="md:hidden p-3 glass rounded-xl hover:bg-accent hover:text-white transition-all duration-300"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex flex-1 max-w-2xl gap-4 items-center">
          {/* BUG FIX: Removed <form> nesting inside header — keeping as form is fine,
              but added aria-label for accessibility */}
          <form onSubmit={handleSearch} className="relative flex-1 group" aria-label="Search travel places">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Where should we explore?"
              disabled={loading}
              className="w-full bg-surface/50 border border-line py-4 px-6 pr-14 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent placeholder:opacity-30 font-sans text-sm transition-all duration-300 backdrop-blur-sm disabled:opacity-60"
            />
            <button 
              type="submit" 
              disabled={loading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-accent text-white rounded-xl shadow-md shadow-accent/20 hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Search"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
          </form>
          
          <button 
            onClick={() => setIsDark(!isDark)}
            className="hidden md:flex p-4 glass rounded-2xl hover:bg-accent hover:text-white transition-all duration-300 shadow-sm"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="relative z-10 p-6 md:p-12 max-w-[1600px] mx-auto">
        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 glass border border-red-500/20 bg-red-500/5 rounded-2xl p-6 flex items-start gap-4"
          >
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-mono font-bold text-red-500 uppercase tracking-wider mb-1">Error</p>
              <p className="text-sm opacity-70">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Empty / Landing State */}
        {!data && !loading && (
          <div className="max-w-4xl mx-auto mt-20 text-center space-y-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {[
                { icon: Layers, label: "Multi-Source", desc: "Aggregates from premium travel journals and social signals." },
                { icon: Compass, label: "Geospatial", desc: "Precise coordinates for seamless navigation." },
                { icon: EyeOff, label: "Hidden Gems", desc: "Proprietary discovery of underrated global locations." }
              ].map((item, i) => (
                <div key={i} className="glass p-8 rounded-3xl text-left space-y-4 hover:border-accent/30 transition-colors duration-500 group">
                  <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all duration-500">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-mono font-bold tracking-widest text-accent mb-1">{item.label}</p>
                    <p className="text-sm opacity-60 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <p className="font-serif italic text-4xl md:text-5xl opacity-10">Discover the world.</p>
              <p className="text-xs font-mono uppercase tracking-[0.3em] opacity-30">Type any city, region, or country above</p>
            </motion.div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center mt-32 gap-8">
            <div className="relative w-24 h-24">
              <div className="w-24 h-24 border-t-2 border-accent rounded-full animate-spin relative z-10" />
              <Globe className="w-8 h-8 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent font-bold">Intelligence Scan in Progress</p>
              <p className="text-xs opacity-40">Aggregating global travel signals for <span className="text-accent font-mono">{query}</span>...</p>
            </div>
          </div>
        )}

        {/* Results */}
        {data && !loading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            {/* Stats & Filters */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 glass p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-black/5">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                  <p className="text-[10px] uppercase font-mono font-bold tracking-[0.2em] text-accent">Intelligence Report</p>
                </div>
                <h2 className="text-5xl md:text-7xl font-serif italic tracking-tight">{data.requested_area}</h2>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <span className="px-3 py-1 glass rounded-full text-[10px] font-mono opacity-60 uppercase tracking-wider">
                    {data.places.length} Locations Found
                  </span>
                  <span className="px-3 py-1 glass rounded-full text-[10px] font-mono opacity-60 uppercase tracking-wider">
                    {data.places.filter(p => p.popularity === 'Underrated').length} Hidden Gems
                  </span>
                  <span className="px-3 py-1 glass rounded-full text-[10px] font-mono opacity-60 uppercase tracking-wider">
                    {data.places.filter(p => p.popularity === 'Famous').length} Famous Spots
                  </span>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex glass p-1.5 rounded-2xl">
                  {(['all', 'Famous', 'Underrated'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-6 py-2.5 rounded-xl text-[10px] uppercase font-mono font-bold tracking-wider transition-all duration-500 ${
                        filter === f ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'hover:bg-accent/5 opacity-60'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={downloadJSON}
                  className="flex items-center gap-2 glass px-6 py-4 rounded-2xl text-[10px] uppercase font-mono font-bold tracking-wider hover:bg-accent hover:text-white transition-all duration-500 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Export Data
                </button>
              </div>
            </div>

            {/* Data Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredPlaces.map((place, idx) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, delay: Math.min(idx * 0.04, 0.6) }}
                    key={`${place.place_name}-${idx}`}
                    className="glass p-8 rounded-[2rem] group hover:border-accent/40 transition-all duration-500 cursor-default flex flex-col justify-between h-full hover:shadow-2xl hover:shadow-accent/5"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold text-accent">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span className={`text-[8px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border ${
                              place.popularity === 'Famous' 
                                ? 'border-amber-500/30 text-amber-600 bg-amber-500/5' 
                                : 'border-emerald-500/30 text-emerald-600 bg-emerald-500/5'
                            }`}>
                              {place.popularity}
                            </span>
                          </div>
                          <h3 className="text-2xl font-serif italic leading-tight group-hover:text-accent transition-colors duration-300">
                            {place.place_name}
                          </h3>
                        </div>
                        <div className={`p-2 rounded-xl glass transition-colors duration-300 shrink-0 ${
                          place.popularity === 'Famous' ? 'text-amber-500' : 'text-emerald-500'
                        }`}>
                          {place.popularity === 'Famous' ? <Star className="w-4 h-4 fill-current" /> : <EyeOff className="w-4 h-4" />}
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center gap-2 text-xs opacity-50 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span className="truncate">{place.parent_area}</span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {place.category.map(cat => (
                            <span key={cat} className="text-[9px] uppercase font-mono font-bold border border-line px-2.5 py-1 rounded-lg opacity-60 group-hover:opacity-100 group-hover:border-accent/20 transition-all">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 mt-8 border-t border-line flex justify-between items-center">
                      <div className="font-mono text-[9px] opacity-30 group-hover:opacity-60 space-y-1 transition-opacity">
                        {/* BUG FIX: Guard toFixed() — place.latitude may be a string if AI misbehaves */}
                        <p>LAT: {Number(place.latitude).toFixed(6)}</p>
                        <p>LNG: {Number(place.longitude).toFixed(6)}</p>
                      </div>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 glass rounded-xl hover:bg-accent hover:text-white transition-all duration-300 shadow-sm"
                        title={`Open ${place.place_name} in Google Maps`}
                      >
                        <Navigation className="w-4 h-4" />
                      </a>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Empty filter state */}
            {filteredPlaces.length === 0 && (
              <div className="text-center py-32 glass rounded-[3rem] border-dashed">
                <Compass className="w-12 h-12 mx-auto mb-4 opacity-10" />
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-30">No locations found for this filter.</p>
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-line p-12 flex flex-col md:flex-row justify-between items-center gap-8 glass">
        <div className="flex flex-col md:flex-row items-center gap-8 font-mono text-[10px] uppercase tracking-[0.2em] opacity-40">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span>System Status: Operational</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 bg-accent rounded-full" />
            <span>Last Intelligence Sync: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <p className="font-mono text-[10px] uppercase tracking-widest opacity-30">© 2026 Tour Go</p>
          <div className="w-8 h-8 glass rounded-lg flex items-center justify-center opacity-40">
            <Globe className="w-4 h-4" />
          </div>
        </div>
      </footer>
    </div>
  );
}
