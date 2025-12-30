use nix::sys::signal::{self, Signal};
use nix::unistd::Pid;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::time;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: i32,
    pub name: String,
    pub exe_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppCandidate {
    pub name: String,
    pub process_name: String,
    pub exe_path: Option<String>,
    pub category: String,
}

pub struct ProcessMonitor {
    is_monitoring: Arc<Mutex<bool>>,
    protected_processes: Arc<Mutex<Vec<String>>>,
}

impl ProcessMonitor {
    pub fn new() -> Self {
        ProcessMonitor {
            is_monitoring: Arc::new(Mutex::new(false)),
            protected_processes: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub fn set_monitoring(&self, enabled: bool) {
        let mut monitoring = self.is_monitoring.lock().unwrap();
        *monitoring = enabled;
    }

    pub fn is_monitoring(&self) -> bool {
        *self.is_monitoring.lock().unwrap()
    }

    pub fn update_protected_processes(&self, processes: Vec<String>) {
        let mut protected = self.protected_processes.lock().unwrap();
        *protected = processes;
    }

    pub fn get_all_processes() -> Vec<ProcessInfo> {
        let mut processes = Vec::new();

        if let Ok(entries) = fs::read_dir("/proc") {
            for entry in entries.flatten() {
                if let Ok(file_name) = entry.file_name().into_string() {
                    // Check if directory name is a number (PID)
                    if let Ok(pid) = file_name.parse::<i32>() {
                        if let Some(process_info) = Self::get_process_info(pid) {
                            processes.push(process_info);
                        }
                    }
                }
            }
        }

        processes
    }

    fn get_process_info(pid: i32) -> Option<ProcessInfo> {
        // Read /proc/[pid]/comm for process name
        let comm_path = PathBuf::from(format!("/proc/{}/comm", pid));
        let name = fs::read_to_string(&comm_path).ok()?.trim().to_string();

        // Read /proc/[pid]/exe for executable path (may fail for some processes)
        let exe_path = fs::read_link(format!("/proc/{}/exe", pid))
            .ok()
            .and_then(|p| p.to_str().map(|s| s.to_string()));

        Some(ProcessInfo {
            pid,
            name,
            exe_path,
        })
    }

    pub fn check_and_kill_protected(&self) -> Vec<(i32, String)> {
        let mut killed = Vec::new();

        if !self.is_monitoring() {
            return killed;
        }

        let protected = self.protected_processes.lock().unwrap().clone();
        let processes = Self::get_all_processes();

        for process in processes {
            // Check if process name matches any protected process
            let is_protected = protected.iter().any(|protected_name| {
                Self::process_matches(protected_name, &process.name, &process.exe_path)
            });

            if is_protected {
                // Kill the process with SIGKILL
                if Self::kill_process(process.pid) {
                    killed.push((process.pid, process.name.clone()));
                    println!("Killed protected process: {} (PID: {})", process.name, process.pid);
                }
            }
        }

        killed
    }

    /// Improved matching logic that handles app name variations
    /// e.g., "brave" matches "brave", "brave-browser", "brave-browser-stable"
    fn process_matches(protected_name: &str, process_name: &str, exe_path: &Option<String>) -> bool {
        let protected_lower = protected_name.to_lowercase();
        let process_lower = process_name.to_lowercase();

        // Exact match
        if process_lower == protected_lower {
            return true;
        }

        // Check if process name starts with protected name (e.g., "brave" matches "brave-browser")
        if process_lower.starts_with(&protected_lower) {
            return true;
        }

        // Check if protected name starts with process name (e.g., "brave-browser" matches "brave")
        if protected_lower.starts_with(&process_lower) {
            return true;
        }

        // Check executable path
        if let Some(exe) = exe_path {
            let exe_lower = exe.to_lowercase();

            // Check if exe contains the protected name
            if exe_lower.contains(&protected_lower) {
                return true;
            }

            // Extract binary name from path and check
            if let Some(binary_name) = exe.split('/').last() {
                let binary_lower = binary_name.to_lowercase();
                if binary_lower == protected_lower
                    || binary_lower.starts_with(&protected_lower)
                    || protected_lower.starts_with(&binary_lower) {
                    return true;
                }
            }
        }

        false
    }

    fn kill_process(pid: i32) -> bool {
        match signal::kill(Pid::from_raw(pid), Signal::SIGKILL) {
            Ok(_) => true,
            Err(e) => {
                eprintln!("Failed to kill process {}: {}", pid, e);
                false
            }
        }
    }

    pub async fn start_monitoring_loop<F>(
        &self,
        interval_ms: u64,
        on_kill: F,
    ) where
        F: Fn(i32, String) + Send + 'static,
    {
        let mut interval = time::interval(Duration::from_millis(interval_ms));

        loop {
            interval.tick().await;

            if self.is_monitoring() {
                let killed = self.check_and_kill_protected();
                for (pid, name) in killed {
                    on_kill(pid, name);
                }
            }
        }
    }

    /// Get unique running processes (deduped by process name)
    pub fn get_unique_processes() -> Vec<AppCandidate> {
        let processes = Self::get_all_processes();
        let mut seen = std::collections::HashSet::new();
        let mut candidates = Vec::new();

        for process in processes {
            // Skip system processes and common daemons
            if Self::is_system_process(&process.name) {
                continue;
            }

            // Only add if we haven't seen this process name before
            if seen.insert(process.name.clone()) {
                let display_name = Self::format_display_name(&process.name);
                candidates.push(AppCandidate {
                    name: display_name,
                    process_name: process.name,
                    exe_path: process.exe_path,
                    category: "Running".to_string(),
                });
            }
        }

        // Sort by name
        candidates.sort_by(|a, b| a.name.cmp(&b.name));
        candidates
    }

    /// Get common installed applications from standard Linux paths
    pub fn get_installed_apps() -> Vec<AppCandidate> {
        let mut apps = Vec::new();
        let search_paths = vec![
            "/usr/bin",
            "/usr/local/bin",
            "/snap/bin",
            "/var/lib/flatpak/exports/bin",
        ];

        let common_apps = vec![
            ("firefox", "Firefox", "Browser"),
            ("google-chrome", "Google Chrome", "Browser"),
            ("google-chrome-stable", "Google Chrome", "Browser"),
            ("chromium", "Chromium", "Browser"),
            ("chromium-browser", "Chromium", "Browser"),
            ("brave", "Brave Browser", "Browser"),
            ("brave-browser", "Brave Browser", "Browser"),
            ("brave-browser-stable", "Brave Browser", "Browser"),
            ("code", "Visual Studio Code", "Development"),
            ("discord", "Discord", "Communication"),
            ("slack", "Slack", "Communication"),
            ("spotify", "Spotify", "Media"),
            ("vlc", "VLC Media Player", "Media"),
            ("steam", "Steam", "Gaming"),
            ("gimp", "GIMP", "Graphics"),
            ("obs", "OBS Studio", "Media"),
            ("telegram", "Telegram", "Communication"),
            ("telegram-desktop", "Telegram", "Communication"),
            ("zoom", "Zoom", "Communication"),
        ];

        for (binary, display_name, category) in common_apps {
            // Check if binary exists in any search path
            for path in &search_paths {
                let full_path = format!("{}/{}", path, binary);
                if std::path::Path::new(&full_path).exists() {
                    apps.push(AppCandidate {
                        name: display_name.to_string(),
                        process_name: binary.to_string(),
                        exe_path: Some(full_path),
                        category: category.to_string(),
                    });
                    break;
                }
            }
        }

        apps.sort_by(|a, b| a.name.cmp(&b.name));
        apps
    }

    fn is_system_process(name: &str) -> bool {
        let system_processes = vec![
            "systemd", "kthreadd", "kworker", "ksoftirqd", "rcu_", "migration",
            "watchdog", "cpuhp", "kdevtmpfs", "netns", "khungtaskd", "oom_reaper",
            "writeback", "kcompactd", "crypto", "kblockd", "md", "kswapd",
            "init", "bash", "sh", "dbus", "upstart", "snapd",
        ];

        system_processes.iter().any(|sys| name.starts_with(sys))
    }

    fn format_display_name(process_name: &str) -> String {
        // Convert process name to title case for display
        let name = process_name.replace('-', " ").replace('_', " ");
        name.split_whitespace()
            .map(|word| {
                let mut chars = word.chars();
                match chars.next() {
                    Some(first) => first.to_uppercase().chain(chars).collect::<String>(),
                    None => String::new(),
                }
            })
            .collect::<Vec<_>>()
            .join(" ")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_all_processes() {
        let processes = ProcessMonitor::get_all_processes();
        assert!(!processes.is_empty(), "Should find at least some processes");

        // Should at least find the current process
        let current_pid = std::process::id() as i32;
        let found_self = processes.iter().any(|p| p.pid == current_pid);
        assert!(found_self, "Should find current process");
    }

    #[test]
    fn test_process_monitor_state() {
        let monitor = ProcessMonitor::new();
        assert!(!monitor.is_monitoring(), "Should start with monitoring disabled");

        monitor.set_monitoring(true);
        assert!(monitor.is_monitoring(), "Should enable monitoring");

        monitor.set_monitoring(false);
        assert!(!monitor.is_monitoring(), "Should disable monitoring");
    }
}
