import React, { useEffect, useState } from 'react';
import { X, Search, Play, Package, Loader } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface AppCandidate {
  name: string;
  process_name: string;
  exe_path: string | null;
  category: string;
}

interface AppPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (app: AppCandidate) => void;
}

const categoryIcons: { [key: string]: string } = {
  'Browser': '🌐',
  'Communication': '💬',
  'Development': '💻',
  'Media': '🎵',
  'Gaming': '🎮',
  'Graphics': '🎨',
  'Running': '▶️',
};

const AppPickerModal: React.FC<AppPickerModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [apps, setApps] = useState<AppCandidate[]>([]);
  const [filteredApps, setFilteredApps] = useState<AppCandidate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    if (isOpen) {
      loadApps();
    }
  }, [isOpen]);

  useEffect(() => {
    filterApps();
  }, [searchTerm, apps, selectedCategory]);

  const loadApps = async () => {
    setIsLoading(true);
    try {
      const candidates = await invoke<AppCandidate[]>('get_app_candidates');
      setApps(candidates);
      setFilteredApps(candidates);
    } catch (error) {
      console.error('Failed to load apps:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterApps = () => {
    let filtered = apps;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(app => app.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(app =>
        app.name.toLowerCase().includes(term) ||
        app.process_name.toLowerCase().includes(term)
      );
    }

    setFilteredApps(filtered);
  };

  const handleSelect = (app: AppCandidate) => {
    onSelect(app);
    onClose();
    setSearchTerm('');
    setSelectedCategory('All');
  };

  const categories = ['All', ...Array.from(new Set(apps.map(app => app.category)))];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Select Application</h2>
              <p className="text-sm text-slate-400 mt-1">Choose from installed apps or running processes</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search applications..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              autoFocus
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* App List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No applications found</p>
              <p className="text-sm mt-2">Try adjusting your search or category filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredApps.map((app, index) => (
                <button
                  key={`${app.process_name}-${index}`}
                  onClick={() => handleSelect(app)}
                  className="group bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-emerald-500/30 rounded-2xl p-4 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">
                      {categoryIcons[app.category] || '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold truncate group-hover:text-emerald-400 transition-colors">
                        {app.name}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono truncate">
                        Process: <span className="text-emerald-400">{app.process_name}</span>
                      </p>
                      {app.exe_path && (
                        <p className="text-[10px] text-slate-600 truncate mt-0.5" title={app.exe_path}>
                          {app.exe_path}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          app.category === 'Running'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {app.category}
                        </span>
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-5 h-5 text-emerald-400" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <p>
              {filteredApps.length} application{filteredApps.length !== 1 ? 's' : ''} found
            </p>
            <p className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Click to add
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppPickerModal;
