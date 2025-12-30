# 🚀 FICHA Quick Start Guide

## Run the App

```bash
#install dependancies
pnpm install 

# Development mode (no PAM required)
pnpm tauri dev

# The app will open with the lock screen
# Enter any password > 3 characters to unlock
```

## Try It Out

### 1. Unlock the App
- Enter a password (min 4 characters in dev mode)
- Click "Unlock Shield"

### 2. Add a Protected App
- Go to Dashboard tab
- In the "Protected Watchlist" section, find the "Add App" form
- Add an app:
  - **Name**: Firefox
  - **binary**: firefox
- Click "Add App"

### 3. Lock the Shield
- Click "Terminate Session" button (bottom left sidebar)
- This enables the monitoring daemon

### 4. Test the Kill Feature
- Try to launch Firefox from your system
- It should be killed immediately
- Go back to the app
- Check the "Full Logs" tab to see the kill events

### 5. Unlock to Allow Apps
- Unlock the app again with your password
- Shield becomes ACTIVE (monitoring disabled)
- Now Firefox (and other protected apps) can run normally

## Database Location

```bash
~/.local/share/com.tauri.dev/ficha.db
```

## View Logs

```bash
# Via SQLite
sqlite3 ~/.local/share/com.tauri.dev/ficha.db "SELECT * FROM security_logs ORDER BY rowid DESC LIMIT 10;"

# Or in the app: Click "Full Logs" tab
```

## Run with PAM Authentication (Production Mode)

### Build with PAM

```bash
# Make sure PAM dev library is installed
sudo apt-get install libpam0g-dev

# Build with PAM feature
cargo build --manifest-path=src-tauri/Cargo.toml --features pam-auth

# Or for release build
cargo build --manifest-path=src-tauri/Cargo.toml --features pam-auth --release
```

### Run with PAM

```bash
# Development mode with PAM
pnpm tauri dev -- --features pam-auth

# Or build and run release
pnpm tauri build -- --features pam-auth
```

### What Changes with PAM

**Without PAM (default):**
- Any password > 3 characters works
- Good for development/testing

**With PAM (`--features pam-auth`):**
- Uses your **actual system password**
- Same password you use for `sudo`
- Real Linux authentication via PAM
- Production-ready security

### Quick Test

```bash
# Run with PAM
pnpm tauri dev -- --features pam-auth

# When the lock screen appears:
# Enter your actual Ubuntu/Linux user password
# (the same one you use for sudo)
```

## Install App Icon (Optional)

To see the FICHA lock icon in your system launcher:

```bash
# Run the icon installation script
./install-icon.sh
```

This installs the lock icon to `~/.local/share/icons/hicolor/` so it appears in:
- System application launcher
- Autostart desktop file
- Window manager menus

## 🎯 Key Concepts

**LOCKED** = Monitoring ON → Protected apps get killed
**ACTIVE** = Monitoring OFF → Protected apps run normally
**THREAT_DETECTED** = Process was just killed (temporary)

## Common Apps to Protect

Add these to test:
- **Brave**: `brave`
- **Chrome**: `chrome`
- **Firefox**: `firefox`
- **Discord**: `discord`
- **Slack**: `slack`
- **Steam**: `steam`

Process names are case-insensitive and match against both the process name and executable path.
