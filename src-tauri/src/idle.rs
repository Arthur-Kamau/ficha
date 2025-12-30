use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

pub struct IdleTracker {
    last_activity: Arc<Mutex<Instant>>,
    timeout_minutes: Arc<Mutex<i64>>,
    is_enabled: Arc<Mutex<bool>>,
}

impl IdleTracker {
    pub fn new() -> Self {
        IdleTracker {
            last_activity: Arc::new(Mutex::new(Instant::now())),
            timeout_minutes: Arc::new(Mutex::new(10)), // Default 10 minutes
            is_enabled: Arc::new(Mutex::new(false)),
        }
    }

    /// Reset the idle timer (called on user activity)
    pub fn reset(&self) {
        let mut last = self.last_activity.lock().unwrap();
        *last = Instant::now();
    }

    /// Check if idle timeout has been exceeded
    pub fn is_idle(&self) -> bool {
        if !self.is_enabled() {
            return false;
        }

        let last = self.last_activity.lock().unwrap();
        let timeout = self.timeout_minutes.lock().unwrap();
        let idle_duration = Instant::now().duration_since(*last);

        idle_duration >= Duration::from_secs((*timeout as u64) * 60)
    }

    /// Get idle time in seconds
    pub fn get_idle_seconds(&self) -> u64 {
        let last = self.last_activity.lock().unwrap();
        Instant::now().duration_since(*last).as_secs()
    }

    /// Set idle timeout in minutes (max 10)
    pub fn set_timeout(&self, minutes: i64) {
        let mut timeout = self.timeout_minutes.lock().unwrap();
        *timeout = minutes.min(10).max(1); // Clamp between 1 and 10 minutes
    }

    /// Get current timeout setting
    pub fn get_timeout(&self) -> i64 {
        *self.timeout_minutes.lock().unwrap()
    }

    /// Enable/disable idle tracking
    pub fn set_enabled(&self, enabled: bool) {
        let mut is_enabled = self.is_enabled.lock().unwrap();
        *is_enabled = enabled;
        if enabled {
            // Reset timer when enabling
            drop(is_enabled);
            self.reset();
        }
    }

    /// Check if idle tracking is enabled
    pub fn is_enabled(&self) -> bool {
        *self.is_enabled.lock().unwrap()
    }

    /// Start monitoring loop for idle detection
    pub async fn start_monitoring_loop<F>(&self, interval_ms: u64, on_idle: F)
    where
        F: Fn() + Send + 'static,
    {
        let mut interval = tokio::time::interval(Duration::from_millis(interval_ms));

        loop {
            interval.tick().await;

            if self.is_idle() {
                on_idle();
                // Reset after triggering to avoid repeated calls
                self.reset();
            }
        }
    }
}
