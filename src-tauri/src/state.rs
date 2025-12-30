use crate::database::Database;
use crate::idle::IdleTracker;
use crate::monitor::ProcessMonitor;
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum ShieldStatus {
    LOCKED,
    ACTIVE,
    THREAT_DETECTED,
}

pub struct AppState {
    pub database: Arc<Database>,
    pub monitor: Arc<ProcessMonitor>,
    pub shield_status: Arc<Mutex<ShieldStatus>>,
    pub idle_tracker: Arc<IdleTracker>,
}

impl AppState {
    pub fn new(database: Database, monitor: ProcessMonitor, idle_tracker: IdleTracker) -> Self {
        AppState {
            database: Arc::new(database),
            monitor: Arc::new(monitor),
            shield_status: Arc::new(Mutex::new(ShieldStatus::LOCKED)),
            idle_tracker: Arc::new(idle_tracker),
        }
    }

    pub fn get_shield_status(&self) -> ShieldStatus {
        self.shield_status.lock().unwrap().clone()
    }

    pub fn set_shield_status(&self, status: ShieldStatus) {
        let mut shield = self.shield_status.lock().unwrap();
        *shield = status;
    }

    pub fn activate_shield(&self) {
        self.set_shield_status(ShieldStatus::ACTIVE);
        self.monitor.set_monitoring(false);
        println!("Shield activated - monitoring disabled");
    }

    pub fn lock_shield(&self) {
        self.set_shield_status(ShieldStatus::LOCKED);
        self.monitor.set_monitoring(true);
        println!("Shield locked - monitoring enabled");
    }

    #[allow(dead_code)]
    pub fn trigger_threat_detected(&self) {
        self.set_shield_status(ShieldStatus::THREAT_DETECTED);
    }

    pub fn update_protected_processes(&self) -> Result<(), String> {
        let apps = self.database.get_protected_apps()
            .map_err(|e| e.to_string())?;

        let process_names: Vec<String> = apps.iter()
            .map(|app| app.process_name.clone())
            .collect();

        self.monitor.update_protected_processes(process_names);
        Ok(())
    }
}
