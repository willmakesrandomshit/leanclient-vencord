/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { getUserSetting } from "@api/UserSettings";
import definePlugin, { OptionType } from "@utils/types";

type SavedAttribute = {
    element: Element;
    attributes: Array<{ name: string; value: string }>;
};

type MediaElement = HTMLImageElement | HTMLVideoElement;
type SavedPreference = "unset" | "true" | "false";

const savedPreferenceOptions = [
    { label: "Not saved", value: "unset", default: true },
    { label: "Was enabled", value: "true" },
    { label: "Was disabled", value: "false" }
] as const;

const settings = definePluginSettings({
    pauseWhenDiscordIsHidden: {
        type: OptionType.BOOLEAN,
        description: "Pause playing videos while Discord is in the background",
        default: true
    },
    unloadOffscreenMedia: {
        type: OptionType.BOOLEAN,
        description: "Unload offscreen image and video sources to reduce retained media memory; they reload when scrolled back into view",
        default: true
    },
    unloadMediaWhenDiscordIsHidden: {
        type: OptionType.BOOLEAN,
        description: "Unload image and URL-backed video sources while Discord is in the background; they reload when Discord is shown again",
        default: true
    },
    pauseOffscreenLiveVideo: {
        type: OptionType.BOOLEAN,
        description: "Pause playback of live video elements while offscreen or while Discord is hidden, then resume them when visible; the call and outgoing stream remain connected",
        default: true,
        onChange: enabled => {
            document.querySelectorAll("video").forEach(video => {
                if (!enabled) resumeOffscreenLiveVideo(video);
                else {
                    viewportObserver?.unobserve(video);
                    viewportObserver?.observe(video);
                }
            });
        }
    },
    disableAnimatedMedia: {
        type: OptionType.BOOLEAN,
        description: "Disable automatic GIF playback and animated emoji to reduce media decoding; original preferences are restored when this is turned off",
        default: true,
        onChange: enabled => applyPreferences([
            ["gifAutoPlay", "savedGifAutoPlay"],
            ["animateEmoji", "savedAnimateEmoji"]
        ], enabled)
    },
    disableInlineMedia: {
        type: OptionType.BOOLEAN,
        description: "Aggressive low-memory mode: hide inline attachments and embeds to avoid loading their media; click links to open them. Original preferences are restored when this is turned off",
        default: true,
        onChange: enabled => applyPreferences([
            ["inlineAttachmentMedia", "savedInlineAttachmentMedia"],
            ["inlineEmbedMedia", "savedInlineEmbedMedia"],
            ["renderEmbeds", "savedRenderEmbeds"]
        ], enabled)
    },
    savedGifAutoPlay: {
        type: OptionType.SELECT,
        description: "Internal restore state",
        hidden: true,
        options: savedPreferenceOptions
    },
    savedAnimateEmoji: {
        type: OptionType.SELECT,
        description: "Internal restore state",
        hidden: true,
        options: savedPreferenceOptions
    },
    savedInlineAttachmentMedia: {
        type: OptionType.SELECT,
        description: "Internal restore state",
        hidden: true,
        options: savedPreferenceOptions
    },
    savedInlineEmbedMedia: {
        type: OptionType.SELECT,
        description: "Internal restore state",
        hidden: true,
        options: savedPreferenceOptions
    },
    savedRenderEmbeds: {
        type: OptionType.SELECT,
        description: "Internal restore state",
        hidden: true,
        options: savedPreferenceOptions
    }
});

let viewportObserver: IntersectionObserver | undefined;
let pageObserver: MutationObserver | undefined;
let observedMedia = new WeakSet<MediaElement>();
const savedSources = new WeakMap<MediaElement, SavedAttribute[]>();
const hiddenUnloadedMedia = new WeakSet<MediaElement>();
const pausedOffscreenLiveVideos = new WeakSet<HTMLVideoElement>();

function resumeOffscreenLiveVideo(video: HTMLVideoElement) {
    if (!pausedOffscreenLiveVideos.has(video)) return;

    pausedOffscreenLiveVideos.delete(video);
    if (video.srcObject !== null) void video.play().catch(() => {});
}

