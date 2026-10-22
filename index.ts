import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import definePlugin from "@utils/types";

const settings = definePluginSettings({
    pauseWhenDiscordIsHidden: {
        type: OptionType.BOOLEAN,
        description: "Pause playing videos while Discord is in the background",
        default: true
    },
    pauseOffscreenVideos: {
        type: OptionType.BOOLEAN,
        description: "Pause videos that are outside the visible part of the page",
        default: true
    }
});

let observer: IntersectionObserver | undefined;
const observedVideos = new Set<HTMLVideoElement>();

function observeVideo(video: HTMLVideoElement) {
    if (!settings.store.pauseOffscreenVideos || observedVideos.has(video)) return;
    observedVideos.add(video);
    observer?.observe(video);
}

function pauseVideos() {
    document.querySelectorAll("video").forEach(video => video.pause());
}

function onVisibilityChange() {
    if (settings.store.pauseWhenDiscordIsHidden && document.hidden) pauseVideos();
}

function onVideoPlay(event: Event) {
    if (event.target instanceof HTMLVideoElement) observeVideo(event.target);
}

export default definePlugin({
    name: "LeanClient",
    description: "Reduces background media work by pausing videos when they are hidden or offscreen.",
    authors: [],
    settings,

    start() {
        observer = new IntersectionObserver(entries => {
            for (const entry of entries) {
                if (!entry.isIntersecting) (entry.target as HTMLVideoElement).pause();
            }
        });

        document.querySelectorAll("video").forEach(observeVideo);
        document.addEventListener("play", onVideoPlay, true);
        document.addEventListener("visibilitychange", onVisibilityChange);
        onVisibilityChange();
    },

    stop() {
        document.removeEventListener("play", onVideoPlay, true);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        observer?.disconnect();
        observer = undefined;
        observedVideos.clear();
    }
});
