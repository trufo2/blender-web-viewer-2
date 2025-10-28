


## Introduction

A fork of https://github.com/berloop/blender-web-viewer with support for  > three.js 180.

![BlendXWeb Preview](./image.png)



## Installation and Usage Guide

This addon allows you to preview your Blender scenes in a web browser and export them as standalone web packages.

## Prerequisites

- Blender 4.0 or newer
- Web browser with WebGL support (Chrome, Firefox, Edge, Safari)
- Python 3.7+ (typically included with Blender)

## Installation

### Method 1: Via Blender's Addon Installer

1. Download the addon as a ZIP file (do not extract it)
2. Open Blender and go to Edit > Preferences
3. Select the "Add-ons" tab
4. Click "Install..." button at the top right
5. Navigate to and select the downloaded ZIP file
6. Click "Install Add-on"
7. Enable the addon by checking the box next to "3D View: blendXweb2"

### Method 2: Manual Installation

1. Download and extract the addon files
2. Locate your Blender addons directory:
   - Windows: `%APPDATA%\Blender Foundation\Blender\4.0\scripts\addons`
   - macOS: `~/Library/Application Support/Blender/4.0/scripts/addons`
   - Linux: `~/.config/blender/4.0/scripts/addons`
3. Copy the entire `blender_web_preview` folder to the addons directory
4. Start Blender and go to Edit > Preferences > Add-ons
5. Search for "BlendXWeb" and enable the addon

## File Structure Setup

After installation, you need to run the file structure setup script once to create the necessary directories:

1. Open a terminal/command prompt
2. Navigate to the addon directory
3. Run `python setup_files.py`

## Building the Web Viewer Assets

During development you can rebuild the web viewer directly into the installed addon directory (Windows Blender 5.0 default location):

```bash
cd web_vite
npm install
npm run build
```

The build process performs these steps automatically:

- Cleans `C:\Users\Administrator\AppData\Roaming\Blender Foundation\Blender\5.0\extensions\user_default\blendxweb2\web`
- Emits the latest Vite bundle into that directory so Blender serves the new assets immediately

For portability or local preview without touching the addon, use the fallback script:

```bash
npm run build:dist
```

This sets an environment override so Vite outputs to the local `dist/` folder instead.

## Using the Addon

### Accessing the Addon

Once installed, you can access the addon from the 3D View sidebar:

1. Open the sidebar by pressing `N` in the 3D View
2. Select the "Web Preview/blendXweb2" tab

### Previewing in Browser

1. Set up your scene in Blender
2. Click the "Preview in Browser" button in the addon panel
3. A local server will start and your default web browser will open showing your scene
4. Use the controls in the browser to navigate and interact with the scene

### Exporting for Web

1. Set up your scene in Blender
2. Click the "Export Scene to Web" button in the addon panel
3. Choose a destination folder and filename
4. Click "Export"
5. A ZIP file will be created containing all necessary files for web viewing

## Web Viewer Controls

The web viewer provides several controls to interact with your scene:

### Camera Controls
- Left Mouse: Rotate the view
- Middle Mouse / Scroll: Zoom in/out
- Right Mouse: Pan the view
- Top/Front/Side buttons: Jump to standard views
- Reset Camera: Return to the initial view

### Display Options
- Wireframe: Toggle wireframe mode
- Grid: Toggle the reference grid
- Lights: Toggle scene lights (excluding ambient light)

### Animation Controls
- Play: Start the animation
- Pause: Pause the animation
- Stop: Stop and reset the animation
- Slider: Scrub through the animation timeline

## Troubleshooting

### Server Issues
- If the preview doesn't open, check if port 3000 is available or in use
- Try stopping and restarting the server from the addon panel

### Export Issues
- Make sure your Blender scene has been saved
- Check if you have write permissions for the export directory
- Ensure all textures are properly packed or referenced

### Web Viewer Issues
- Make sure your browser supports WebGL
- Check the browser console for any error messages
- Try using a different browser if issues persist

## License

Copyright (C) 2025 Egret Software egretfx@gmail.com

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
