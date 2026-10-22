# LeanClient for Vencord

LeanClient targets memory retained by media on machines with limited RAM. It unloads image and video URLs while they are outside the visible page, including responsive sources inside `<picture>` and video poster images, then restores them when they return to view. It also pauses videos when Discord is hidden.

This is an aggressive, media-specific tradeoff: images can flash or take a moment to reload while scrolling, and videos may need to be started again. Chromium may retain some cached data, so the amount of memory released varies. This does not shrink Discord's message cache, JavaScript heap, or total process memory, and it cannot guarantee a large reduction in Discord's overall RAM use.

## Install

This is a custom Vencord user plugin. Vencord's official documentation says custom plugins require building Vencord from source. Put this folder at `src/userplugins/leanClient` in a Vencord source checkout, then rebuild Vencord. A GitHub repository by itself will not make it appear in the official Vencord plugin catalog.

## Settings

- **Pause when Discord is hidden**: pauses playing videos after switching away from Discord.
- **Unload offscreen media**: removes offscreen image, picture-source, video, and poster URLs to reduce retained media memory. Sources are restored when scrolled back into view. Disable this setting to keep images loaded and only pause offscreen videos.

## Verification status

The updated plugin passed Vencord's TypeScript check and lint check, and the full Vencord package built with the plugin included. The updated package was injected into the local Discord installation. A controlled on/off memory comparison for this updated version has not been completed, so RAM, CPU, and GPU savings are unmeasured.