function updateLiveVideoPlayback(video: HTMLVideoElement) {
    if (video.srcObject === null || !settings.store.pauseOffscreenLiveVideo) {
        resumeOffscreenLiveVideo(video);
        return;
    }

    const bounds = video.getBoundingClientRect();
    const isInViewport = !document.hidden
        && bounds.bottom > 0
        && bounds.right > 0
        && bounds.top < window.innerHeight
        && bounds.left < window.innerWidth;

    if (isInViewport) resumeOffscreenLiveVideo(video);
    else if (!video.paused) {
        video.pause();
        pausedOffscreenLiveVideos.add(video);
    }
}

function onVideoMetadata(event: Event) {
    if (event.target instanceof HTMLVideoElement) updateLiveVideoPlayback(event.target);
}

type SavedPreferenceKey =
    | "savedGifAutoPlay"
    | "savedAnimateEmoji"
    | "savedInlineAttachmentMedia"
    | "savedInlineEmbedMedia"
    | "savedRenderEmbeds";

function applyPreferences(preferences: Array<[string, SavedPreferenceKey]>, disable: boolean) {
    const store = settings.store as Record<SavedPreferenceKey, SavedPreference>;

    for (const [name, savedKey] of preferences) {
        let preference;
        try {
            preference = getUserSetting<boolean>("textAndImages", name);
        } catch {
            continue;
        }
        if (!preference) continue;

        const current = preference.getSetting();
        if (typeof current !== "boolean") continue;

        if (disable) {
            if (store[savedKey] === "unset") store[savedKey] = current ? "true" : "false";
            if (current) void preference.updateSetting(false);
        } else if (store[savedKey] !== "unset") {
            if (current === false) void preference.updateSetting(store[savedKey] === "true");
            store[savedKey] = "unset";
        }
    }
}

function hasUnloadableSource(media: MediaElement) {
    if (media instanceof HTMLVideoElement && media.srcObject !== null) return false;
    if (media.hasAttribute("src") || (media instanceof HTMLVideoElement && media.hasAttribute("poster"))) return true;

    return media.querySelector("source[src], source[srcset]") !== null
        || (media instanceof HTMLImageElement && Boolean(media.closest("picture")?.querySelector("source[src], source[srcset]")));
}

function snapshotSources(media: MediaElement): SavedAttribute[] {
    const elements: Element[] = media instanceof HTMLVideoElement
        ? [media, ...media.querySelectorAll("source")]
        : [media, ...(media.closest("picture")?.querySelectorAll("source") ?? [])];

    return elements.map(element => {
        const names = element === media && media instanceof HTMLVideoElement
            ? ["src", "srcset", "poster"]
            : ["src", "srcset"];

        return {
            element,
            attributes: names.flatMap(name => {
                const value = element.getAttribute(name);
                return value === null ? [] : [{ name, value }];
            })
        };
    });
}

function unloadMedia(media: MediaElement) {
    if (savedSources.has(media) || !hasUnloadableSource(media)) return false;

    const sources = snapshotSources(media);
    savedSources.set(media, sources);
    if (media instanceof HTMLVideoElement) media.pause();

    for (const { element, attributes } of sources) {
        for (const { name } of attributes) element.removeAttribute(name);
    }

    if (media instanceof HTMLVideoElement) media.load();
    return true;
}

function restoreMedia(media: MediaElement) {
    const saved = savedSources.get(media);
    if (!saved) return;

    // Discord can repurpose a video element for a live WebRTC stream while its
    // original URL is unloaded. Never restore that stale URL over the stream.
    if (media instanceof HTMLVideoElement && media.srcObject !== null) {
        savedSources.delete(media);
        hiddenUnloadedMedia.delete(media);
        return;
    }

    for (const { element, attributes } of saved) {
        for (const { name, value } of attributes) element.setAttribute(name, value);
    }

    savedSources.delete(media);
    hiddenUnloadedMedia.delete(media);
    if (media instanceof HTMLVideoElement) media.load();
}

