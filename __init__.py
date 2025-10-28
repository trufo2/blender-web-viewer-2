# BlenderWebPreview - Blender Addon for Web Preview and Export
# For Blender 4.0+

bl_info = {
    "name": "blendXWeb2",
    "author": "trufo2",
    "version": (0, 1),
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
from bpy.props import BoolProperty, StringProperty

# Global server variable
preview_server = None

addon_keymaps = []
PREVIEW_OPERATOR_IDNAME = "web_preview.preview_scene"

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
# Preferences
# ------------------------------------

def sanitize_shortcut_key(value: str) -> str:
    if not value:
        return "u"
    char = value[0].lower()
    return char if char.isalpha() else "u"


def sanitize_server_port(value: str) -> str:
    try:
        port = int(value)
    except (TypeError, ValueError):
        return "3000"

    port = max(1, min(65535, port))
    return str(port)


def _mark_preferences_dirty(self, context):
    self.is_dirty = True


def _update_shortcut_key(self, context):
    sanitized = sanitize_shortcut_key(self.shortcut_key)
    if sanitized != self.shortcut_key:
        self.shortcut_key = sanitized
    self.is_dirty = True


def _update_server_port(self, context):
    sanitized = sanitize_server_port(self.server_port)
    if sanitized != self.server_port:
        self.server_port = sanitized
    self.is_dirty = True


class BlendXWebAddonPreferences(bpy.types.AddonPreferences):
    bl_idname = __name__

    use_shift: BoolProperty(name="Shift", default=True, update=_mark_preferences_dirty)
    use_alt: BoolProperty(name="Alt", default=False, update=_mark_preferences_dirty)
    use_ctrl: BoolProperty(name="Ctrl", default=True, update=_mark_preferences_dirty)
    is_dirty: BoolProperty(
        name="Dirty Flag",
        default=False,
        options={'HIDDEN'},
    )
    server_port: StringProperty(
        name="Server Port",
        description="Port used by the local preview server",
        default="3000",
        maxlen=5,
        update=_update_server_port,
    )
    shortcut_key: StringProperty(
        name="Key",
        description="Single letter used for the refresh shortcut",
        default="u",
        maxlen=1,
        update=_update_shortcut_key,
    )

    def draw(self, context):
        layout = self.layout
        row = layout.row(align=True)
        row.alignment = 'LEFT'
        row.scale_x = 0

        row.label(text="refresh browser-files:    ")

        controls_row = row.row(align=True)
        controls_row.alignment = 'LEFT'
        controls_row.scale_x = 0

        controls_row.prop(self, "use_shift", text="shift")
        controls_row.prop(self, "use_alt", text="alt")
        controls_row.prop(self, "use_ctrl", text="ctrl")

        key_row = controls_row.row(align=True)
        key_row.scale_x = 0
        key_row.ui_units_x = 2
        key_row.prop(self, "shortcut_key", text="")

        port_row = layout.row(align=True)
        port_row.alignment = 'LEFT'
        port_row.scale_x = 0
        port_row.label(text="server-port:     ")
        port_value_row = port_row.row(align=True)
        port_value_row.scale_x = 0
        port_value_row.ui_units_x = 4
        port_value_row.prop(self, "server_port", text="")

        save_col = layout.column(align=False)
        save_col.alignment = 'LEFT'
        save_col.enabled = self.is_dirty
        save_col.operator("web_preview.save_preferences", text="save", icon='FILE_TICK')


def get_addon_preferences():
    addon = bpy.context.preferences.addons.get(__name__)
    return addon.preferences if addon else None


def build_preview_shortcut_label() -> str:
    prefs = get_addon_preferences()
    if not prefs:
        return "shift+ctrl+u"

    parts = []
    if prefs.use_shift:
        parts.append("shift")
    if prefs.use_ctrl:
        parts.append("ctrl")
    if prefs.use_alt:
        parts.append("alt")

    parts.append(sanitize_shortcut_key(prefs.shortcut_key))
    return "+".join(parts)


def clear_preview_shortcut_keymap():
    global addon_keymaps
    if not addon_keymaps:
        return

    wm = bpy.context.window_manager if hasattr(bpy.context, "window_manager") else None
    if not wm:
        addon_keymaps.clear()
        return

    keyconfigs = wm.keyconfigs.addon
    if not keyconfigs:
        addon_keymaps.clear()
        return

    for keymap, keymap_item in addon_keymaps:
        if keymap and keymap_item:
            try:
                keymap.keymap_items.remove(keymap_item)
            except (ValueError, ReferenceError):
                pass

    addon_keymaps.clear()


def register_preview_shortcut_keymap():
    wm = bpy.context.window_manager if hasattr(bpy.context, "window_manager") else None
    if not wm:
        return

    keyconfigs = wm.keyconfigs.addon
    if not keyconfigs:
        return

    clear_preview_shortcut_keymap()

    prefs = get_addon_preferences()
    ctrl = prefs.use_ctrl if prefs else True
    shift = prefs.use_shift if prefs else True
    alt = prefs.use_alt if prefs else False
    key_char = sanitize_shortcut_key(prefs.shortcut_key if prefs else "u").upper()

    keymap = keyconfigs.keymaps.new(name="Window", space_type="EMPTY")
    keymap_item = keymap.keymap_items.new(
        PREVIEW_OPERATOR_IDNAME,
        type=key_char,
        value='PRESS',
        ctrl=ctrl,
        shift=shift,
        alt=alt,
    )
    addon_keymaps.append((keymap, keymap_item))

# ------------------------------------
# Server Component
# ------------------------------------

class WebPreviewServer:
    """Simple HTTP server to serve the Blender scene preview"""
    
    def __init__(self):
        self.server_process = None
        self.port = 3000
        self.temp_dir = None
        self.is_running = False
        
    def find_available_port(self):
        """Find an available port for the server"""
        prefs = get_addon_preferences()
        port_str = sanitize_server_port(prefs.server_port if prefs else "3000")
        self.port = int(port_str)
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
            export_format='GLB',
            export_cameras=True,
            export_lights=True
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

class WEB_PREVIEW_OT_save_preferences(bpy.types.Operator):
    bl_idname = "web_preview.save_preferences"
    bl_label = "Save Preferences"

    def execute(self, context):
        prefs = get_addon_preferences()
        if not prefs:
            self.report({'ERROR'}, "Preferences not found")
            return {'CANCELLED'}

        if not prefs.is_dirty:
            self.report({'INFO'}, "No preference changes to save")
            return {'CANCELLED'}

        try:
            bpy.ops.wm.save_userpref()
            prefs.is_dirty = False
            register_preview_shortcut_keymap()
            self.report({'INFO'}, "Preferences saved")
        except Exception as error:
            self.report({'ERROR'}, f"Failed to save preferences: {error}")
            return {'CANCELLED'}

        return {'FINISHED'}


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

        server_was_running = preview_server.is_running

        if not server_was_running:
            preview_server.start_server()
            if not preview_server.is_running:
                self.report({'ERROR'}, "Failed to start web preview server")
                return {'CANCELLED'}
        elif not preview_server.temp_dir:
            self.report({'ERROR'}, "Preview server has no temporary directory")
            return {'CANCELLED'}

        # Generate preview files
        try:
            generate_preview_files(context, preview_server.temp_dir)
        except Exception as e:
            self.report({'ERROR'}, f"Error generating preview: {str(e)}")
            return {'CANCELLED'}

        if not server_was_running:
            webbrowser.open(preview_server.get_url())
        else:
            self.report({'INFO'}, "Preview files updated. Refresh the browser tab to view changes.")

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
        box.label(text="preview")

        is_running = preview_server and preview_server.is_running
        shortcut_display = build_preview_shortcut_label()
        button_label = f"refresh ({shortcut_display})" if is_running else "preview in browser"

        row = box.row()
        row.operator("web_preview.preview_scene", text=button_label, icon='WORLD')

        # Server status
        status_text = "running" if is_running else "offline"
        box.label(text=f"server: {status_text}")

        if is_running:
            box.operator("web_preview.stop_server", text="stop server", icon='X')
            box.label(text=f"port: {preview_server.port}")

        # Export section
        box = layout.box()
        box.label(text="export")
        box.operator("web_preview.export_scene", text="export scene to web", icon='EXPORT')

# ------------------------------------
# Registration
# ------------------------------------

classes = (
    BlendXWebAddonPreferences,
    WEB_PREVIEW_OT_save_preferences,
    WEB_PREVIEW_OT_preview_scene,
    WEB_PREVIEW_OT_export_scene,
    WEB_PREVIEW_OT_stop_server,
    WEB_PREVIEW_PT_panel
)

def register():
    for cls in classes:
        bpy.utils.register_class(cls)

    register_preview_shortcut_keymap()

def unregister():
    # Stop the server if it's running
    global preview_server
    if preview_server and preview_server.is_running:
        preview_server.stop_server()

    clear_preview_shortcut_keymap()
    
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)

if __name__ == "__main__":
    register()