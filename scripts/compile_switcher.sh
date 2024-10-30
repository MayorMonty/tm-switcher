set -e

rm -rf bundle out

npm run switcher:build
npm run switcher:compile

# Rename to match Rust's target triples
mv bundle/tm-switcher-linux-arm64 bundle/tm-switcher-aarch64-unknown-linux-gnu
mv bundle/tm-switcher-linux-x64 bundle/tm-switcher-x86_64-unknown-linux-gnu
mv bundle/tm-switcher-macos-arm64 bundle/tm-switcher-aarch64-apple-darwin
mv bundle/tm-switcher-macos-x64 bundle/tm-switcher-x86_64-pc-windows-msvc
