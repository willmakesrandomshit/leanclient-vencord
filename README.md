# LeanClient for Vencord

LeanClient targets memory retained by media on machines with limited RAM. It unloads image and video URLs while they are outside the visible page, including responsive sources inside `<picture>` and video poster images. It can also unload loaded media while Discord is hidden, then restore it when Discord returns. It pauses background URL-backed videos and can pause playback of live video elements while they are offscreen, resuming them when visible.

These are aggressive, media-specific tradeoffs: images can flash or take a moment to reload while scrolling or when returning to Discord, and videos may need to be started again. Chromium may retain some cached data, so the amount of memory released varies. Pausing an offscreen live video element may reduce local rendering or decoder work, but the WebRTC stream can continue receiving data. This does not lower stream resolution or cap Discord's message cache, JavaScript heap, or total process memory, and it cannot guarantee a large reduction in Discord's overall RAM use.

## Install

This is a custom Vencord user plugin. Vencord's official documentation says custom plugins require building Vencord from source. Put this folder at `src/userplugins/leanClient` in a Vencord source checkout, then rebuild Vencord. A GitHub repository by itself will not make it appear in the official Vencord plugin catalog.

## Settings

- **Pause when Discord is hidden**: pauses playing URL-backed videos after switching away from Discord. Live WebRTC streams are not paused.
- **Unload offscreen media**: removes offscreen image, picture-source, video, and poster URLs. Sources are restored when scrolled back into view.
- **Unload media when Discord is hidden**: unloads current image and URL-backed video sources while the app is in the background and restores them when it returns. Live WebRTC streams are not unloaded.
- **Pause offscreen live video**: pauses playback on video elements outside the viewport and resumes them when they return. Voice and outgoing screen-share tracks remain connected; offscreen call video may freeze until it comes back into view. In the background, call video rendering pauses while voice and stream transmission remain connected. WebRTC may continue receiving and buffering video; this is not a control over receive buffers or stream quality.

## Verification status

The current source passed Vencord's TypeScript check and lint check, and the full Vencord package built with the plugin included. This latest build has not been installed into the running Discord app, and no controlled on/off memory comparison has been completed. RAM, CPU, and GPU savings are unmeasured. The offscreen live-video option has only been build-checked, not runtime-tested during a call. Its memory effect is unknown.

## Additional built-in settings

For media-heavy channels, Discord's Accessibility settings include **Automatically play GIFs when Discord is focused**. Turning this off can avoid animating many GIFs at once, at the cost of needing to start animations manually. See [Discord's Accessibility settings guide](https://support.discord.com/hc/en-us/articles/1500010454681-Accessibility-Settings-Tab).

While sharing your screen, choose the lowest resolution and frame rate that still works for the audience. This reduces the sender's capture and encoding workload, but lowers stream quality; Discord exposes these controls in its desktop screen-share settings. See [Discord's screen-share guide](https://support.discord.com/hc/en-us/articles/360040816151-Go-Live-and-Screen-Share).

These settings can reduce media work in their respective cases, but neither puts a cap on Discord's total RAM use. LeanClient does not change them automatically.
