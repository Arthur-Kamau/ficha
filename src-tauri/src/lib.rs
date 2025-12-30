mod auth;
mod autostart;
mod database;
mod idle;
mod monitor;
mod state;
mod stealth;

use database::{Database, ProtectedApp, SecurityLog, SecurityPolicy};
use monitor::{ProcessMonitor, AppCandidate, ProcessInfo};
use state::{AppState, ShieldStatus};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State};
use chrono::Utc;

// Tauri commands

#[tauri::command]
async fn authenticate(password: String) -> Result<bool, String> {
    auth::AuthManager::authenticate_current_user(&password)
}

#[tauri::command]
async fn get_current_username() -> Result<String, String> {
    auth::AuthManager::get_current_user()
}

#[tauri::command]
async fn get_shield_status(state: State<'_, Arc<AppState>>) -> Result<ShieldStatus, String> {
    Ok(state.get_shield_status())
}

#[tauri::command]
async fn activate_shield(state: State<'_, Arc<AppState>>) -> Result<(), String> {
    state.activate_shield();
    // Reset idle timer when user becomes active
    state.idle_tracker.reset();
    Ok(())
}

#[tauri::command]
async fn lock_shield(
    state: State<'_, Arc<AppState>>,
    app_handle: AppHandle,
) -> Result<(), String> {
    state.lock_shield();

    // Update protected processes list
    state.update_protected_processes()?;

    // Add log entry
    let log = state.database.add_security_log(
        "Shield locked - monitoring enabled".to_string(),
        "info".to_string(),
        None,
    ).map_err(|e| e.to_string())?;

    // Emit event to frontend
    app_handle.emit("security-log", &log).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn get_protected_apps(state: State<'_, Arc<AppState>>) -> Result<Vec<ProtectedApp>, String> {
    state.database.get_protected_apps().map_err(|e| e.to_string())
}

#[tauri::command]
async fn add_protected_app(
    state: State<'_, Arc<AppState>>,
    app_handle: AppHandle,
    name: String,
    process_name: String,
    icon: String,
    category: String,
) -> Result<ProtectedApp, String> {
    let app = state.database
        .add_protected_app(name.clone(), process_name, icon, category)
        .map_err(|e| e.to_string())?;

    // Update the monitor's protected process list
    state.update_protected_processes()?;

    // Add log entry
    let log = state.database.add_security_log(
        format!("New application added to watch list: {}", name),
        "info".to_string(),
        Some(name),
    ).map_err(|e| e.to_string())?;

    // Emit events to frontend
    app_handle.emit("app-added", &app).map_err(|e| e.to_string())?;
    app_handle.emit("security-log", &log).map_err(|e| e.to_string())?;

    Ok(app)
}

#[tauri::command]
async fn remove_protected_app(
    state: State<'_, Arc<AppState>>,
    app_handle: AppHandle,
    id: String,
) -> Result<(), String> {
    state.database.remove_protected_app(&id).map_err(|e| e.to_string())?;

    // Update the monitor's protected process list
    state.update_protected_processes()?;

    // Emit event to frontend
    app_handle.emit("app-removed", id).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn get_security_logs(
    state: State<'_, Arc<AppState>>,
    limit: i64,
) -> Result<Vec<SecurityLog>, String> {
    state.database.get_security_logs(limit).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_security_policies(state: State<'_, Arc<AppState>>) -> Result<Vec<SecurityPolicy>, String> {
    state.database.get_security_policies().map_err(|e| e.to_string())
}

#[tauri::command]
async fn toggle_security_policy(
    state: State<'_, Arc<AppState>>,
    app_handle: AppHandle,
    id: String,
) -> Result<(), String> {
    state.database.toggle_policy(&id).map_err(|e| e.to_string())?;

    // Handle special policies
    let is_enabled = state.database.is_policy_enabled(&id).map_err(|e| e.to_string())?;

    match id.as_str() {
        "policy_2" => {
            // Stealth Mode
            if is_enabled {
                stealth::StealthMode::enable()?;
            } else {
                stealth::StealthMode::disable()?;
            }
        },
        "policy_4" => {
            // Session Lock on Idle
            state.idle_tracker.set_enabled(is_enabled);
            if is_enabled {
                state.idle_tracker.reset();
            }
        },
        _ => {}
    }

    // Emit event to frontend
    app_handle.emit("policy-toggled", id).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn get_running_processes() -> Result<Vec<AppCandidate>, String> {
    Ok(ProcessMonitor::get_unique_processes())
}

#[tauri::command]
async fn get_installed_apps() -> Result<Vec<AppCandidate>, String> {
    Ok(ProcessMonitor::get_installed_apps())
}

#[tauri::command]
async fn get_app_candidates() -> Result<Vec<AppCandidate>, String> {
    let candidates = ProcessMonitor::get_installed_apps();
    let running = ProcessMonitor::get_unique_processes();

    // Merge installed and running, preferring installed apps info
    let mut seen = std::collections::HashSet::new();
    let mut result = Vec::new();

    // Add installed apps first
    for app in candidates {
        seen.insert(app.process_name.clone());
        result.push(app);
    }

    // Add running processes that aren't in installed apps
    for app in running {
        if !seen.contains(&app.process_name) {
            result.push(app);
        }
    }

    Ok(result)
}

#[tauri::command]
async fn get_all_running_processes() -> Result<Vec<ProcessInfo>, String> {
    Ok(ProcessMonitor::get_all_processes())
}

// Settings commands
#[tauri::command]
async fn toggle_autostart(state: State<'_, Arc<AppState>>, enabled: bool) -> Result<(), String> {
    if enabled {
        autostart::AutoStart::enable()?;
    } else {
        autostart::AutoStart::disable()?;
    }

    state.database.set_setting("autostart", if enabled { "true" } else { "false" })
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn get_autostart_enabled(state: State<'_, Arc<AppState>>) -> Result<bool, String> {
    state.database.get_bool_setting("autostart", false)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn set_idle_timeout(state: State<'_, Arc<AppState>>, minutes: i64) -> Result<(), String> {
    let clamped = minutes.min(10).max(1);
    state.idle_tracker.set_timeout(clamped);
    state.database.set_setting("idle_timeout", &clamped.to_string())
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_idle_timeout(state: State<'_, Arc<AppState>>) -> Result<i64, String> {
    Ok(state.idle_tracker.get_timeout())
}

#[tauri::command]
async fn reset_idle_timer(state: State<'_, Arc<AppState>>) -> Result<(), String> {
    state.idle_tracker.reset();
    Ok(())
}

fn setup_idle_monitoring_task(app_handle: AppHandle, state: Arc<AppState>) {
    tauri::async_runtime::spawn(async move {
        let idle_tracker = state.idle_tracker.clone();
        let shield_status = state.shield_status.clone();
        let database = state.database.clone();

        idle_tracker.start_monitoring_loop(5000, move || {
            println!("Idle timeout detected - locking shield");

            // Lock the shield
            {
                let mut status = shield_status.lock().unwrap();
                *status = ShieldStatus::LOCKED;
            }

            // Add log entry
            let _ = database.add_security_log(
                "Shield auto-locked due to inactivity".to_string(),
                "warning".to_string(),
                None,
            );

            // Emit event to frontend
            let _ = app_handle.emit("shield-status", ShieldStatus::LOCKED);
            let _ = app_handle.emit("auto-locked", true);
        }).await;
    });
}

fn setup_monitoring_task(app_handle: AppHandle, state: Arc<AppState>) {
    tauri::async_runtime::spawn(async move {
        let monitor = state.monitor.clone();
        let database = state.database.clone();
        let shield_status = state.shield_status.clone();

        monitor.start_monitoring_loop(1000, move |pid, process_name| {
            println!("Process killed: {} (PID: {})", process_name, pid);

            // Update last attempt timestamp
            let now = Utc::now().format("%H:%M:%S").to_string();
            let _ = database.update_last_attempt(&process_name, &now);

            // Add security logs
            let log1 = database.add_security_log(
                format!("Unauthorized launch attempt: {}", process_name),
                "error".to_string(),
                Some(process_name.clone()),
            );

            let log2 = database.add_security_log(
                format!("Process [{}] killed by Ficha Kernel (PID: {})", process_name, pid),
                "success".to_string(),
                None,
            );

            // Set threat detected status
            {
                let mut status = shield_status.lock().unwrap();
                *status = ShieldStatus::THREAT_DETECTED;
            }

            // Emit events to frontend
            if let Ok(log) = log1 {
                let _ = app_handle.emit("security-log", &log);
            }
            if let Ok(log) = log2 {
                let _ = app_handle.emit("security-log", &log);
            }
            let _ = app_handle.emit("process-killed", (pid, process_name));
            let _ = app_handle.emit("shield-status", ShieldStatus::THREAT_DETECTED);

            // Reset to LOCKED after 3 seconds
            let handle_clone = app_handle.clone();
            let status_clone = shield_status.clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                {
                    let mut status = status_clone.lock().unwrap();
                    if matches!(*status, ShieldStatus::THREAT_DETECTED) {
                        *status = ShieldStatus::LOCKED;
                        let _ = handle_clone.emit("shield-status", ShieldStatus::LOCKED);
                    }
                }
            });
        }).await;
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize database
            let db_path = app.path()
                .app_data_dir()
                .expect("Failed to get app data directory")
                .join("ficha.db");

            // Create parent directory if it doesn't exist
            if let Some(parent) = db_path.parent() {
                std::fs::create_dir_all(parent).expect("Failed to create app data directory");
            }

            let db_path_str = db_path.to_str().expect("Invalid database path");
            let database = Database::new(db_path_str)
                .expect("Failed to initialize database");

            // Initialize process monitor
            let monitor = ProcessMonitor::new();

            // Initialize idle tracker
            let idle_tracker = idle::IdleTracker::new();

            // Load idle timeout from database
            if let Ok(timeout) = database.get_int_setting("idle_timeout", 10) {
                idle_tracker.set_timeout(timeout);
            }

            // Check and apply stealth mode policy
            if let Ok(true) = database.is_policy_enabled("policy_2") {
                let _ = stealth::StealthMode::enable();
            }

            // Check and enable idle tracking if policy is enabled
            if let Ok(true) = database.is_policy_enabled("policy_4") {
                idle_tracker.set_enabled(true);
            }

            // Create app state
            let state = Arc::new(AppState::new(database, monitor, idle_tracker));

            // Start monitoring tasks
            setup_monitoring_task(app.handle().clone(), state.clone());
            setup_idle_monitoring_task(app.handle().clone(), state.clone());

            // Manage state
            app.manage(state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            authenticate,
            get_current_username,
            get_shield_status,
            activate_shield,
            lock_shield,
            get_protected_apps,
            add_protected_app,
            remove_protected_app,
            get_security_logs,
            get_security_policies,
            toggle_security_policy,
            get_running_processes,
            get_installed_apps,
            get_app_candidates,
            get_all_running_processes,
            toggle_autostart,
            get_autostart_enabled,
            set_idle_timeout,
            get_idle_timeout,
            reset_idle_timer,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
