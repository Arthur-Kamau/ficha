
import { ProtectedApp, SecurityLog, SecurityPolicy } from './types';

export const INITIAL_APPS: ProtectedApp[] = [
  { id: '1', name: 'Brave Browser', processName: 'brave', icon: '🌐', category: 'Browser' },
  { id: '2', name: 'VS Code', processName: 'code', icon: '💻', category: 'Development' },
  { id: '3', name: 'Terminal', processName: 'gnome-terminal', icon: '🐚', category: 'System' },
  { id: '4', name: 'Discord', processName: 'discord', icon: '💬', category: 'Social' },
];

export const INITIAL_LOGS: SecurityLog[] = [
  { id: '1', timestamp: new Date().toLocaleTimeString(), event: 'Ficha Security Service Started', type: 'info' },
  { id: '2', timestamp: new Date().toLocaleTimeString(), event: 'Shield initialized in LOCK mode', type: 'warning' },
];

export const INITIAL_POLICIES: SecurityPolicy[] = [
  { id: 'p1', title: 'Auto-kill Protected Apps', description: 'Automatically kill any process in the watchlist if Ficha is not unlocked.', enabled: true, severity: 'high' },
  { id: 'p2', title: 'Deep Kernel Monitoring', description: 'Enable system-wide hooks to monitor low-level process spawning.', enabled: true, severity: 'medium' },
  { id: 'p3', title: 'Stealth Mode', description: 'Hide Ficha process from standard process managers like htop.', enabled: false, severity: 'medium' },
  { id: 'p4', title: 'Log External Connections', description: 'Record all network sockets opened by protected applications.', enabled: true, severity: 'low' },
  { id: 'p5', title: 'Root Access Prevention', description: 'Block sudo elevation attempts from unauthorized binaries.', enabled: true, severity: 'high' },
];

export const SYSTEM_PROMPT = `
You are Ficha Security AI Assistant. You analyze system logs from a Linux application guard. 
Based on provided logs of "Protected App" launch attempts, provide a concise security analysis.
Format your response as JSON matching this structure:
{
  "summary": "Short summary of status",
  "recommendations": ["list of actionable security tips"]
}
`;
