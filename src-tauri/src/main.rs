#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Shared standard shell capabilities from kit/shell/tauri crate (nimi-shell-tauri).
use nimi_shell_tauri::capabilities::{
    data::{
        self, resolve_standard_app_storage_roots, StandardAppStorageRootSlot,
        StandardDataRootBinding,
    },
    oauth, runtime, session_logging, shell_ui, storage,
};

const SHIJING_APP_ID: &str = "nimi.shijing";

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

fn standard_app_storage_binding() -> StandardDataRootBinding {
    match optional_env_path(&[
        "NIMI_APP_DURABLE_DATA_ROOT",
        "NIMI_SHIJING_TAURI_DURABLE_DATA_ROOT",
        "NIMI_SHIJING_TAURI_STANDARD_DATA_ROOT",
    ]) {
        Some(durable_data_root) => StandardDataRootBinding::RuntimeLaunchProjection {
            cache_root: optional_env_path(&[
                "NIMI_APP_CACHE_ROOT",
                "NIMI_SHIJING_TAURI_CACHE_ROOT",
            ])
            .or_else(|| Some(durable_data_root.clone())),
            temp_root: optional_env_path(&["NIMI_APP_TEMP_ROOT", "NIMI_SHIJING_TAURI_TEMP_ROOT"])
                .or_else(|| Some(durable_data_root.clone())),
            durable_data_root,
            projection_ref: "shijing-tauri-runtime-launch-projection".to_string(),
        },
        None => StandardDataRootBinding::RuntimeGetAppStorage {
            app_id: SHIJING_APP_ID.to_string(),
        },
    }
}

fn optional_env_path(keys: &[&str]) -> Option<std::path::PathBuf> {
    keys.iter()
        .find_map(|key| {
            std::env::var(key)
                .ok()
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty())
        })
        .map(std::path::PathBuf::from)
}

fn install_standard_app_storage_slot(app: &tauri::App) {
    use tauri::Manager;

    let slot = StandardAppStorageRootSlot::empty();
    match tauri::async_runtime::block_on(resolve_standard_app_storage_roots(
        standard_app_storage_binding(),
    )) {
        Ok(roots) => {
            if let Err(error) = slot.bind(roots) {
                eprintln!("[shijing] standard app storage slot bind failed: {error}");
            }
        }
        Err(error) => {
            eprintln!("[shijing] standard app storage slot left unbound (fail-closed): {error}");
        }
    }
    app.manage(slot);
}

fn main() {
    load_dotenv_files();
    configure_runtime_bridge_env();
    session_logging::set_app_session_prefix("shijing");
    session_logging::install_panic_hook();
    session_logging::log_boot_marker("shijing main() entered");

    tauri::Builder::default()
        .setup(|app| {
            install_standard_app_storage_slot(app);
            Ok(())
        })
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
