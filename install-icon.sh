#!/bin/bash

# Install FICHA icon system-wide for Linux launchers
# This script installs the app icon to the user's local icon directory

ICON_DIR="$HOME/.local/share/icons/hicolor"
SOURCE_DIR="src-tauri/icons"

echo "Installing FICHA icons..."

# Create icon directories if they don't exist
mkdir -p "$ICON_DIR/32x32/apps"
mkdir -p "$ICON_DIR/128x128/apps"
mkdir -p "$ICON_DIR/256x256/apps"
mkdir -p "$ICON_DIR/512x512/apps"

# Copy icons
cp "$SOURCE_DIR/32x32.png" "$ICON_DIR/32x32/apps/ficha.png"
cp "$SOURCE_DIR/128x128.png" "$ICON_DIR/128x128/apps/ficha.png"
cp "$SOURCE_DIR/256x256.png" "$ICON_DIR/256x256/apps/ficha.png"
cp "$SOURCE_DIR/icon.png" "$ICON_DIR/512x512/apps/ficha.png"

# Update icon cache
if command -v gtk-update-icon-cache &> /dev/null; then
    gtk-update-icon-cache -f -t "$ICON_DIR"
    echo "Icon cache updated"
fi

echo "Icons installed successfully!"
echo "Icon name: ficha"
echo "The icon will be used by the system launcher and autostart desktop file"
