
export enum ShieldStatus {
  LOCKED = 'LOCKED',
  ACTIVE = 'ACTIVE',
  THREAT_DETECTED = 'THREAT_DETECTED'
}

export interface ProtectedApp {
  id: string;
  name: string;
  processName: string;
  icon: string;
  category: string;
  lastAttempt?: string;
  createdAt?: string;
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  event: string;
  type: 'info' | 'warning' | 'error' | 'success';
  app?: string;
}

export interface AIInsight {
  summary: string;
  recommendations: string[];
}

export interface SecurityPolicy {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high';
}
