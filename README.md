# LeanClient for Vencord

LeanClient targets media memory on machines with limited RAM. It unloads the source URLs of images and videos while they are outside the visible page, then restores them when they return to view. It also pauses videos when Discord is hidden.

This is an aggressive tradeoff: media can flash or take a moment to reload while scrolling, and videos may need to be started again. Chromium may retain some cached data, so the amount of memory released varies. This does not shrink Discord's message cache, JavaScript heap, or total process memory, and it cannot guarantee a large reduction in Discord's overall RAM use.

## Install

This is a custom Vencord user plugin. Vencord's official documentation says custom plugins require building Vencord from source. Put this folder at `src/userplugins/leanClient` in a Vencord source checkout, then rebuild Vencord. A GitHub repository by itself will not make it appear in the official Vencord plugin catalog.

## Settings

- **Pause when Discord is hidden**: pauses playing videos after switching away from Discord.
- **Unload offscreen media**: removes offscreen image and video sources to reduce retained media memory. Sources are restored when scrolled back into view. Disable this setting to keep images loaded and only pause offscreen videos.

## Verification status

The plugin compiled in a Vencord development build, passed Vencord's TypeScript check, and passed its plugin lint check. It has not been runtime-tested in Discord, and RAM, CPU, and GPU savings have not been measured.
