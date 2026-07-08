#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Shared standard shell capabilities from kit/shell/tauri crate (nimi-shell-tauri).
use nimi_shell_tauri::capabilities::{data, oauth, runtime, session_logging, shell_ui, storage};

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

fn resolve_standard_app_storage_root_slot() -> storage::StandardAppStorageRootSlot {
    let root = resolve_required_env_value(
        &[
            "NIMI_APP_DURABLE_DATA_ROOT",
            "NIMI_SHIJING_TAURI_DURABLE_DATA_ROOT",
            "NIMI_SHIJING_TAURI_STANDARD_DATA_ROOT",
        ],
        "ShiJing Tauri requires Runtime-projected NIMI_APP_DURABLE_DATA_ROOT",
    );
    tauri::async_runtime::block_on(storage::StandardAppStorageRootSlot::from_binding_resolved(
        data::StandardDataRootBinding::RuntimeLaunchProjection {
            durable_data_root: std::path::PathBuf::from(root),
            cache_root: None,
            temp_root: None,
            projection_ref: "shijing-tauri-runtime-projection".to_string(),
        },
    ))
    .expect("invalid ShiJing Runtime-projected app storage roots")
}

fn resolve_required_env_value(keys: &[&str], missing_message: &str) -> String {
    keys.iter()
        .find_map(|key| {
            std::env::var(key)
                .ok()
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty())
        })
        .expect(missing_message)
}

fn main() {
    load_dotenv_files();
    configure_runtime_bridge_env();
    session_logging::set_app_session_prefix("shijing");
    session_logging::install_panic_hook();
    session_logging::log_boot_marker("shijing main() entered");

    tauri::Builder::default()
        .manage(resolve_standard_app_storage_root_slot())
        .invoke_handler(tauri::generate_handler![
            data::data_path_resolve,
            storage::storage_read_json,
            storage::storage_write_json,
            storage::storage_remove_json,
            shell_ui::confirm_dialog,
            shell_ui::start_window_drag,
            shell_ui::focus_main_window,
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
