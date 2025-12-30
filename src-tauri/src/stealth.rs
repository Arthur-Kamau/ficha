use std::ffi::CString;

pub struct StealthMode;

impl StealthMode {
    /// Enable stealth mode by changing process name
    pub fn enable() -> Result<(), String> {
        // Change process name to something innocuous
        Self::set_process_name("systemd-resolve")?;
        println!("Stealth mode enabled - process name changed");
        Ok(())
    }

    /// Disable stealth mode by restoring original name
    pub fn disable() -> Result<(), String> {
        Self::set_process_name("ficha-app")?;
        println!("Stealth mode disabled - process name restored");
        Ok(())
    }

    #[cfg(target_os = "linux")]
    fn set_process_name(name: &str) -> Result<(), String> {
        use nix::libc;
        use std::os::raw::c_char;

        // prctl constants for Linux
        const PR_SET_NAME: i32 = 15;

        let c_name = CString::new(name)
            .map_err(|_| "Invalid process name".to_string())?;

        unsafe {
            let result = libc::prctl(
                PR_SET_NAME,
                c_name.as_ptr() as *const c_char,
                0,
                0,
                0
            );

            if result == 0 {
                Ok(())
            } else {
                Err(format!("Failed to set process name: {}", result))
            }
        }
    }

    #[cfg(not(target_os = "linux"))]
    fn set_process_name(_name: &str) -> Result<(), String> {
        Err("Stealth mode only supported on Linux".to_string())
    }
}
