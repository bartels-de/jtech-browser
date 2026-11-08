fn main() {
    // `AppManifest` reads permissions/*.toml. Having an app ACL manifest means
    // no webview can call app commands unless a capability grants them, so
    // only the chrome UI gets access (capabilities/default.json).
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(tauri_build::AppManifest::new()))
        .expect("failed to run tauri-build");
}
