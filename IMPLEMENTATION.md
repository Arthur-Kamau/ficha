# FICHA Security Vault - Implementation Guide

## 🎉 Implementation Complete!

All backend daemon logic with SQLite database has been successfully implemented and integrated with the UI.

## ✅ What Was Built

### Backend (Rust/Tauri)

#### 1. **Database Layer** (`src-tauri/src/database.rs`)
- SQLite database with schema for:
  - `protected_apps` - Applications to monitor and kill
  - `security_logs` - Security event audit trail
  - `security_policies` - Configurable security rules
  - `settings` - Application configuration
- Full CRUD operations for all entities
- Automatic seeding with initial data (browsers, Discord, Steam, etc.)
- Thread-safe database access using Arc<Mutex<Connection>>

#### 2. **Process Monitor Daemon** (`src-tauri/src/monitor.rs`)
- Real-time process scanning using `/proc` filesystem
- Continuous monitoring loop (1000ms intervals)
- Process identification by name and executable path
- SIGKILL termination of protected processes
- Background tokio task for non-blocking monitoring

#### 3. **Authentication** (`src-tauri/src/auth.rs`)
- PAM (Pluggable Authentication Modules) integration
- System password validation
- Optional PAM feature flag for development
- Fallback authentication for testing (when PAM unavailable)

#### 4. **State Management** (`src-tauri/src/state.rs`)
- Shield status: LOCKED/ACTIVE/THREAT_DETECTED
- Centralized application state
- Coordination between database, monitor, and UI

#### 5. **Tauri Commands** (`src-tauri/src/lib.rs`)
- `authenticate` - System password validation
- `get_current_username` - Current user info
- `activate_shield` - Disable monitoring (user authenticated)
- `lock_shield` - Enable monitoring
- `get_protected_apps` - Fetch protected app list
- `add_protected_app` - Add app to watchlist
- `remove_protected_app` - Remove app from watchlist
- `get_security_logs` - Fetch security event logs
- `get_security_policies` - Fetch security policies
- `toggle_security_policy` - Enable/disable policies

#### 6. **Real-time Events**
- `security-log` - New log entry created
- `shield-status` - Shield status changed
- `app-added` - App added to watchlist
- `app-removed` - App removed from watchlist
- `process-killed` - Process terminated

### Frontend (React/TypeScript)

#### 1. **Authentication Flow** (`src/App.tsx`)
- Real PAM authentication via Tauri
- Session persistence
- Loading states and error handling
- Automatic shield activation on unlock
- Shield locking on session termination

#### 2. **Dashboard Integration** (`src/components/Dashboard.tsx`)
- Live data fetching from database
- Real-time event listeners
- Protected apps management
- Security logs display
- Policy management
- Error notifications
- Loading states

## 🔧 Installation & Setup

### Prerequisites

```bash
# Install Node.js dependencies
npm install

# For PAM authentication support (recommended for production)
sudo apt-get install libpam0g-dev
```

### Build Options

#### Development Build (without PAM)
```bash
# Build backend
cargo build --manifest-path=src-tauri/Cargo.toml

# Run development server
npm run tauri dev
```

#### Production Build (with PAM)
```bash
# Build with PAM authentication
cargo build --manifest-path=src-tauri/Cargo.toml --features pam-auth --release

# Or use Tauri build command
npm run tauri build -- --features pam-auth
```

## 🚀 How It Works

### The "Kill on Sight" Flow

1. **User adds `brave` to protected watchlist**
   - App calls `add_protected_app` command
   - Database stores app info
   - Monitor updates protected process list
   - Event emitted to UI

2. **User locks the dashboard** (Terminate Session)
   - App calls `lock_shield` command
   - Shield status → LOCKED
   - Monitoring enabled
   - Protected process list loaded

3. **User tries to launch Brave**
   - Monitor scans `/proc` every 1 second
   - Detects `brave` process
   - Sends SIGKILL to process PID
   - Brave immediately terminates
   - Two logs created:
     - "Unauthorized launch attempt: Brave Browser"
     - "Process [brave] killed by Ficha Kernel"
   - Shield status → THREAT_DETECTED (3 seconds)
   - Events pushed to UI in real-time
   - Shield status → LOCKED

4. **User unlocks dashboard**
   - Enters system password
   - PAM validates credentials
   - Shield status → ACTIVE
   - Monitoring disabled
   - Brave can now launch normally

## 📁 Project Structure

```
ficha-app/
├── src-tauri/
│   ├── src/
│   │   ├── auth.rs          # PAM authentication
│   │   ├── database.rs      # SQLite operations
│   │   ├── monitor.rs       # Process monitoring
│   │   ├── state.rs         # State management
│   │   ├── lib.rs           # Tauri commands & setup
│   │   └── main.rs          # Entry point
│   ├── Cargo.toml           # Rust dependencies
│   └── tauri.conf.json      # Tauri configuration
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx    # Main dashboard UI
│   │   └── LockScreen.tsx   # Authentication screen
│   ├── App.tsx              # App root & auth flow
│   └── types.ts             # TypeScript types
└── package.json             # Node dependencies
```

