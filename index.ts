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
type SavedPreference = "unset" | "boolean:true" | "boolean:false" | "number:0" | "number:1" | "number:2";

const savedPreferenceOptions = [
    { label: "Not saved", value: "unset", default: true },
    { label: "Was enabled", value: "boolean:true" },
    { label: "Was disabled", value: "boolean:false" },
    { label: "Was set to Always", value: "number:0" },
    { label: "Was set to On Interaction", value: "number:1" },
    { label: "Was set to Never", value: "number:2" }
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
        description: "Disable GIF autoplay, animated emoji, and sticker animation to reduce animated media work; saved preferences are restored when this is turned off",
        default: true,
        onChange: enabled => applyPreferences([
            ["textAndImages", "gifAutoPlay", "savedGifAutoPlay", false],
            ["textAndImages", "animateEmoji", "savedAnimateEmoji", false],
            ["textAndImages", "animateStickers", "savedAnimateStickers", 2]
        ], enabled)
    },
    disableInlineMedia: {
        type: OptionType.BOOLEAN,
        description: "Aggressive low-memory mode: hide inline attachments and embeds to avoid loading their media; click links to open them. Original preferences are restored when this is turned off",
        default: true,
        onChange: enabled => applyPreferences([
            ["textAndImages", "inlineAttachmentMedia", "savedInlineAttachmentMedia", false],
            ["textAndImages", "inlineEmbedMedia", "savedInlineEmbedMedia", false],
            ["textAndImages", "renderEmbeds", "savedRenderEmbeds", false]
        ], enabled)
    },
    disableReactions: {
        type: OptionType.BOOLEAN,
        description: "Disable reaction rendering to avoid loading reaction UI and emoji; reactions are hidden until this is turned off",
        default: true,
        onChange: enabled => applyPreferences([
            ["textAndImages", "renderReactions", "savedRenderReactions", false]
        ], enabled)
    },
    disableStreamPreviews: {
        type: OptionType.BOOLEAN,
        description: "Disable Discord stream preview cards; this may reduce preview rendering while screen sharing, but savings are unmeasured",
        default: true,
        onChange: enabled => applyPreferences([
            ["voiceAndVideo", "disableStreamPreviews", "savedDisableStreamPreviews", true]
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
    },
    savedAnimateStickers: {
        type: OptionType.SELECT,
        description: "Internal restore state",
        hidden: true,
        options: savedPreferenceOptions
    },
    savedRenderReactions: {
        type: OptionType.SELECT,
        description: "Internal restore state",
        hidden: true,
        options: savedPreferenceOptions
    },
    savedDisableStreamPreviews: {
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
    | "savedRenderEmbeds"
    | "savedAnimateStickers"
    | "savedRenderReactions"
    | "savedDisableStreamPreviews";

function encodePreference(value: unknown): SavedPreference | undefined {
    if (typeof value === "boolean") return `boolean:${value}`;
    if (value === 0 || value === 1 || value === 2) return `number:${value}`;
}

function decodePreference(value: SavedPreference): boolean | number | undefined {
    if (value === "boolean:true") return true;
    if (value === "boolean:false") return false;
    if (value === "number:0") return 0;
    if (value === "number:1") return 1;
    if (value === "number:2") return 2;
}

function applyPreferences(preferences: Array<[string, string, SavedPreferenceKey, boolean | number]>, disable: boolean) {
    const store = settings.store as Record<SavedPreferenceKey, SavedPreference>;

    for (const [group, name, savedKey, disabledValue] of preferences) {
        let preference;
        try {
            preference = getUserSetting<unknown>(group, name);
        } catch {
            continue;
        }
        if (!preference) continue;

        const current = preference.getSetting();
        const encoded = encodePreference(current);
        if (encoded === undefined) continue;

        if (disable) {
            if (store[savedKey] === "unset") store[savedKey] = encoded;
            if (current !== disabledValue) void preference.updateSetting(disabledValue);
        } else if (store[savedKey] !== "unset") {
            const original = decodePreference(store[savedKey]);
            if (current === disabledValue && original !== undefined) void preference.updateSetting(original);
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
            ["textAndImages", "gifAutoPlay", "savedGifAutoPlay", false],
            ["textAndImages", "animateEmoji", "savedAnimateEmoji", false],
            ["textAndImages", "animateStickers", "savedAnimateStickers", 2]
        ], settings.store.disableAnimatedMedia);
        applyPreferences([
            ["textAndImages", "inlineAttachmentMedia", "savedInlineAttachmentMedia", false],
            ["textAndImages", "inlineEmbedMedia", "savedInlineEmbedMedia", false],
            ["textAndImages", "renderEmbeds", "savedRenderEmbeds", false]
        ], settings.store.disableInlineMedia);
        applyPreferences([
            ["textAndImages", "renderReactions", "savedRenderReactions", false]
        ], settings.store.disableReactions);
        applyPreferences([
            ["voiceAndVideo", "disableStreamPreviews", "savedDisableStreamPreviews", true]
        ], settings.store.disableStreamPreviews);

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
            ["textAndImages", "gifAutoPlay", "savedGifAutoPlay", false],
            ["textAndImages", "animateEmoji", "savedAnimateEmoji", false],
            ["textAndImages", "animateStickers", "savedAnimateStickers", 2],
            ["textAndImages", "inlineAttachmentMedia", "savedInlineAttachmentMedia", false],
            ["textAndImages", "inlineEmbedMedia", "savedInlineEmbedMedia", false],
            ["textAndImages", "renderEmbeds", "savedRenderEmbeds", false],
            ["textAndImages", "renderReactions", "savedRenderReactions", false],
            ["voiceAndVideo", "disableStreamPreviews", "savedDisableStreamPreviews", true]
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
