
import React, { useEffect, useState } from 'react';
import {
  Shield, ShieldAlert, ShieldCheck, Plus, Trash2, Power, History,
  Activity, Terminal, Settings, Bell, Database, Lock, Search,
  Filter, Download, AlertTriangle, CheckCircle2, ChevronRight
} from 'lucide-react';
import { ProtectedApp, SecurityLog, ShieldStatus, SecurityPolicy } from '../types';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import AppPickerModal from './AppPickerModal';

type Tab = 'dashboard' | 'policies' | 'config' | 'logs';

interface AppCandidate {
  name: string;
  process_name: string;
  exe_path: string | null;
  category: string;
}

const Dashboard: React.FC<{ onLock: () => void }> = ({ onLock }) => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [status, setStatus] = useState<ShieldStatus>(ShieldStatus.ACTIVE);
  const [apps, setApps] = useState<ProtectedApp[]>([]);
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [policies, setPolicies] = useState<SecurityPolicy[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAppPickerOpen, setIsAppPickerOpen] = useState(false);
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [idleTimeout, setIdleTimeout] = useState(10);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Set up real-time event listeners
  useEffect(() => {
    const unlistenPromises = [
      listen<SecurityLog>('security-log', (event) => {
        setLogs(prev => [event.payload, ...prev.slice(0, 99)]);
      }),
      listen<ShieldStatus>('shield-status', (event) => {
        setStatus(event.payload);
      }),
      listen<ProtectedApp>('app-added', (event) => {
        setApps(prev => [...prev, event.payload]);
      }),
      listen<string>('app-removed', (event) => {
        setApps(prev => prev.filter(app => app.id !== event.payload));
      }),
      listen<[number, string]>('process-killed', (event) => {
        console.log(`Process killed: PID ${event.payload[0]}, Name: ${event.payload[1]}`);
      }),
      listen<boolean>('auto-locked', (event) => {
        if (event.payload) {
          console.log('Shield auto-locked due to inactivity');
        }
      }),
    ];

    return () => {
      Promise.all(unlistenPromises).then(unlisteners => {
        unlisteners.forEach(unlisten => unlisten());
      });
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [appsData, logsData, policiesData, statusData, autostartData, idleTimeoutData] = await Promise.all([
        invoke<ProtectedApp[]>('get_protected_apps'),
        invoke<SecurityLog[]>('get_security_logs', { limit: 100 }),
        invoke<SecurityPolicy[]>('get_security_policies'),
        invoke<ShieldStatus>('get_shield_status'),
        invoke<boolean>('get_autostart_enabled'),
        invoke<number>('get_idle_timeout'),
      ]);

      setApps(appsData);
      setLogs(logsData);
      setPolicies(policiesData);
      setStatus(statusData);
      setAutostartEnabled(autostartData);
      setIdleTimeout(idleTimeoutData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePolicy = async (id: string) => {
    try {
      await invoke('toggle_security_policy', { id });
      setPolicies(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
    } catch (err) {
      console.error('Error toggling policy:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle policy');
    }
  };

  const handleAppSelected = async (app: AppCandidate) => {
    try {
      const categoryIcons: { [key: string]: string } = {
        'Browser': '🌐',
        'Communication': '💬',
        'Development': '💻',
        'Media': '🎵',
        'Gaming': '🎮',
        'Graphics': '🎨',
        'Running': '▶️',
      };

      const icon = categoryIcons[app.category] || '📦';

      await invoke<ProtectedApp>('add_protected_app', {
        name: app.name,
        processName: app.process_name,
        icon: icon,
        category: app.category,
      });
    } catch (err) {
      console.error('Error adding app:', err);
      setError(err instanceof Error ? err.message : 'Failed to add app');
    }
  };

  const removeApp = async (id: string) => {
    try {
      await invoke('remove_protected_app', { id });
    } catch (err) {
      console.error('Error removing app:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove app');
    }
  };

  const filteredLogs = logs.filter(l =>
    l.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-emerald-500 animate-pulse mx-auto mb-4" />
          <p className="text-slate-400">Loading security dashboard...</p>
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-emerald-500" /> Protected Watchlist
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {apps.map(app => (
              <div key={app.id} className="group bg-slate-800/50 border border-slate-700/50 hover:border-emerald-500/30 rounded-2xl p-4 transition-all">
                <div className="flex items-center gap-4">
                  <div className="text-3xl">{app.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold truncate">{app.name}</h4>
                    <p className="text-xs text-slate-500 font-mono truncate">Process: {app.processName}</p>
                    {app.lastAttempt && (
                      <p className="text-[10px] text-red-400">Last attempt: {app.lastAttempt}</p>
                    )}
                  </div>
                  <button onClick={() => removeApp(app.id)} className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => setIsAppPickerOpen(true)}
              className="bg-slate-900 border border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all group hover:bg-slate-800/50"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-600/10 group-hover:bg-emerald-600/20 flex items-center justify-center transition-all">
                <Plus className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors">Add Application</p>
                <p className="text-xs text-slate-500 mt-1">Select from installed or running apps</p>
              </div>
            </button>
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" /> Active Policies
            </h3>
            <button onClick={() => setActiveTab('policies')} className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors">View All <ChevronRight className="w-3 h-3" /></button>
          </div>
          <div className="space-y-3">
            {policies.filter(p => p.enabled).slice(0, 3).map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium">{p.title}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.severity === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                  {p.severity.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col h-[500px]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <History className="w-5 h-5 text-slate-400" /> Live Events
          </h3>
          <button onClick={() => setActiveTab('logs')} className="text-[10px] font-bold text-emerald-400 hover:underline">Full Feed</button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {logs.slice(0, 10).map(log => (
            <div key={log.id} className={`p-3 rounded-xl border ${log.type === 'error' ? 'bg-red-500/5 border-red-500/20' : log.type === 'success' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-800/50 border-slate-700/50'}`}>
              <div className="flex justify-between items-start mb-1">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${log.type === 'error' ? 'bg-red-500/20 text-red-400' : log.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>{log.type}</span>
                <span className="text-[9px] font-mono text-slate-500">{log.timestamp}</span>
              </div>
              <p className="text-xs font-medium truncate">{log.event}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const renderPolicies = () => (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
        <div className="mb-8">
          <h3 className="text-2xl font-bold mb-2">Security Enforcement Policies</h3>
          <p className="text-slate-400">Manage the active rules governing your system behavior.</p>
        </div>
        <div className="space-y-4">
          {policies.map(policy => (
            <div key={policy.id} className="flex items-center justify-between p-5 bg-slate-800/40 rounded-2xl border border-slate-700/40 hover:bg-slate-800/60 transition-colors">
              <div className="flex items-start gap-4">
                <div className={`mt-1 p-2 rounded-lg ${policy.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/50 text-slate-500'}`}>
                  {policy.severity === 'high' ? <AlertTriangle className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="font-bold text-lg">{policy.title}</h4>
                  <p className="text-sm text-slate-400 max-w-xl">{policy.description}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                      policy.severity === 'high' ? 'text-red-400 border-red-400/20 bg-red-400/5' :
                      policy.severity === 'medium' ? 'text-orange-400 border-orange-400/20 bg-orange-400/5' :
                      'text-blue-400 border-blue-400/20 bg-blue-400/5'
                    }`}>Severity: {policy.severity}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => togglePolicy(policy.id)}
                className={`relative w-14 h-7 rounded-full transition-colors duration-200 focus:outline-none ${policy.enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${policy.enabled ? 'translate-x-7' : ''}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderConfig = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl">
      <div className="space-y-8">
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
            <Settings className="w-5 h-5 text-indigo-400" /> General Settings
          </h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-medium">Desktop Notifications</span>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-emerald-500" />
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-medium">Auto-start on System Boot</span>
              </div>
              <input
                type="checkbox"
                checked={autostartEnabled}
                onChange={async (e) => {
                  try {
                    await invoke('toggle_autostart', { enabled: e.target.checked });
                    setAutostartEnabled(e.target.checked);
                  } catch (err) {
                    console.error('Error toggling autostart:', err);
                    setError(err instanceof Error ? err.message : 'Failed to toggle autostart');
                  }
                }}
                className="w-4 h-4 accent-emerald-500"
              />
            </div>
            <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30 space-y-3">
              <label className="text-sm font-medium text-slate-400">Logging Intensity</label>
              <input type="range" min="0" max="100" defaultValue="75" className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
              <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold">
                <span>Silent</span>
                <span>Optimized</span>
                <span>Verbose</span>
              </div>
            </div>
            <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-400">Session Lock on Idle</label>
                <span className="text-xs font-bold text-emerald-400">{idleTimeout} min</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={idleTimeout}
                onChange={async (e) => {
                  const newTimeout = parseInt(e.target.value);
                  setIdleTimeout(newTimeout);
                  try {
                    await invoke('set_idle_timeout', { minutes: newTimeout });
                    await invoke('reset_idle_timer');
                  } catch (err) {
                    console.error('Error setting idle timeout:', err);
                    setError(err instanceof Error ? err.message : 'Failed to set idle timeout');
                  }
                }}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold">
                <span>1 min</span>
                <span>5 min</span>
                <span>10 min</span>
              </div>
              <p className="text-[10px] text-slate-500">Shield auto-locks after {idleTimeout} minute{idleTimeout !== 1 ? 's' : ''} of inactivity (requires policy enabled)</p>
            </div>
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
            <Database className="w-5 h-5 text-amber-400" /> Log Management
          </h3>
          <div className="space-y-4">
            <p className="text-xs text-slate-500">{logs.length} log entries stored. Logs older than 30 days are auto-purged.</p>
            <div className="flex gap-3">
              <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold py-3 rounded-xl transition-all border border-slate-700">Clear Logs</button>
              <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold py-3 rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2">
                <Download className="w-3 h-3" /> Export CSV
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="space-y-8">
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
            <Lock className="w-5 h-5 text-emerald-400" /> Authentication
          </h3>
          <div className="space-y-4">
            <p className="text-xs text-slate-400">Ficha uses your system PAM authentication for secure access control.</p>
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
              <p className="text-xs text-emerald-400">✓ System authentication active</p>
            </div>
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl border-dashed border-red-500/30">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-red-400">
            <AlertTriangle className="w-5 h-5" /> Danger Zone
          </h3>
          <p className="text-xs text-slate-500 mb-6">These actions cannot be undone and may weaken your system security.</p>
          <div className="space-y-3">
            <button className="w-full text-left p-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition-all">
              <h5 className="text-sm font-bold text-red-400">Disable Ficha Service</h5>
              <p className="text-[10px] text-red-500/70">Stopping the core kernel daemon.</p>
            </button>
            <button className="w-full text-left p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl transition-all">
              <h5 className="text-sm font-bold text-slate-300">Reset Factory Defaults</h5>
              <p className="text-[10px] text-slate-500">Restore all policies and configs.</p>
            </button>
          </div>
        </section>
      </div>
    </div>
  );

  const renderLogs = () => (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl flex flex-col h-[calc(100vh-160px)]">
      <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">System Security Feed</h3>
          <p className="text-sm text-slate-500">{logs.length} events recorded this session</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Filter logs..."
              className="bg-slate-800 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-64"
            />
          </div>
          <button className="p-2 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition-colors">
            <Filter className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        <table className="w-full text-left border-separate border-spacing-y-2 px-4">
          <thead className="sticky top-0 bg-slate-900 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <tr>
              <th className="px-4 py-2">Timestamp</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Event Description</th>
              <th className="px-4 py-2 text-right">Identifier</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => (
              <tr key={log.id} className="group hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-4 rounded-l-2xl border-y border-l border-slate-800/50 bg-slate-800/20 group-hover:bg-transparent">
                  <span className="text-xs font-mono text-slate-400">{log.timestamp}</span>
                </td>
                <td className="px-4 py-4 border-y border-slate-800/50 bg-slate-800/20 group-hover:bg-transparent">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    log.type === 'error' ? 'text-red-400 bg-red-400/10' :
                    log.type === 'success' ? 'text-emerald-400 bg-emerald-400/10' :
                    log.type === 'warning' ? 'text-amber-400 bg-amber-400/10' :
                    'text-slate-400 bg-slate-700/50'
                  }`}>
                    {log.type}
                  </span>
                </td>
                <td className="px-4 py-4 border-y border-slate-800/50 bg-slate-800/20 group-hover:bg-transparent">
                  <span className="text-sm font-medium text-slate-200">{log.event}</span>
                </td>
                <td className="px-4 py-4 rounded-r-2xl border-y border-r border-slate-800/50 bg-slate-800/20 group-hover:bg-transparent text-right">
                  <span className="text-[10px] font-mono text-slate-600">EVT_{log.id.slice(-6)}</span>
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={4} className="py-20 text-center text-slate-500">No logs matching your search criteria.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {error && (
        <div className="fixed top-4 right-4 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl shadow-lg z-50 max-w-md">
          <p className="text-sm font-medium">{error}</p>
          <button onClick={() => setError(null)} className="absolute top-2 right-2 text-red-400 hover:text-red-300">×</button>
        </div>
      )}

      <aside className="w-full md:w-72 bg-slate-900 border-b md:border-r border-slate-800 flex flex-col p-6 sticky top-0 h-auto md:h-screen z-50">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight leading-none">FICHA</h1>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Enterprise Shield</span>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'dashboard' ? 'bg-emerald-600/10 text-emerald-400 shadow-inner border border-emerald-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Activity className="w-5 h-5" /> Dashboard
          </button>
          <button onClick={() => setActiveTab('policies')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'policies' ? 'bg-emerald-600/10 text-emerald-400 shadow-inner border border-emerald-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <ShieldCheck className="w-5 h-5" /> Policies
          </button>
          <button onClick={() => setActiveTab('config')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'config' ? 'bg-emerald-600/10 text-emerald-400 shadow-inner border border-emerald-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Terminal className="w-5 h-5" /> Advanced Config
          </button>
          <button onClick={() => setActiveTab('logs')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'logs' ? 'bg-emerald-600/10 text-emerald-400 shadow-inner border border-emerald-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <History className="w-5 h-5" /> Full Logs
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <button onClick={onLock} className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white px-4 py-3 rounded-xl font-semibold transition-all group">
            <Power className="w-5 h-5 group-hover:rotate-90 transition-transform" /> Terminate Session
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 lg:p-10">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-bold mb-1 capitalize">{activeTab.replace('config', 'configuration')}</h2>
            <p className="text-slate-400">System Version: 4.2.0-stable | Kernel Hooked: Yes</p>
          </div>
          <div className={`px-6 py-3 rounded-2xl flex items-center gap-4 border transition-all ${status === ShieldStatus.ACTIVE ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : status === ShieldStatus.THREAT_DETECTED ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse' : 'bg-slate-500/10 border-slate-500/20 text-slate-400'}`}>
            {status === ShieldStatus.ACTIVE ? <ShieldCheck className="w-6 h-6" /> : status === ShieldStatus.THREAT_DETECTED ? <ShieldAlert className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
            <div className="text-sm">
              <p className="font-bold leading-none">
                {status === ShieldStatus.ACTIVE ? 'SHIELD ACTIVE' : status === ShieldStatus.THREAT_DETECTED ? 'MITIGATION ACTIVE' : 'SHIELD LOCKED'}
              </p>
              <p className="opacity-70 text-[10px]">
                {status === ShieldStatus.ACTIVE ? 'Protected session active' : status === ShieldStatus.THREAT_DETECTED ? 'Threat neutralized' : 'Real-time monitoring online'}
              </p>
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'policies' && renderPolicies()}
        {activeTab === 'config' && renderConfig()}
        {activeTab === 'logs' && renderLogs()}
      </main>

      <AppPickerModal
        isOpen={isAppPickerOpen}
        onClose={() => setIsAppPickerOpen(false)}
        onSelect={handleAppSelected}
      />
    </div>
  );
};

export default Dashboard;
