use std::fs;
use std::path::PathBuf;
use std::env;

pub struct AutoStart;

impl AutoStart {
    fn get_autostart_dir() -> Result<PathBuf, String> {
        let home = env::var("HOME").map_err(|_| "Could not get HOME directory".to_string())?;
        Ok(PathBuf::from(format!("{}/.config/autostart", home)))
    }

    fn get_desktop_file_path() -> Result<PathBuf, String> {
        let autostart_dir = Self::get_autostart_dir()?;
        Ok(autostart_dir.join("ficha.desktop"))
    }

    pub fn enable() -> Result<(), String> {
        let autostart_dir = Self::get_autostart_dir()?;
        let desktop_file = Self::get_desktop_file_path()?;

        // Create autostart directory if it doesn't exist
        fs::create_dir_all(&autostart_dir)
            .map_err(|e| format!("Failed to create autostart directory: {}", e))?;

        // Get the current executable path
        let exe_path = env::current_exe()
            .map_err(|e| format!("Failed to get executable path: {}", e))?;

        let exe_path_str = exe_path.to_str()
            .ok_or("Invalid executable path")?;

        // Create desktop file content
        let desktop_content = format!(
            r#"[Desktop Entry]
Type=Application
Name=FICHA
GenericName=Application Security Vault
Comment=Application security monitoring and protection
Exec={}
Icon=ficha
Terminal=false
Categories=Security;System;
X-GNOME-Autostart-enabled=true
StartupWMClass=ficha
"#,
            exe_path_str
        );

        // Write desktop file
        fs::write(&desktop_file, desktop_content)
            .map_err(|e| format!("Failed to write desktop file: {}", e))?;

        println!("Autostart enabled: {:?}", desktop_file);
        Ok(())
    }

    pub fn disable() -> Result<(), String> {
        let desktop_file = Self::get_desktop_file_path()?;

        if desktop_file.exists() {
            fs::remove_file(&desktop_file)
                .map_err(|e| format!("Failed to remove desktop file: {}", e))?;
            println!("Autostart disabled");
        }

        Ok(())
    }

    pub fn is_enabled() -> Result<bool, String> {
        let desktop_file = Self::get_desktop_file_path()?;
        Ok(desktop_file.exists())
    }
}