## 🔐 Security Features

### Implemented
- ✅ SQLite database with persistent storage
- ✅ System password authentication (PAM)
- ✅ Real-time process monitoring via `/proc`
- ✅ SIGKILL process termination
- ✅ Comprehensive audit logging
- ✅ Shield status management
- ✅ Configurable security policies
- ✅ Session-based access control

### Future Enhancements
- 🔲 eBPF kernel hooks for deeper monitoring
- 🔲 Systemd service integration
- 🔲 Auto-start on boot
- 🔲 Desktop notifications
- 🔲 Google Gemini AI log analysis
- 🔲 Stealth mode (hide from process monitors)
- 🔲 Root privilege escalation detection

## 🧪 Testing

### Manual Testing

1. **Build and run the app**
```bash
npm run tauri dev
```

2. **Test authentication**
- Enter password > 3 characters (dev mode)
- OR enter actual system password (with PAM)

3. **Add a test app**
- In Dashboard, add app name: "Test", process: "firefox"
- Click "Add App"

4. **Test monitoring**
- Click "Terminate Session" to lock shield
- Try launching Firefox
- Check if it gets killed immediately
- View logs in "Full Logs" tab

5. **Verify database persistence**
- Close app
- Reopen
- Check if added apps persist

### Database Location
```bash
# Linux
~/.local/share/com.tauri.dev/ficha.db

# Check logs
sqlite3 ~/.local/share/com.tauri.dev/ficha.db "SELECT * FROM security_logs;"
```

## ⚠️ Important Notes

### PAM Authentication
- **Development**: Uses simple password check (length > 3)
- **Production**: Requires `libpam0g-dev` and `--features pam-auth`
- To enable PAM:
  ```bash
  sudo apt-get install libpam0g-dev
  cargo build --features pam-auth
  ```

### Permissions
- Process killing requires appropriate permissions
- May need to run as root for some processes
- Consider using capabilities instead of root

### Process Matching
- Matches by process name from `/proc/[pid]/comm`
- Also checks executable path from `/proc/[pid]/exe`
- Case-insensitive matching

## 🐛 Troubleshooting

### Build Errors
```bash
# PAM library not found
sudo apt-get install libpam0g-dev

# Or build without PAM
cargo build --manifest-path=src-tauri/Cargo.toml
```

### Runtime Errors
```bash
# Check logs
journalctl -f | grep ficha

# Verify database
ls -lh ~/.local/share/com.tauri.dev/ficha.db
```

### Process Not Being Killed
- Ensure shield is LOCKED (not ACTIVE)
- Check process name matches exactly
- Try matching by partial executable path
- Verify monitoring loop is running (check logs)

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────┐
│           React Frontend                │
│  ┌────────────┐      ┌──────────────┐  │
│  │ LockScreen │──────│  Dashboard   │  │
│  └────────────┘      └──────────────┘  │
│         │                    │          │
└─────────┼────────────────────┼──────────┘
          │ Tauri Bridge       │
          ▼                    ▼
┌─────────────────────────────────────────┐
│         Rust Backend (Tauri)            │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │   Auth   │  │  State   │  │Commands││
│  │   (PAM)  │  │  Mgmt    │  │Handler ││
│  └──────────┘  └──────────┘  └────────┘│
│         │             │            │    │
│  ┌──────▼─────┐ ┌────▼────┐ ┌────▼───┐│
│  │  Database  │ │ Monitor │ │ Events ││
│  │  (SQLite)  │ │ Daemon  │ │Emitter ││
│  └────────────┘ └────┬────┘ └────────┘│
└──────────────────────┼──────────────────┘
                       │
                  ┌────▼────┐
                  │  /proc  │
                  │Filesystem│
                  └─────────┘
```

## 🎯 Success Criteria

All 20 implementation tasks completed:

1. ✅ SQLite database setup
2. ✅ Database schema creation
3. ✅ Protected apps CRUD
4. ✅ Logs & policies CRUD
5. ✅ Tauri commands for apps
6. ✅ Tauri commands for policies/logs
7. ✅ Process monitoring daemon
8. ✅ Process killing with SIGKILL
9. ✅ PAM authentication
10. ✅ Background monitoring thread
11. ✅ Event emitter for real-time updates
12. ✅ Shield status management
13. ✅ Frontend authentication integration
14. ✅ Dashboard app fetching
15. ✅ Dashboard log fetching
16. ✅ Dashboard policy management
17. ✅ Real-time event listeners
18. ✅ Error handling
19. ✅ End-to-end testing
20. ✅ Session termination logic

## 🙏 Credits

Built with:
- **Tauri** - Desktop app framework
- **React 19** - Frontend UI
- **Rust** - High-performance backend
- **SQLite** - Embedded database
- **Tokio** - Async runtime
- **PAM** - System authentication
- **Nix** - Unix system calls

---

**Ready to protect your Ubuntu system!** 🛡️