function observeMedia(media: MediaElement) {
    if (observedMedia.has(media)) return;
    observedMedia.add(media);
    viewportObserver?.observe(media);
    if (document.hidden && settings.store.unloadMediaWhenDiscordIsHidden && unloadMedia(media)) {
        hiddenUnloadedMedia.add(media);
    }
}

function observeTree(node: Node) {
    if (!(node instanceof Element)) return;

    if (node.matches("img, video")) observeMedia(node as MediaElement);
    node.querySelectorAll("img, video").forEach(media => observeMedia(media as MediaElement));
}

function pausePlayingVideos() {
    document.querySelectorAll("video").forEach(video => {
        if (video.srcObject === null) video.pause();
    });
}

function onVisibilityChange() {
    if (document.hidden) {
        if (settings.store.pauseWhenDiscordIsHidden) pausePlayingVideos();
        if (settings.store.pauseOffscreenLiveVideo) {
            document.querySelectorAll("video").forEach(video => {
                if (video.srcObject !== null && !video.paused) {
                    video.pause();
                    pausedOffscreenLiveVideos.add(video);
                }
            });
        }
        if (settings.store.unloadMediaWhenDiscordIsHidden) {
            document.querySelectorAll("img, video").forEach(media => {
                const element = media as MediaElement;
                if (unloadMedia(element)) hiddenUnloadedMedia.add(element);
            });
        }
    } else {
        document.querySelectorAll("video").forEach(video => resumeOffscreenLiveVideo(video));
        document.querySelectorAll("img, video").forEach(media => {
            const element = media as MediaElement;
            if (hiddenUnloadedMedia.has(element)) restoreMedia(element);
        });
    }
}

export default definePlugin({
    name: "LeanClient",
    description: "Aggressively reduces automatically loaded media, unloads offscreen media sources, and pauses background videos.",
    authors: [],
    settings,

    start() {
        applyPreferences([
            ["gifAutoPlay", "savedGifAutoPlay"],
            ["animateEmoji", "savedAnimateEmoji"]
        ], settings.store.disableAnimatedMedia);
        applyPreferences([
            ["inlineAttachmentMedia", "savedInlineAttachmentMedia"],
            ["inlineEmbedMedia", "savedInlineEmbedMedia"],
            ["renderEmbeds", "savedRenderEmbeds"]
        ], settings.store.disableInlineMedia);

        viewportObserver = new IntersectionObserver(entries => {
            for (const entry of entries) {
                const media = entry.target as MediaElement;
                if (media instanceof HTMLVideoElement && media.srcObject !== null) {
                    savedSources.delete(media);
                    updateLiveVideoPlayback(media);
                    continue;
                }
                if (entry.isIntersecting) {
                    restoreMedia(media);
                } else if (settings.store.unloadOffscreenMedia) {
                    unloadMedia(media);
                } else if (media instanceof HTMLVideoElement) {
                    media.pause();
                }
            }
        });

        document.querySelectorAll("img, video").forEach(media => observeMedia(media as MediaElement));
        pageObserver = new MutationObserver(records => {
            for (const record of records) record.addedNodes.forEach(observeTree);
        });
        pageObserver.observe(document.body, { childList: true, subtree: true });
        document.addEventListener("loadedmetadata", onVideoMetadata, true);
        document.addEventListener("visibilitychange", onVisibilityChange);
        onVisibilityChange();
    },

    stop() {
        applyPreferences([
            ["gifAutoPlay", "savedGifAutoPlay"],
            ["animateEmoji", "savedAnimateEmoji"],
            ["inlineAttachmentMedia", "savedInlineAttachmentMedia"],
            ["inlineEmbedMedia", "savedInlineEmbedMedia"],
            ["renderEmbeds", "savedRenderEmbeds"]
        ], false);
        document.removeEventListener("loadedmetadata", onVideoMetadata, true);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        pageObserver?.disconnect();
        pageObserver = undefined;
        viewportObserver?.disconnect();
        viewportObserver = undefined;
        observedMedia = new WeakSet<MediaElement>();
        document.querySelectorAll("img, video").forEach(media => restoreMedia(media as MediaElement));
        document.querySelectorAll("video").forEach(video => resumeOffscreenLiveVideo(video));
    },

    dependencies: ["UserSettingsAPI"]
});
