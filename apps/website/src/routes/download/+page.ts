import type { PageLoad } from "./$types";

interface GitHubAsset {
    name: string;
    browser_download_url: string;
    size: number;
}

interface GitHubRelease {
    tag_name: string;
    assets: GitHubAsset[];
}

interface ReleaseAsset {
    url: string;
    label: string;
    platform: string;
    size: string;
}

function formatSize(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
}

function classifyAsset(
    name: string,
): { label: string; platform: string } | null {
    const n = name.toLowerCase();
    if (n.endsWith(".dmg")) return { label: "macOS (.dmg)", platform: "macos" };
    if (n.endsWith(".exe") || n.endsWith(".msi"))
        return { label: "Windows (.exe)", platform: "windows" };
    if (n.endsWith(".appimage"))
        return { label: "Linux (.AppImage)", platform: "linux" };
    if (n.endsWith(".deb")) return { label: "Linux (.deb)", platform: "linux" };
    return null;
}

export const load: PageLoad = async ({ fetch }) => {
    try {
        const res = await fetch(
            "https://api.github.com/repos/vex-chat/vex-desktop/releases/latest",
        );
        if (!res.ok) return { release: null };

        const data: GitHubRelease = await res.json();
        const assets: ReleaseAsset[] = data.assets
            .map((a) => {
                const info = classifyAsset(a.name);
                if (!info) return null;
                return {
                    url: a.browser_download_url,
                    label: info.label,
                    platform: info.platform,
                    size: formatSize(a.size),
                };
            })
            .filter((a): a is ReleaseAsset => a !== null);

        return {
            release: { tag: data.tag_name, assets },
        };
    } catch {
        return { release: null };
    }
};
