#!/bin/bash

# Go to project directory
cd ~/my-pwa-app

# --- Step 1: Increment version in manifest.json ---
if [ -f manifest.json ]; then
    current_version=$(grep -oP '(?<="version": ")[^"]+' manifest.json)
    echo "Current version: $current_version"

    # Split version into major.minor.patch
    IFS='.' read -r major minor patch <<< "$current_version"

    # Increment patch
    patch=$((patch + 1))
    new_version="$major.$minor.$patch"
    
    # Replace version in manifest.json
    sed -i "s/\"version\": \"$current_version\"/\"version\": \"$new_version\"/" manifest.json
    echo "Updated version to $new_version"
else
    echo "manifest.json not found! Skipping version update."
fi

# --- Step 2: Commit changes ---
git add .
read -p "Enter commit message: " msg
git commit -m "v$new_version - $msg"

# --- Step 3: Update changelog ---
echo "## v$new_version - $(date +'%Y-%m-%d')" >> CHANGELOG.md
echo "- $msg" >> CHANGELOG.md
echo "" >> CHANGELOG.md
git add CHANGELOG.md
git commit -m "Update changelog for v$new_version"

# --- Step 4: Push to GitHub ---
git push origin main

# --- Step 5: Notify live URL ---
echo "✅ Update pushed to GitHub!"
echo "🌐 Your app is live at: https://agabe23a.github.io/Student-word-app/"
echo "📄 Changelog updated."
