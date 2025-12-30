use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use chrono::Utc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtectedApp {
    pub id: String,
    pub name: String,
    pub process_name: String,
    pub icon: String,
    pub category: String,
    pub last_attempt: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityLog {
    pub id: String,
    pub timestamp: String,
    pub event: String,
    #[serde(rename = "type")]
    pub log_type: String,
    pub app: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityPolicy {
    pub id: String,
    pub title: String,
    pub description: String,
    pub enabled: bool,
    pub severity: String,
}

pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn new(db_path: &str) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        let db = Database {
            conn: Arc::new(Mutex::new(conn)),
        };
        db.initialize_schema()?;
        db.seed_initial_data()?;
        Ok(db)
    }

    fn initialize_schema(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "CREATE TABLE IF NOT EXISTS protected_apps (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                process_name TEXT NOT NULL UNIQUE,
                icon TEXT NOT NULL,
                category TEXT NOT NULL,
                last_attempt TEXT,
                created_at TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS security_logs (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                event TEXT NOT NULL,
                log_type TEXT NOT NULL,
                app TEXT
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS security_policies (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                enabled INTEGER NOT NULL,
                severity TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            [],
        )?;

        Ok(())
    }

    fn seed_initial_data(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        // Check if we already have data
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM protected_apps",
            [],
            |row| row.get(0)
        )?;

        if count == 0 {
            // Seed initial protected apps
            let initial_apps = vec![
                ("brave", "Brave Browser", "brave", "🌐", "Browser"),
                ("chrome", "Google Chrome", "chrome", "🌐", "Browser"),
                ("firefox", "Firefox", "firefox", "🦊", "Browser"),
                ("discord", "Discord", "discord", "💬", "Communication"),
                ("slack", "Slack", "slack", "💼", "Productivity"),
                ("steam", "Steam", "steam", "🎮", "Gaming"),
            ];

            for app in initial_apps {
                let id = uuid::Uuid::new_v4().to_string();
                let now = Utc::now().to_rfc3339();
                conn.execute(
                    "INSERT INTO protected_apps (id, name, process_name, icon, category, created_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    params![id, app.1, app.2, app.3, app.4, now],
                )?;
            }

            // Seed initial policies
            let policies = vec![
                ("Auto-kill unauthorized apps", "Immediately terminate any protected application launched without authorization", true, "high"),
                ("Stealth Mode", "Hide Ficha from process monitors and system utilities", false, "medium"),
                ("Root Access Prevention", "Block unauthorized sudo/root elevation attempts", true, "high"),
                ("Session Lock on Idle", "Automatically lock shield after 10 minutes of inactivity", false, "low"),
            ];

            for (idx, policy) in policies.iter().enumerate() {
                let id = format!("policy_{}", idx + 1);
                conn.execute(
                    "INSERT INTO security_policies (id, title, description, enabled, severity)
                     VALUES (?1, ?2, ?3, ?4, ?5)",
                    params![id, policy.0, policy.1, if policy.2 { 1 } else { 0 }, policy.3],
                )?;
            }

            // Add initial log
            let log_id = uuid::Uuid::new_v4().to_string();
            let now = Utc::now().format("%H:%M:%S").to_string();
            conn.execute(
                "INSERT INTO security_logs (id, timestamp, event, log_type)
                 VALUES (?1, ?2, ?3, ?4)",
                params![log_id, now, "Ficha Security Vault initialized", "info"],
            )?;
        }

        Ok(())
    }

    // Protected Apps CRUD
    pub fn get_protected_apps(&self) -> Result<Vec<ProtectedApp>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, process_name, icon, category, last_attempt, created_at
             FROM protected_apps ORDER BY created_at DESC"
        )?;

        let apps = stmt.query_map([], |row| {
            Ok(ProtectedApp {
                id: row.get(0)?,
                name: row.get(1)?,
                process_name: row.get(2)?,
                icon: row.get(3)?,
                category: row.get(4)?,
                last_attempt: row.get(5)?,
                created_at: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

        Ok(apps)
    }

    pub fn add_protected_app(&self, name: String, process_name: String, icon: String, category: String) -> Result<ProtectedApp> {
        let conn = self.conn.lock().unwrap();
        let id = uuid::Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO protected_apps (id, name, process_name, icon, category, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, name, process_name, icon, category, now],
        )?;

        Ok(ProtectedApp {
            id: id.clone(),
            name,
            process_name,
            icon,
            category,
            last_attempt: None,
            created_at: now,
        })
    }

    pub fn remove_protected_app(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM protected_apps WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn update_last_attempt(&self, process_name: &str, timestamp: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE protected_apps SET last_attempt = ?1 WHERE process_name = ?2",
            params![timestamp, process_name],
        )?;
        Ok(())
    }

    // Security Logs CRUD
    pub fn get_security_logs(&self, limit: i64) -> Result<Vec<SecurityLog>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, timestamp, event, log_type, app
             FROM security_logs ORDER BY rowid DESC LIMIT ?1"
        )?;

        let logs = stmt.query_map(params![limit], |row| {
            Ok(SecurityLog {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                event: row.get(2)?,
                log_type: row.get(3)?,
                app: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

        Ok(logs)
    }

    pub fn add_security_log(&self, event: String, log_type: String, app: Option<String>) -> Result<SecurityLog> {
        let conn = self.conn.lock().unwrap();
        let id = uuid::Uuid::new_v4().to_string();
        let timestamp = Utc::now().format("%H:%M:%S").to_string();

        conn.execute(
            "INSERT INTO security_logs (id, timestamp, event, log_type, app)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, timestamp, event, log_type, app],
        )?;

        Ok(SecurityLog {
            id: id.clone(),
            timestamp: timestamp.clone(),
            event,
            log_type,
            app,
        })
    }

    // Security Policies CRUD
    pub fn get_security_policies(&self) -> Result<Vec<SecurityPolicy>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, description, enabled, severity FROM security_policies"
        )?;

        let policies = stmt.query_map([], |row| {
            Ok(SecurityPolicy {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                enabled: row.get::<_, i32>(3)? != 0,
                severity: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

        Ok(policies)
    }

    pub fn toggle_policy(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE security_policies SET enabled = NOT enabled WHERE id = ?1",
            params![id],
        )?;
        Ok(())
    }

    #[allow(dead_code)]
    pub fn is_policy_enabled(&self, id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let enabled: i32 = conn.query_row(
            "SELECT enabled FROM security_policies WHERE id = ?1",
            params![id],
            |row| row.get(0)
        )?;
        Ok(enabled != 0)
    }

    // Settings CRUD
    pub fn get_setting(&self, key: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        match conn.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params![key],
            |row| row.get(0)
        ) {
            Ok(value) => Ok(Some(value)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            params![key, value],
        )?;
        Ok(())
    }

    pub fn get_bool_setting(&self, key: &str, default: bool) -> Result<bool> {
        match self.get_setting(key)? {
            Some(value) => Ok(value == "true"),
            None => Ok(default),
        }
    }

    pub fn get_int_setting(&self, key: &str, default: i64) -> Result<i64> {
        match self.get_setting(key)? {
            Some(value) => value.parse().map_err(|_| rusqlite::Error::InvalidQuery),
            None => Ok(default),
        }
    }
}
