#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use nimi_shell_tauri::capabilities::session_logging;

#[cfg(debug_assertions)]
fn install_local_app_runtime_host(app: &tauri::App<tauri::Wry>) {
    use tauri::Manager;
    app.manage(
        nimi_shell_tauri::capabilities::runtime::RuntimeBridgeLocalAppHost::platform_default(),
    );
}

#[cfg(debug_assertions)]
fn run_shijing() {
    tauri::Builder::default()
        .setup(|app| {
            install_local_app_runtime_host(app);
            Ok(())
        })
        .invoke_handler(nimi_shell_tauri::nimi_shell_tauri_local_app_standard_shell_handler![])
        .run(tauri::generate_context!())
        .expect("failed to run ShiJing local-development shell");
}

#[cfg(not(debug_assertions))]
fn run_shijing() {
    // The current shared Kit has no admitted installed-app Tauri carrier.
    // Release therefore exposes no protected commands and the renderer remains
    // fail-closed instead of reconstructing authority inside this app.
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("failed to run ShiJing fail-closed release shell");
}

fn main() {
    session_logging::set_app_session_prefix("shijing");
    session_logging::install_panic_hook();
    session_logging::log_boot_marker("shijing main() entered");

    run_shijing();
}
