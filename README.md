
# 🛡️ FICHA - Application Security Vault

> 🔐 A real-time application control system for Ubuntu Linux that monitors and terminates unauthorized processes with PAM authentication.

**GitHub Description:**
```
🛡️ FICHA - Application Security Vault for Ubuntu. Real-time process monitoring daemon with PAM auth, stealth mode, and auto-lock. Kill unauthorized apps on sight. Built with Rust + Tauri.
```

Ficha is a high-performance application monitoring daemon designed for Ubuntu users who require absolute control over their environment. It acts as a proactive shield that prevents unauthorized software execution by monitoring the system process tree in real-time and terminating blacklisted applications instantly.

![Ficha UI Preview](https://img.shields.io/badge/UI-Material_3-emerald?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Ubuntu_Linux-orange?style=for-the-badge&logo=ubuntu)

## 🚀 The Core Logic: "Kill on Sight"

Ficha operates on a "Zero-Trust" principle for protected applications. 

### The "Brave Browser" Example
1. **The Watchlist:** You add `brave` (Brave Browser) to your protected watchlist.
2. **The Lock:** When Ficha is locked, any attempt to launch Brave results in an immediate `SIGKILL` sent to the process. The user sees the app close instantly.
3. **The Unlock:** You open the Ficha dashboard and authenticate using your OS admin/system password.
4. **The Access:** Only once Ficha is "Active" are the kernel hooks temporarily lifted for your session, allowing Brave to launch normally.
5. **Session Terminate:** Closing Ficha or clicking "Terminate Session" immediately re-engages the shield, killing any running instances of Brave to ensure privacy.

## ✨ Key Features

- **Real-time Process Monitoring:** Continuous `/proc` filesystem scanning to detect and terminate protected applications instantly via SIGKILL
- **PAM Authentication:** Secure OS-level authentication using your system password (optional, with development fallback)
- **Stealth Mode:** Process name obfuscation to hide from system monitors (disguises as `systemd-resolve`)
- **Session Lock on Idle:** Automatic shield lock after configurable inactivity timeout (1-10 minutes)
- **Auto-start on Boot:** System-level autostart with desktop integration
- **Advanced Policy Engine:**
  - Immediate termination of blacklisted processes
  - Smart process matching (handles app variants like brave/brave-browser-stable)
  - Configurable security policies
- **Full Audit Trail:** SQLite-based security logs with real-time event streaming
- **Modern UI:** Material 3-inspired design with emerald/slate theme

## 🎨 Design Philosophy

Ficha uses a **Flutter-inspired Material 3 aesthetic** optimized for Desktop use:
- **Navigation Rail:** A sleek, compact sidebar for high-density information access.
- **Emerald/Slate Palette:** High-contrast security-focused UI for clarity in dark environments.
- **Glassmorphism:** Subtle background blurs and depth using Tailwind CSS backdrop filters.

## 🛠️ Technical Stack

- Tauri + React + Typescript
- **Frontend:** React 19 + TypeScript
- **Styling:** Tailwind CSS (Custom M3 Configuration)
- **Icons:** Lucide-React
- **AI Engine:** @google/genai (Gemini 2.5/3 Flash)
- **State Management:** React Hooks + Session Storage persistence

## 🔧 Installation (Linux/Ubuntu)


## 📜 Security Disclaimer
*Ficha is currently a security visualization and management interface. Real-world process termination requires a companion daemon written in C++ or Rust to interface directly with the Linux kernel via eBPF or auditd hooks.*

---
**Developed for the Linux Power User.** 🐧🛡️
