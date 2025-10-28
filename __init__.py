# BlenderWebPreview - Blender Addon for Web Preview and Export
# For Blender 4.0+

bl_info = {
    "name": "blendXWeb2",
    "author": "trufo2",
    "version": (1, 0),
    "blender": (4, 0, 0),
    "location": "View3D > Sidebar > blendXweb2",
    "description": "Preview and export Blender scenes to web browsers",
    "warning": "",
    "doc_url": "",
    "category": "3D View",
}

import bpy
import os
import sys
import json
import threading
import webbrowser
import shutil
import socket
import tempfile
from pathlib import Path
import subprocess

# Global server variable
preview_server = None

ADDON_ROOT = Path(__file__).resolve().parent
WEB_VITE_DIR = ADDON_ROOT / "web_vite"
VITE_DIST_DIR = WEB_VITE_DIR / "dist"
WEB_BUILD_DIR = ADDON_ROOT / "web"
PUBLIC_DIR = WEB_VITE_DIR / "public"


def resolve_web_build_dir() -> Path:
    """
    Determine which directory holds the frontend build artifacts.

    Preference order:
      1. ADDON_ROOT/web  (new direct-deploy target)
      2. ADDON_ROOT/web_vite/dist (legacy fallback)
    """
    candidate_dirs = [WEB_BUILD_DIR, VITE_DIST_DIR]
    for candidate in candidate_dirs:
        if candidate.exists() and any(candidate.iterdir()):
            return candidate
    raise FileNotFoundError(
        "Vite build output not found in expected locations:\n"
        f" - {WEB_BUILD_DIR}\n"
        f" - {VITE_DIST_DIR}\n"
        "Run 'npm run build' inside the web_vite directory to regenerate assets."
    )


def copy_vite_dist_contents(destination: Path):
    """Copy Vite build output into destination directory."""
    destination = Path(destination)
    source_dir = resolve_web_build_dir()

    for item in source_dir.iterdir():
        target = destination / item.name
        if item.is_dir():
            shutil.copytree(item, target, dirs_exist_ok=True)
        else:
            shutil.copy2(item, target)

# ------------------------------------
# Server Component
# ------------------------------------

class WebPreviewServer:
    """Simple HTTP server to serve the Blender scene preview"""
    
    def __init__(self):
        self.server_process = None
        self.port = 3000  # Fixed port to 3000
        self.temp_dir = None
        self.is_running = False
        
    def find_available_port(self):
        """Find an available port for the server"""
        # Using fixed port 3000
        self.port = 3000
        return self.port
        
    def start_server(self):
        """Start the HTTP server"""
        if self.is_running:
            return
            
        # Create a temporary directory for serving files
        self.temp_dir = tempfile.mkdtemp()
        
        # Find an available port
        self.find_available_port()
        
        # Set up the server using Python's built-in HTTP server
        server_script = os.path.join(os.path.dirname(__file__), "server", "server.py")
        
        # Start the server process
        try:
            self.server_process = subprocess.Popen(
                [sys.executable, server_script, str(self.port), self.temp_dir],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            self.is_running = True
            print(f"Server started on port {self.port}")
        except Exception as e:
            print(f"Failed to start server: {e}")
            self.is_running = False
            
    def stop_server(self):
        """Stop the HTTP server"""
        if not self.is_running:
            return
            
        # Terminate the server process
        if self.server_process:
            self.server_process.terminate()
            self.server_process = None
            
        # Clean up the temporary directory - with error handling
        if self.temp_dir and os.path.exists(self.temp_dir):
            try:
                shutil.rmtree(self.temp_dir)
            except Exception as e:
                print(f"Warning: Could not remove temp directory: {e}")
                # We'll just let it be and Windows will clean it up later
            self.temp_dir = None
            
        self.is_running = False
        print("Server stopped")
        
    def get_url(self):
        """Get the URL for the web preview"""
        if not self.is_running:
            return None
        return f"http://localhost:{self.port}"

# ------------------------------------
# Export Functions
# ------------------------------------

def export_scene_to_gltf(context, filepath, export_settings):
    """Export the current scene to glTF format"""
    
    # Configure export settings for glTF - using GLB format instead
    try:
        bpy.ops.export_scene.gltf(
            filepath=filepath,
            export_format='GLB',  # Changed from GLTF_EMBEDDED to GLB
            export_selected=export_settings.get('export_selected', False),
            export_animations=export_settings.get('export_animations', True),
            export_cameras=export_settings.get('export_cameras', True),
            export_lights=export_settings.get('export_lights', True)
        )
    except TypeError as e:
        # If the above parameters don't work, try with minimal parameters
        print(f"Trying minimal export parameters due to error: {e}")
        bpy.ops.export_scene.gltf(
            filepath=filepath,
            export_format='GLB'  # Only use the format parameter
        )
    except Exception as e:
        print(f"Error during export: {e}")
        raise
    
    return filepath

def generate_preview_files(context, temp_dir):
    """Generate all necessary files for web preview"""
    temp_path = Path(temp_dir)

    # Copy Vite build output (hashed assets, etc.) into the preview directory.
    copy_vite_dist_contents(temp_path)

    # Export the scene to glTF (GLB)
    gltf_path = temp_path / "scene.glb"
    export_settings = {
        'export_selected': False,
        'export_animations': True,
        'export_cameras': True,
        'export_lights': True,
    }
    export_scene_to_gltf(context, str(gltf_path), export_settings)

    # Create a scene info JSON file with metadata
    scene_info = {
        "title": bpy.path.basename(bpy.data.filepath) or "Untitled Scene",
        "objects": len(bpy.data.objects),
        "has_animations": any(obj.animation_data for obj in bpy.data.objects),
    }

    with (temp_path / "scene_info.json").open('w', encoding='utf-8') as f:
        json.dump(scene_info, f)

    return str(temp_path)

def package_for_export(context, export_path):
    """Package all files into a standalone web export"""
    # Create a temporary directory for staging files
    try:
        temp_dir = tempfile.mkdtemp()
        
        # Generate all the preview files
        generate_preview_files(context, temp_dir)
        
        # Create a zip file with all contents
        shutil.make_archive(export_path, 'zip', temp_dir)
        
        # Clean up with error handling
        try:
            shutil.rmtree(temp_dir)
        except:
            print("Warning: Could not remove temporary directory after export")
            
        return export_path + ".zip"
    except Exception as e:
        print(f"Error during export: {e}")
        return None

# ------------------------------------
# Operators
# ------------------------------------

class WEB_PREVIEW_OT_preview_scene(bpy.types.Operator):
    """Preview the current scene in a web browser"""
    bl_idname = "web_preview.preview_scene"
    bl_label = "Preview in Browser"
    
    def execute(self, context):
        # Get the server instance
        global preview_server
        
        # Initialize server if needed
        if preview_server is None:
            preview_server = WebPreviewServer()
        
        # Start the server if it's not already running
        if not preview_server.is_running:
            preview_server.start_server()
            
        # Generate preview files
        try:
            generate_preview_files(context, preview_server.temp_dir)
        except Exception as e:
            self.report({'ERROR'}, f"Error generating preview: {str(e)}")
            return {'CANCELLED'}
        
        # Open the web browser
        webbrowser.open(preview_server.get_url())
        
        return {'FINISHED'}

class WEB_PREVIEW_OT_export_scene(bpy.types.Operator):
    """Export the current scene as a standalone web package"""
    bl_idname = "web_preview.export_scene"
    bl_label = "Export Scene to Web"
    
    filepath: bpy.props.StringProperty(
        name="Export Path",
        description="Path to export the web package",
        default="",
        subtype='FILE_PATH'
    )
    
    def invoke(self, context, event):
        # Set default filename based on blend file
        blend_filepath = bpy.data.filepath
        if blend_filepath:
            filename = os.path.splitext(os.path.basename(blend_filepath))[0] + "_web"
            self.filepath = os.path.join(os.path.dirname(blend_filepath), filename)
        else:
            self.filepath = "untitled_web"
            
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}
    
    def execute(self, context):
        # Package and export the scene
        try:
            export_path = package_for_export(context, self.filepath)
            if export_path:
                self.report({'INFO'}, f"Scene exported to {export_path}")
                return {'FINISHED'}
            else:
                self.report({'ERROR'}, "Export failed")
                return {'CANCELLED'}
        except Exception as e:
            self.report({'ERROR'}, f"Export error: {str(e)}")
            return {'CANCELLED'}

