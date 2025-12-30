use std::env;

pub struct AuthManager;

impl AuthManager {
    /// Authenticate a user against the system using PAM (if available)
    /// Falls back to simple password check for development/testing
    #[cfg(feature = "pam-auth")]
    pub fn authenticate(username: &str, password: &str) -> Result<bool, String> {
        use pam::Authenticator;

        let mut auth = Authenticator::with_password("system-auth")
            .map_err(|e| format!("Failed to initialize PAM: {}", e))?;

        // Set the username and password
        auth.get_handler().set_credentials(username, password);

        // Attempt authentication
        match auth.authenticate() {
            Ok(_) => Ok(true),
            Err(e) => {
                eprintln!("PAM authentication failed: {}", e);
                Ok(false)
            }
        }
    }

    /// Fallback authentication for development (when PAM is not available)
    /// WARNING: This is NOT secure and should only be used for development/testing
    #[cfg(not(feature = "pam-auth"))]
    pub fn authenticate(_username: &str, password: &str) -> Result<bool, String> {
        // For development, accept any password longer than 3 characters
        // In production with PAM enabled, this will not be used
        Ok(password.len() > 3)
    }

    /// Get the current username from the environment
    pub fn get_current_user() -> Result<String, String> {
        env::var("USER").or_else(|_| env::var("USERNAME"))
            .map_err(|_| "Could not determine current user".to_string())
    }

    /// Authenticate using the current logged-in user
    pub fn authenticate_current_user(password: &str) -> Result<bool, String> {
        let username = Self::get_current_user()?;
        Self::authenticate(&username, password)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_current_user() {
        let user = AuthManager::get_current_user();
        assert!(user.is_ok(), "Should be able to get current user");
        assert!(!user.unwrap().is_empty(), "Username should not be empty");
    }
}
