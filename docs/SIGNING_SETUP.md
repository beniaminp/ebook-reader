# Android Signing Setup

This guide explains how to configure signed release builds for the ebook-reader app.

## 1. Generate a Keystore

If you don't already have one, generate a keystore file:

```bash
keytool -genkey -v \
  -keystore ebook-reader-release.jks \
  -alias ebook-reader \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

You'll be prompted to set a keystore password, key password, and identity info.

**Keep this file safe and backed up.** If you lose it, you can never update your app on the Play Store under the same package name.

## 2. Base64-Encode the Keystore

GitHub Secrets only accept text, so the keystore must be base64-encoded:

```bash
base64 -w 0 ebook-reader-release.jks > keystore.b64
```

On macOS:

```bash
base64 -i ebook-reader-release.jks -o keystore.b64
```

The `-w 0` (Linux) ensures no line breaks — this is critical. Newlines in the base64 will corrupt the keystore when decoded in CI.

## 3. Add GitHub Secrets

Go to your repository on GitHub:

**Settings → Secrets and variables → Actions → New repository secret**

Add these 4 secrets:

| Secret Name | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Entire contents of `keystore.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | The keystore password you chose in step 1 |
| `ANDROID_KEY_ALIAS` | The alias you chose (e.g. `ebook-reader`) |
| `ANDROID_KEY_PASSWORD` | The key password you chose in step 1 |

## 4. Run the Workflow

1. Go to **Actions** tab in your GitHub repository
2. Select **Build Signed Release** from the left sidebar
3. Click **Run workflow**
4. Choose what to build:
   - **apk** — Signed APK for direct install / sideloading
   - **aab** — Android App Bundle for Google Play Store upload
   - **both** — Build both
5. Click **Run workflow**

## 5. Download the Artifacts

After the workflow completes:

- **GitHub Release**: A new release tagged `v{version}` will be created with the signed APK/AAB attached
- **Artifacts**: The signed files are also available as downloadable artifacts on the workflow run page

## Workflows Overview

| Workflow | Trigger | Output | Signing |
|---|---|---|---|
| `build-apk.yml` | Push to main | Debug APK → `latest` release | Unsigned (debug) |
| `build-signed-release.yml` | Manual dispatch | Signed APK/AAB → versioned release | Signed (release) |

## Troubleshooting

### `java.io.EOFException` or "Failed to load signer"
The base64-encoded keystore has newline characters. Re-encode with `base64 -w 0` and update the `ANDROID_KEYSTORE_BASE64` secret.

### `app-release-unsigned.apk` instead of `app-release.apk`
The signing secrets are missing or incorrect. Verify all 4 secrets are set correctly in GitHub.

### Build works in CI but fails locally
This is expected. The signing config only activates when `ANDROID_KEYSTORE_PATH` env var is set. Local builds use the debug signing config as usual.
