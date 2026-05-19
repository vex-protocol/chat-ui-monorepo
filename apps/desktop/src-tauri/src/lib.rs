use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

const TRAY_ID: &str = "main";
const LINK_PREVIEW_HTML_LIMIT: usize = 512 * 1024;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct LinkPreviewHtml {
    final_url: String,
    html: String,
}

fn show_window(app: &tauri::AppHandle) {
    let _ = app.show();
    if let Some(w) = app.get_webview_window("main") {
        if w.is_minimized().unwrap_or(false) {
            // Unminimize plays the macOS Dock animation; calling show() on top
            // of it causes a flicker, so we take separate paths.
            let _ = w.unminimize();
        } else {
            let _ = w.show();
        }
        let _ = w.set_focus();
    }
}

#[tauri::command]
fn set_tray_unread(app: tauri::AppHandle, count: u32) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        let tooltip = if count > 0 {
            format!("Vex Chat ({count} unread)")
        } else {
            "Vex Chat".to_string()
        };
        tray.set_tooltip(Some(&tooltip))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn fetch_link_preview_html(url: String) -> Result<LinkPreviewHtml, String> {
    let parsed = reqwest::Url::parse(&url).map_err(|_| "Invalid URL".to_string())?;
    match parsed.scheme() {
        "http" | "https" => {}
        _ => return Err("Only HTTP links can be previewed".to_string()),
    }

    // Match the updater's lean reqwest/rustls configuration without pulling in AWS-LC.
    let _ = rustls::crypto::ring::default_provider().install_default();

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .redirect(reqwest::redirect::Policy::limited(4))
        .user_agent("Vex/0.1 link-preview")
        .build()
        .map_err(|err| err.to_string())?;

    let mut response = client
        .get(parsed)
        .send()
        .await
        .map_err(|err| err.to_string())?;
    if !response.status().is_success() {
        return Err(format!("Preview request failed: {}", response.status()));
    }

    let final_url = response.url().to_string();
    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("")
        .to_ascii_lowercase();
    if !content_type.is_empty()
        && !content_type.contains("text/html")
        && !content_type.contains("application/xhtml+xml")
    {
        return Err("Preview target is not HTML".to_string());
    }

    let mut html_bytes = Vec::new();
    while html_bytes.len() < LINK_PREVIEW_HTML_LIMIT {
        let Some(chunk) = response.chunk().await.map_err(|err| err.to_string())? else {
            break;
        };
        let remaining = LINK_PREVIEW_HTML_LIMIT - html_bytes.len();
        html_bytes.extend_from_slice(&chunk[..chunk.len().min(remaining)]);
    }

    let html = String::from_utf8_lossy(&html_bytes).into_owned();
    Ok(LinkPreviewHtml { final_url, html })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_keyring::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            fetch_link_preview_html,
            set_tray_unread
        ])
        .setup(|app| {
            let show_item = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            TrayIconBuilder::with_id(TRAY_ID)
                .icon(app.default_window_icon().cloned().unwrap())
                .tooltip("Vex Chat")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_window(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