class WEB_PREVIEW_OT_stop_server(bpy.types.Operator):
    """Stop the web preview server"""
    bl_idname = "web_preview.stop_server"
    bl_label = "Stop Server"
    
    def execute(self, context):
        global preview_server
        
        if preview_server and preview_server.is_running:
            preview_server.stop_server()
            self.report({'INFO'}, "Web preview server stopped")
        else:
            self.report({'INFO'}, "Server is not running")
            
        return {'FINISHED'}

# ------------------------------------
# UI
# ------------------------------------

class WEB_PREVIEW_PT_panel(bpy.types.Panel):
    """Panel for web preview controls"""
    bl_label = "blendXweb2"
    bl_idname = "WEB_PREVIEW_PT_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'blendXweb2'
    
    def draw(self, context):
        layout = self.layout
        
        # Get server status
        global preview_server
        
        # Preview section
        box = layout.box()
        box.label(text="Preview")
        
        row = box.row()
        row.operator("web_preview.preview_scene", icon='WORLD')
        
        # Server status
        is_running = preview_server and preview_server.is_running
        box.label(text=f"Server: {'Running' if is_running else 'Offline'}")
        
        if is_running:
            box.operator("web_preview.stop_server", icon='X')
            box.label(text=f"Port: {preview_server.port}")
        
        # Export section
        box = layout.box()
        box.label(text="Export")
        box.operator("web_preview.export_scene", icon='EXPORT')

# ------------------------------------
# Addon Preferences
# ------------------------------------

class WebPreviewPreferences(bpy.types.AddonPreferences):
    bl_idname = __name__
    
    def draw(self, context):
        layout = self.layout
        layout.label(text="Blender Web Preview/blendXweb2 Settings")
        # TODO: Add global addon settings here

# ------------------------------------
# Registration
# ------------------------------------

classes = (
    WebPreviewPreferences,
    WEB_PREVIEW_OT_preview_scene,
    WEB_PREVIEW_OT_export_scene,
    WEB_PREVIEW_OT_stop_server,
    WEB_PREVIEW_PT_panel
)

def register():
    for cls in classes:
        bpy.utils.register_class(cls)

def unregister():
    # Stop the server if it's running
    global preview_server
    if preview_server and preview_server.is_running:
        preview_server.stop_server()
    
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)

if __name__ == "__main__":
    register()