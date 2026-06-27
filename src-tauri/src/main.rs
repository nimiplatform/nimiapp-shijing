#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Deserialize;
use serde::Serialize;
use serde_json::Value;
use tauri::Manager;

// Shared standard shell capabilities from kit/shell/tauri crate (nimi-shell-tauri).
use nimi_shell_tauri::capabilities::{data, oauth, runtime, session_logging, storage};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ShiJingStorageDirs {
    nimi_dir: String,
    nimi_data_dir: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConfirmDialogPayload {
    #[allow(dead_code)]
    title: Option<String>,
    #[allow(dead_code)]
    description: Option<String>,
    #[allow(dead_code)]
    level: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ConfirmDialogResult {
    confirmed: bool,
}

const SHIJING_SPACE_ACCOUNT_FILE_PREFIX: &str = "shijing-space.account.";
const SHIJING_SPACE_ACCOUNT_FILE_SUFFIX: &str = ".json";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ShiJingSpaceStorageRootPayload {
    storage_root: String,
    user_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ShiJingSpaceSavePayload {
    storage_root: String,
    user_id: String,
    snapshot_json: String,
}

fn shijing_space_path_for(
    storage_root: &str,
    file_name: &str,
) -> Result<std::path::PathBuf, String> {
    storage::scoped_storage_child(storage_root, "shijing data root", file_name)
}

fn shijing_space_file_name(user_id: &str) -> Result<String, String> {
    let trimmed = user_id.trim();
    if trimmed.is_empty() {
        return Err("shijing space userId is required".to_string());
    }
    let mut encoded = String::with_capacity(trimmed.len() * 2);
    for byte in trimmed.as_bytes() {
        encoded.push_str(&format!("{:02x}", byte));
    }
    Ok(format!(
        "{SHIJING_SPACE_ACCOUNT_FILE_PREFIX}{encoded}{SHIJING_SPACE_ACCOUNT_FILE_SUFFIX}"
    ))
}

fn shijing_space_path(storage_root: &str, user_id: &str) -> Result<std::path::PathBuf, String> {
    let file_name = shijing_space_file_name(user_id)?;
    shijing_space_path_for(storage_root, &file_name)
}

fn ensure_snapshot_user_matches(parsed: &Value, user_id: &str) -> Result<(), String> {
    let expected = user_id.trim();
    let actual = parsed
        .get("user_id")
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or("");
    if actual == expected {
        return Ok(());
    }
    Err("shijing space user_id does not match command userId".to_string())
}

#[tauri::command]
fn shijing_space_load(payload: ShiJingSpaceStorageRootPayload) -> Result<Option<String>, String> {
    let path = shijing_space_path(&payload.storage_root, &payload.user_id)?;
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
    ensure_snapshot_user_matches(&parsed, &payload.user_id)?;
    let path = shijing_space_path(&payload.storage_root, &payload.user_id)?;
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
    let path = shijing_space_path(&payload.storage_root, &payload.user_id)?;
    if !path.exists() {
        return Ok(());
    }
    std::fs::remove_file(&path)
        .map_err(|error| format!("clear shijing space failed ({}): {error}", path.display()))
}

#[tauri::command]
fn get_storage_dirs() -> Result<ShiJingStorageDirs, String> {
    let nimi_dir = data::resolve_nimi_dir()?;
    let nimi_data_dir = data::resolve_nimi_data_dir()?;
    Ok(ShiJingStorageDirs {
        nimi_dir: nimi_dir.display().to_string(),
        nimi_data_dir: nimi_data_dir.display().to_string(),
    })
}

fn start_dragging_window(window: tauri::WebviewWindow) -> Result<(), String> {
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

#[tauri::command]
fn start_window_drag(window: tauri::WebviewWindow) -> Result<(), String> {
    start_dragging_window(window)
}

#[tauri::command]
fn focus_main_window(app: tauri::AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .or_else(|| app.webview_windows().into_values().next())
        .ok_or_else(|| "main window unavailable".to_string())?;
    let _ = window.unminimize();
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())
}

#[tauri::command]
fn confirm_dialog(payload: ConfirmDialogPayload) -> Result<ConfirmDialogResult, String> {
    let _ = payload;
    Err(nimi_shell_tauri::capabilities::standard_shell_error(
        "capability-unavailable",
        "shijing-native-confirm-dialog-unavailable",
        "Use ShiJing in-app confirmation UI for product confirmations.",
        "tauri",
        None,
    ))
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
            confirm_dialog,
            start_window_drag,
            focus_main_window,
            oauth::open_external_url,
            oauth::oauth_listen_for_code,
            runtime::runtime_bridge_unary,
            runtime::runtime_bridge_stream_open,
            runtime::runtime_bridge_stream_close,
            runtime::runtime_bridge_status,
            session_logging::log_renderer_event,
        ])
        .run(tauri::generate_context!())
        .expect("error running shijing");
}
