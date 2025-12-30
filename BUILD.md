# 🏗️ FICHA Build Guide

This guide explains how to build FICHA for distribution with the monitoring daemon compiled in.

## Prerequisites

```bash
# Install build dependencies
sudo apt-get update
sudo apt-get install -y \
    libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libxdo-dev \
    libssl-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    libpam0g-dev

# Install Node.js and pnpm (if not already installed)
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

## Build Options

### Option 1: Development Build (No PAM)

Good for testing. Uses simple password authentication (any password > 3 chars).

```bash
# Install dependencies
pnpm install

# Build the app
pnpm tauri build

# Output location:
# src-tauri/target/release/ficha-app (binary)
# src-tauri/target/release/bundle/ (packages)
```

### Option 2: Production Build (With PAM Authentication)

**Recommended for distribution.** Uses real system passwords via PAM.

```bash
# Install dependencies
pnpm install

# Build with PAM feature
pnpm tauri build -- --features pam-auth

# Or manually with cargo:
cargo build --manifest-path=src-tauri/Cargo.toml --release --features pam-auth

# Output location:
# src-tauri/target/release/ficha-app (binary)
# src-tauri/target/release/bundle/ (packages)
```

## Available Distribution Formats

Tauri automatically generates multiple formats:

### 1. **AppImage** (Recommended for Linux)
- **Location:** `src-tauri/target/release/bundle/appimage/ficha-app_0.1.0_amd64.AppImage`
- **Usage:** Portable, runs on any Linux distro
- **Run:** `chmod +x ficha-app*.AppImage && ./ficha-app*.AppImage`

### 2. **Debian Package (.deb)**
- **Location:** `src-tauri/target/release/bundle/deb/ficha-app_0.1.0_amd64.deb`
- **Install:** `sudo dpkg -i ficha-app_0.1.0_amd64.deb`
- **Uninstall:** `sudo apt remove ficha-app`

### 3. **Standalone Binary**
- **Location:** `src-tauri/target/release/ficha-app`
- **Usage:** Direct executable
- **Run:** `./ficha-app`

## Post-Build: Install System Icon

After building, install the app icon system-wide:

```bash
# Make the install script executable
chmod +x install-icon.sh

# Install the icon
./install-icon.sh
```

This ensures the lock icon appears in:
- System launcher
- Application menus
- Autostart entries

## Testing the Built Binary

```bash
# Test the release binary directly
./src-tauri/target/release/ficha-app

# Or test the AppImage
./src-tauri/target/release/bundle/appimage/ficha-app*.AppImage
```

## Distribution Checklist

- [ ] Build with PAM authentication: `pnpm tauri build -- --features pam-auth`
- [ ] Test the binary on a clean Ubuntu system
- [ ] Install system icon: `./install-icon.sh`
- [ ] Verify autostart works when enabled
- [ ] Test stealth mode activates properly
- [ ] Confirm session lock on idle functions
- [ ] Package includes:
  - AppImage (for portable use)
  - .deb package (for Ubuntu/Debian)
  - Standalone binary

## Build Output Structure

```
src-tauri/target/release/
├── ficha-app                    # Standalone binary
└── bundle/
    ├── appimage/
    │   ├── ficha-app_0.1.0_amd64.AppImage
    │   └── ficha-app.AppImage
    └── deb/
        └── ficha-app_0.1.0_amd64.deb
```

## What's Included in the Binary

The FICHA binary is a single self-contained executable that includes:

✅ **Rust Monitoring Daemon**
- Real-time process scanner (`/proc` filesystem)
- SIGKILL termination engine
- Smart process matching algorithm

✅ **SQLite Database Engine**
- Security logs
- Protected app watchlist
- Policy management
- Settings persistence

✅ **PAM Authentication Module** (if built with `--features pam-auth`)
- System password validation
- Secure OS-level auth

✅ **Stealth Mode Engine**
- Process name obfuscation (`prctl`)
- Hides as `systemd-resolve`

✅ **Idle Tracker**
- Configurable timeout (1-10 minutes)
- Automatic shield lock

✅ **React Frontend**
- All UI components bundled
- Material 3 design system

✅ **System Integration**
- Autostart desktop file generation
- Icon installation
- Linux desktop integration

## File Sizes (Approximate)

- Standalone binary: ~15-20 MB
- AppImage: ~20-25 MB
- .deb package: ~15-20 MB

## Troubleshooting

### Build fails with "cannot find -lpam"
```bash
sudo apt-get install libpam0g-dev
```

### Build fails with webkit errors
```bash
sudo apt-get install libwebkit2gtk-4.1-dev
```

### AppImage won't run
```bash
# Make it executable
chmod +x *.AppImage

# Run with --appimage-extract to debug
./ficha-app*.AppImage --appimage-extract-and-run
```

## Creating a Release

```bash
# 1. Update version in src-tauri/tauri.conf.json
# 2. Build with PAM
pnpm tauri build -- --features pam-auth

# 3. Create release archive
cd src-tauri/target/release/bundle
tar -czf ficha-app-v0.1.0-linux-x86_64.tar.gz \
    appimage/*.AppImage \
    deb/*.deb

# 4. Upload to GitHub releases with:
# - AppImage (for portable use)
# - .deb package (for Ubuntu/Debian)
# - SHA256 checksums
```

## Security Notes

⚠️ **Important for Distribution:**

1. **PAM Authentication:** Always build with `--features pam-auth` for production
2. **Permissions:** The daemon requires permission to kill processes (user's own processes)
3. **Database:** Stored in `~/.local/share/com.ficha.app/ficha.db` (user-specific)
4. **Root Not Required:** FICHA runs as regular user, kills only user's own processes

---

**Ready to distribute!** 🚀
