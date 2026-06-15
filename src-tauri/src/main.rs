#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Deserialize;
use serde::Serialize;
use serde_json::Value;

// Shared modules from kit/shell/tauri crate (nimi-shell-tauri)
use nimi_shell_tauri::desktop_paths;
use nimi_shell_tauri::oauth_commands;
use nimi_shell_tauri::runtime_app_storage;
use nimi_shell_tauri::runtime_bridge;
use nimi_shell_tauri::session_logging;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ShiJingStorageDirs {
    nimi_dir: String,
    nimi_data_dir: String,
}

const SHIJING_SPACE_FILE: &str = "shijing-space.json";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ShiJingSpaceStorageRootPayload {
    storage_root: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ShiJingSpaceSavePayload {
    storage_root: String,
    snapshot_json: String,
}

fn shijing_space_path(storage_root: &str) -> Result<std::path::PathBuf, String> {
    runtime_app_storage::scoped_storage_child(storage_root, "shijing data root", SHIJING_SPACE_FILE)
}

#[tauri::command]
fn shijing_space_load(payload: ShiJingSpaceStorageRootPayload) -> Result<Option<String>, String> {
    let path = shijing_space_path(&payload.storage_root)?;
    if !path.exists() {
        return Ok(None);
    }
    std::fs::read_to_string(&path)
        .map(Some)
        .map_err(|error| format!("read shijing space failed ({}): {error}", path.display()))
}

#[tauri::command]
fn shijing_space_save(payload: ShiJingSpaceSavePayload) -> Result<(), String> {
    let parsed: Value = serde_json::from_str(&payload.snapshot_json)
        .map_err(|error| format!("shijing space JSON invalid: {error}"))?;
    if !parsed.is_object() || parsed.is_array() {
        return Err("shijing space payload must be a JSON object".to_string());
    }
    let path = shijing_space_path(&payload.storage_root)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| {
            format!(
                "create shijing storage directory failed ({}): {error}",
                parent.display()
            )
        })?;
    }
    let pretty =
        serde_json::to_string_pretty(&parsed).unwrap_or_else(|_| payload.snapshot_json.to_string());
    let tmp_path = path.with_extension("json.tmp");
    std::fs::write(&tmp_path, pretty).map_err(|error| {
        format!(
            "write shijing space temp failed ({}): {error}",
            tmp_path.display()
        )
    })?;
    std::fs::rename(&tmp_path, &path).map_err(|error| {
        let _ = std::fs::remove_file(&tmp_path);
        format!(
            "commit shijing space failed ({} -> {}): {error}",
            tmp_path.display(),
            path.display()
        )
    })
}

#[tauri::command]
fn shijing_space_clear(payload: ShiJingSpaceStorageRootPayload) -> Result<(), String> {
    let path = shijing_space_path(&payload.storage_root)?;
    if !path.exists() {
        return Ok(());
    }
    std::fs::remove_file(&path)
        .map_err(|error| format!("clear shijing space failed ({}): {error}", path.display()))
}

#[tauri::command]
fn get_storage_dirs() -> Result<ShiJingStorageDirs, String> {
    let nimi_dir = desktop_paths::resolve_nimi_dir()?;
    let nimi_data_dir = desktop_paths::resolve_nimi_data_dir()?;
    Ok(ShiJingStorageDirs {
        nimi_dir: nimi_dir.display().to_string(),
        nimi_data_dir: nimi_data_dir.display().to_string(),
    })
}

#[tauri::command]
fn shijing_start_window_drag(window: tauri::WebviewWindow) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    if window.is_fullscreen().unwrap_or(false) {
        return Ok(());
    }

    match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        window.start_dragging().map_err(|error| error.to_string())
    })) {
        Ok(result) => result,
        Err(_) => Err("window drag unavailable".to_string()),
    }
}

fn load_dotenv_files() {
    let root_env_path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.env");
    if root_env_path.exists() {
        match dotenvy::from_path_iter(&root_env_path) {
            Ok(iter) => {
                for item in iter.flatten() {
                    let (key, value) = item;
                    let should_override = key.starts_with("NIMI_") || key.starts_with("VITE_NIMI_");
                    if should_override || std::env::var_os(&key).is_none() {
                        std::env::set_var(&key, &value);
                    }
                }
                eprintln!("[shijing] dotenv loaded path={}", root_env_path.display());
            }
            Err(error) => {
                eprintln!(
                    "[shijing] dotenv load failed path={} error={error}",
                    root_env_path.display()
                );
            }
        }
    }
}

fn configure_runtime_bridge_env() {
    if cfg!(debug_assertions) && std::env::var_os("NIMI_RUNTIME_BRIDGE_MODE").is_none() {
        std::env::set_var("NIMI_RUNTIME_BRIDGE_MODE", "RUNTIME");
    }
}

fn main() {
    load_dotenv_files();
    configure_runtime_bridge_env();
    session_logging::set_app_session_prefix("shijing");
    session_logging::install_panic_hook();
    session_logging::log_boot_marker("shijing main() entered");

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_storage_dirs,
            shijing_space_load,
            shijing_space_save,
            shijing_space_clear,
            shijing_start_window_drag,
            oauth_commands::open_external_url,
            oauth_commands::oauth_listen_for_code,
            runtime_bridge::runtime_bridge_unary,
            runtime_bridge::runtime_bridge_stream_open,
            runtime_bridge::runtime_bridge_stream_close,
            runtime_bridge::runtime_bridge_status,
            session_logging::log_renderer_event,
        ])
        .run(tauri::generate_context!())
        .expect("error running shijing");
}
