VERSION=$1

if git rev-parse "$VERSION" >/dev/null 2>&1; then
    echo "error: version $VERSION already created";
    exit 1;
fi

# package.json
jq ".version = \"$VERSION\"" package.json > package.json.tmp
mv package.json.tmp package.json

# .env
sed -i .old "s/VERSION=.*/VERSION=$VERSION/g" .env

# host/src-tauri/tauri.conf.json
jq ".version = \"$VERSION\"" host/src-tauri/tauri.conf.json > host/src-tauri/tauri.conf.json.tmp
mv host/src-tauri/tauri.conf.json.tmp host/src-tauri/tauri.conf.json

git add package.json host/src-tauri/tauri.conf.json;
git commit -m "$VERSION";
git tag -a $VERSION -m "Release $VERSION";