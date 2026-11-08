fn main() {
    // `AppManifest` reads permissions/*.toml. Having an app ACL manifest means
    // no webview can call app commands unless a capability grants them, so
    // only the chrome UI gets access (capabilities/default.json).
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(tauri_build::AppManifest::new()))
        .expect("failed to run tauri-build");

    print_release_version_info();
}

/// On GitHub Actions (Windows), print the version resource of an already
/// built release exe into the build log. The CI test step runs after the
/// installer build, so this shows what Windows (Explorer, Task Manager)
/// reads from the shipped binary.
fn print_release_version_info() {
    if std::env::var("GITHUB_ACTIONS").as_deref() != Ok("true") || !cfg!(windows) {
        return;
    }
    let exe = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("target/release/jtech-browser.exe");
    println!("cargo:rerun-if-changed={}", exe.display());
    if !exe.exists() {
        return;
    }
    let script = format!(
        "$v = (Get-Item -LiteralPath '{}').VersionInfo; \
         'FileDescription=' + $v.FileDescription; 'ProductName=' + $v.ProductName; \
         'CompanyName=' + $v.CompanyName; 'FileVersion=' + $v.FileVersion; \
         'OriginalFilename=' + $v.OriginalFilename; 'LegalCopyright=' + $v.LegalCopyright",
        exe.display()
    );
    if let Ok(output) = std::process::Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &script])
        .output()
    {
        for line in String::from_utf8_lossy(&output.stdout).lines() {
            println!("cargo:warning=exe version info: {line}");
        }
    }
}
