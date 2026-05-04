# Mobile passkeys

Passkeys (WebAuthn / FIDO2) let a Vex user authorize a fresh device or
remove a lost one even if every device that previously held a key is
gone. This document covers the **operator/developer** setup required
to make the ceremony actually succeed on iOS and Android.

The library that drives the platform ceremony is
[`react-native-passkey`](https://www.npmjs.com/package/react-native-passkey).

## TL;DR

1. iOS — `app.json` already declares
   `"associatedDomains": ["webcredentials:vex.wtf"]`. After changing
   the relying-party host, update both that entry _and_ your
   server's `apple-app-site-association`.
2. Android — host `assetlinks.json` on the same host and set
   `compileSdkVersion ≥ 34`. Expo's prebuild does the latter when
   `targetSdkVersion` is current; the JSON file is on you.
3. spire — the server must be configured with `SPIRE_PASSKEY_RP_ID`
   (the eTLD+1 of the host the user agent sees) and
   `SPIRE_PASSKEY_ORIGINS` (a comma-separated list of accepted
   origins, including the `android:apk-key-hash:…` and
   `ios:bundle-id:…` flavors emitted by mobile platforms).

If any one of those three legs is missing, the system credential
manager will fail the ceremony with a "Domain mismatch" error well
before our app code runs. The wrapper in `src/lib/passkey.ts`
normalizes that to a `PasskeyError` with the platform's message.

## iOS — Apple App Site Association

You need to host

```
https://vex.wtf/.well-known/apple-app-site-association
```

containing your team and bundle id with a `webcredentials` entry:

```json
{
    "webcredentials": {
        "apps": ["TEAMID.chat.vex.mobile"]
    }
}
```

Replace `TEAMID` with your Apple Developer team identifier and
`chat.vex.mobile` with whatever bundle id is shipping (the dev
flavor uses `chat.vex.mobile.dev`). The file must be served as
`application/json` over HTTPS with a valid certificate — Apple
will _silently_ refuse a self-signed cert and the system prompt
will never appear.

After deploying the file, install a fresh build via
`npx expo prebuild -p ios && npx expo run:ios`. The prebuild step
syncs the `associatedDomains` entry into the generated
`Vex.entitlements`.

## Android — Digital Asset Links

You need to host

```
https://vex.wtf/.well-known/assetlinks.json
```

with the package name and SHA-256 signing-cert fingerprint(s):

```json
[
    {
        "relation": [
            "delegate_permission/common.get_login_creds",
            "delegate_permission/common.handle_all_urls"
        ],
        "target": {
            "namespace": "android_app",
            "package_name": "chat.vex.mobile",
            "sha256_cert_fingerprints": ["AB:CD:EF:..."]
        }
    }
]
```

Get the fingerprint with

```sh
keytool -list -v -alias <alias> -keystore <keystore.jks>
```

and paste the colon-delimited `SHA256` value into
`sha256_cert_fingerprints`. If you have separate dev/release keys,
add an entry for each — the same JSON file can carry both.

## spire — relying-party config

Set these env vars on the server before starting it:

```
SPIRE_PASSKEY_RP_ID=vex.wtf
SPIRE_PASSKEY_RP_NAME=Vex
SPIRE_PASSKEY_ORIGINS=https://vex.wtf,android:apk-key-hash:<base64url-of-sha256>,ios:bundle-id:chat.vex.mobile
```

The `ORIGINS` list is what `simplewebauthn` uses to validate the
`origin` field inside the assertion's `clientDataJSON`. Different
mobile platforms sign different "origin" strings:

- iOS and macOS Safari: the actual website origin (`https://vex.wtf`).
- iOS native (the path our wrapper takes): `ios:bundle-id:chat.vex.mobile`.
- Android Credential Manager: `android:apk-key-hash:<base64url(SHA-256(cert))>`.

Compute the Android base64url hash with

```sh
keytool -list -v -alias <alias> -keystore <keystore.jks> | \
    awk '/SHA256:/ {print $2}' | tr -d : | xxd -r -p | base64 | tr '+/' '-_' | tr -d '='
```

## Local development

For testing without owning `vex.wtf` you can:

- Run spire with `SPIRE_PASSKEY_RP_ID=localhost` and
  `SPIRE_PASSKEY_ORIGINS=http://localhost:5173` (browser dev only).
- For native testing point at a tunnel host (e.g. ngrok) and update
  all three legs (`associatedDomains`, asset links, spire env)
  consistently.

There is no usable local-dev mode for native passkeys without a
domain you control — Apple and Google both gate the ceremony on
the cryptographically-verified domain ↔ app association.
