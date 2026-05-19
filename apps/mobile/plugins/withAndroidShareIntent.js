const {
    AndroidConfig,
    withAndroidManifest,
    withDangerousMod,
    withMainApplication,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const SHARE_PACKAGE_NAME = "VexSharePackage";

function androidPackage(config) {
    return (
        AndroidConfig.Package.getPackage(config) ||
        config.android?.package ||
        "chat.vex.mobile"
    );
}

function hasIntentFilter(activity, actionName, mimeType) {
    return (activity["intent-filter"] ?? []).some((filter) => {
        const hasAction = (filter.action ?? []).some(
            (action) => action?.$?.["android:name"] === actionName,
        );
        const hasMime = (filter.data ?? []).some(
            (data) => data?.$?.["android:mimeType"] === mimeType,
        );
        return hasAction && hasMime;
    });
}

function makeShareIntentFilter(actionName, mimeType) {
    return {
        action: [{ $: { "android:name": actionName } }],
        category: [
            { $: { "android:name": "android.intent.category.DEFAULT" } },
        ],
        data: [{ $: { "android:mimeType": mimeType } }],
    };
}

function withShareIntentFilters(config) {
    return withAndroidManifest(config, (cfg) => {
        const mainActivity =
            AndroidConfig.Manifest.getMainActivityOrThrow(cfg.modResults);
        mainActivity["intent-filter"] = mainActivity["intent-filter"] ?? [];

        const filters = [
            ["android.intent.action.SEND", "image/*"],
            ["android.intent.action.SEND", "text/plain"],
            ["android.intent.action.SEND_MULTIPLE", "image/*"],
        ];

        for (const [actionName, mimeType] of filters) {
            if (!hasIntentFilter(mainActivity, actionName, mimeType)) {
                mainActivity["intent-filter"].push(
                    makeShareIntentFilter(actionName, mimeType),
                );
            }
        }

        return cfg;
    });
}

function withShareNativePackage(config) {
    return withMainApplication(config, (cfg) => {
        const pkg = androidPackage(cfg);
        const importLine = `import ${pkg}.share.${SHARE_PACKAGE_NAME}`;
        let contents = cfg.modResults.contents;

        if (!contents.includes(importLine)) {
            contents = contents.replace(
                /^package .+\n/m,
                (match) => `${match}\n${importLine}\n`,
            );
        }

        if (!contents.includes(`${SHARE_PACKAGE_NAME}()`)) {
            if (contents.includes("PackageList(this).packages.apply {")) {
                contents = contents.replace(
                    /(PackageList\(this\)\.packages\.apply \{\n)/,
                    `$1          add(${SHARE_PACKAGE_NAME}())\n`,
                );
            } else {
                contents = contents.replace(
                    /(\s+)return packages\b/,
                    `$1packages.add(${SHARE_PACKAGE_NAME}())$1return packages`,
                );
            }
        }

        cfg.modResults.contents = contents;
        return cfg;
    });
}

function withShareNativeFiles(config) {
    return withDangerousMod(config, [
        "android",
        async (cfg) => {
            const pkg = androidPackage(cfg);
            const packagePath = pkg.split(".").join(path.sep);
            const shareDir = path.join(
                cfg.modRequest.platformProjectRoot,
                "app",
                "src",
                "main",
                "java",
                packagePath,
                "share",
            );

            fs.mkdirSync(shareDir, { recursive: true });
            fs.writeFileSync(
                path.join(shareDir, "VexShareIntentModule.kt"),
                shareIntentModuleSource(pkg),
                "utf8",
            );
            fs.writeFileSync(
                path.join(shareDir, "VexSharePackage.kt"),
                sharePackageSource(pkg),
                "utf8",
            );

            return cfg;
        },
    ]);
}

function sharePackageSource(pkg) {
    return `package ${pkg}.share

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class VexSharePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(VexShareIntentModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
`;
}

function shareIntentModuleSource(pkg) {
    return `package ${pkg}.share

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.OpenableColumns
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import java.io.File
import java.io.FileOutputStream
import java.security.MessageDigest

class VexShareIntentModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    private var cachedIntentIdentity: Int? = null
    private var cachedShare: WritableMap? = null
    private val clearedShareIds = mutableSetOf<String>()

    override fun getName(): String = "VexShareIntent"

    @ReactMethod
    fun getInitialShare(promise: Promise) {
        try {
            val intent = reactContext.currentActivity?.intent
            if (intent == null || !isShareIntent(intent)) {
                promise.resolve(null)
                return
            }

            val identity = System.identityHashCode(intent)
            if (cachedIntentIdentity == identity) {
                val cached = cachedShare
                val cachedId = cached?.getString("id")
                if (cached == null || cachedId == null || clearedShareIds.contains(cachedId)) {
                    promise.resolve(null)
                } else {
                    promise.resolve(cached)
                }
                return
            }

            val share = buildShare(intent, identity)
            cachedIntentIdentity = identity
            cachedShare = share
            val shareId = share?.getString("id")
            if (share == null || shareId == null || clearedShareIds.contains(shareId)) {
                promise.resolve(null)
                return
            }
            promise.resolve(share)
        } catch (error: Exception) {
            promise.reject("VEX_SHARE_READ_FAILED", error.message, error)
        }
    }

    @ReactMethod
    fun clearShare(id: String, promise: Promise) {
        clearedShareIds.add(id)
        val activity = reactContext.currentActivity
        val currentIntent = activity?.intent
        if (currentIntent != null && isShareIntent(currentIntent)) {
            activity.setIntent(Intent(Intent.ACTION_MAIN))
        }
        if (cachedShare?.getString("id") == id) {
            cachedShare = null
        }
        promise.resolve(null)
    }

    private fun buildShare(intent: Intent, identity: Int): WritableMap? {
        val text = intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString()?.trim().orEmpty()
        val uris = collectStreamUris(intent)
        if (text.isEmpty() && uris.isEmpty()) {
            return null
        }

        val intentHash = stableId(identity, intent.action.orEmpty(), intent.type.orEmpty(), text, uris)
        val items = Arguments.createArray()
        uris.forEachIndexed { index, uri ->
            copyShareUri(uri, intent.type, index)?.let { item ->
                items.pushMap(item)
            }
        }

        val share = Arguments.createMap()
        share.putString("id", intentHash)
        if (text.isNotEmpty()) {
            share.putString("text", text)
        }
        share.putArray("items", items)
        if (text.isEmpty() && items.size() == 0) {
            return null
        }
        return share
    }

    private fun collectStreamUris(intent: Intent): List<Uri> {
        val uris = linkedSetOf<Uri>()
        if (intent.action == Intent.ACTION_SEND) {
            streamExtra(intent)?.let { uris.add(it) }
        } else if (intent.action == Intent.ACTION_SEND_MULTIPLE) {
            streamExtraList(intent).forEach { uris.add(it) }
        }

        val clipData = intent.clipData
        if (clipData != null) {
            for (index in 0 until clipData.itemCount) {
                clipData.getItemAt(index).uri?.let { uris.add(it) }
            }
        }
        return uris.toList()
    }

    private fun copyShareUri(uri: Uri, intentType: String?, index: Int): WritableMap? {
        val resolver = reactContext.contentResolver
        val contentType = resolver.getType(uri) ?: intentType ?: "application/octet-stream"
        val displayName = queryDisplayName(uri) ?: fallbackFileName(contentType, index)
        val safeName = sanitizeFileName(displayName)
        val shareDir = File(reactContext.cacheDir, "vex-shares").apply {
            mkdirs()
        }
        val target = File(shareDir, "\${System.currentTimeMillis()}-\${index}-\${safeName}")
        resolver.openInputStream(uri)?.use { input ->
            FileOutputStream(target).use { output ->
                input.copyTo(output)
            }
        } ?: return null

        val item = Arguments.createMap()
        item.putString("uri", Uri.fromFile(target).toString())
        item.putString("fileName", displayName)
        item.putString("contentType", contentType)
        val size = querySize(uri) ?: target.length()
        if (size >= 0L) {
            item.putDouble("fileSize", size.toDouble())
        }
        return item
    }

    private fun fallbackFileName(contentType: String, index: Int): String {
        val extension = when (contentType.lowercase()) {
            "image/gif" -> "gif"
            "image/heic" -> "heic"
            "image/jpeg" -> "jpg"
            "image/png" -> "png"
            "image/webp" -> "webp"
            "text/plain" -> "txt"
            else -> "bin"
        }
        return "shared-\${index + 1}.\${extension}"
    }

    private fun isShareIntent(intent: Intent): Boolean {
        return intent.action == Intent.ACTION_SEND || intent.action == Intent.ACTION_SEND_MULTIPLE
    }

    private fun queryDisplayName(uri: Uri): String? {
        return queryString(uri, OpenableColumns.DISPLAY_NAME)
    }

    private fun querySize(uri: Uri): Long? {
        val resolver = reactContext.contentResolver
        resolver.query(uri, arrayOf(OpenableColumns.SIZE), null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val index = cursor.getColumnIndex(OpenableColumns.SIZE)
                if (index >= 0 && !cursor.isNull(index)) {
                    return cursor.getLong(index)
                }
            }
        }
        return null
    }

    private fun queryString(uri: Uri, column: String): String? {
        val resolver = reactContext.contentResolver
        resolver.query(uri, arrayOf(column), null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val index = cursor.getColumnIndex(column)
                if (index >= 0 && !cursor.isNull(index)) {
                    return cursor.getString(index)
                }
            }
        }
        return null
    }

    private fun sanitizeFileName(fileName: String): String {
        val sanitized = fileName
            .replace(Regex("""[/"%*:<>?\\\\|]"""), "_")
            .replace(Regex("""\\s+"""), " ")
            .trim()
        return sanitized.ifEmpty { "attachment" }
    }

    private fun stableId(
        identity: Int,
        action: String,
        type: String,
        text: String,
        uris: List<Uri>,
    ): String {
        val raw = listOf(
            identity.toString(),
            action,
            type,
            text,
            uris.joinToString("|") { it.toString() },
        ).joinToString("|")
        val digest = MessageDigest.getInstance("SHA-256").digest(raw.toByteArray())
        return digest.joinToString("") { byte -> "%02x".format(byte) }
    }

    @Suppress("DEPRECATION")
    private fun streamExtra(intent: Intent): Uri? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
        } else {
            intent.getParcelableExtra(Intent.EXTRA_STREAM) as? Uri
        }
    }

    @Suppress("DEPRECATION")
    private fun streamExtraList(intent: Intent): List<Uri> {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM, Uri::class.java).orEmpty()
        } else {
            intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM).orEmpty()
        }
    }
}
`;
}

module.exports = function withAndroidShareIntent(config) {
    config = withShareIntentFilters(config);
    config = withShareNativePackage(config);
    config = withShareNativeFiles(config);
    return config;
};
