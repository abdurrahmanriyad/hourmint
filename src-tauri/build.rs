fn main() {
    // The App Store build (no `direct` feature) has no updater/process plugins, so it
    // must not load their permissions.
    let pattern = if std::env::var_os("CARGO_FEATURE_DIRECT").is_some() {
        "./capabilities/*.json"
    } else {
        "./capabilities/default.json"
    };
    tauri_build::try_build(tauri_build::Attributes::new().capabilities_path_pattern(pattern))
        .expect("failed to run tauri-build");
}
