# LeanClient for Vencord

LeanClient targets memory retained by media on machines with limited RAM. It unloads image and video URLs while they are outside the visible page, including responsive sources inside `<picture>` and video poster images. It can also unload loaded media while Discord is hidden, then restore it when Discord returns. It pauses background URL-backed videos and leaves live WebRTC video streams alone.

These are aggressive, media-specific tradeoffs: images can flash or take a moment to reload while scrolling or when returning to Discord, and videos may need to be started again. Chromium may retain some cached data, so the amount of memory released varies. This does not shrink Discord's message cache, JavaScript heap, or total process memory, and it cannot guarantee a large reduction in Discord's overall RAM use.

## Install

This is a custom Vencord user plugin. Vencord's official documentation says custom plugins require building Vencord from source. Put this folder at `src/userplugins/leanClient` in a Vencord source checkout, then rebuild Vencord. A GitHub repository by itself will not make it appear in the official Vencord plugin catalog.

## Settings

- **Pause when Discord is hidden**: pauses playing URL-backed videos after switching away from Discord. Live WebRTC streams are not paused.
- **Unload offscreen media**: removes offscreen image, picture-source, video, and poster URLs. Sources are restored when scrolled back into view.
- **Unload media when Discord is hidden**: unloads current image and URL-backed video sources while the app is in the background and restores them when it returns. Live WebRTC streams are not unloaded.

## Verification status

The current source passed Vencord's TypeScript check and lint check, and the full Vencord package built with the plugin included. This latest build has not been installed into the running Discord app, and no controlled on/off memory comparison has been completed. RAM, CPU, and GPU savings are unmeasured.
