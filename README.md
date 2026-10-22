# LeanClient for Vencord

LeanClient reduces memory retained by media where a Vencord plugin can safely intervene. It unloads offscreen image and URL-backed video sources, can unload those sources while Discord is hidden, pauses background videos, and can stop GIF autoplay and animated emoji. An optional setting disables inline attachments and embeds so they are not loaded automatically.

The controls trade convenience for lower media use. Offscreen media reloads when it returns to view. Disabling autoplay means animations need to be started manually. Disabling inline media means opening links to see attachments and embeds. Chromium may retain cached data, so the amount released varies.

## Voice and screen sharing

LeanClient does not disconnect voice, stop outgoing screen sharing, change stream quality, or expose controls for Discord's WebRTC receive buffers. It can pause playback of live video elements that are offscreen or while Discord is hidden; those streams may continue receiving data, and an offscreen tile may freeze until visible again. This can reduce local rendering or decoder work, but its memory effect is unknown. It cannot cap Discord's JavaScript heap, message caches, or total process memory, so it cannot guarantee a large overall RAM reduction or a target such as under 1 GB.

For outgoing screen shares, Discord's own resolution and frame-rate controls can reduce capture and encoding work, with lower stream quality as the tradeoff. See [Discord's screen-share guide](https://support.discord.com/hc/en-us/articles/360040816151-Go-Live-and-Screen-Share). Discord's Accessibility settings also include autoplay controls for GIFs and animated emoji: [Accessibility settings](https://support.discord.com/hc/en-us/articles/1500010454681-Accessibility-Settings-Tab).

## Settings

- **Pause when Discord is hidden**: pauses URL-backed videos when Discord is in the background.
- **Unload offscreen media**: unloads offscreen image and URL-backed video sources, restoring them when visible.
- **Unload media when Discord is hidden**: unloads image and URL-backed video sources in the background and restores them when Discord returns.
- **Pause offscreen live video**: pauses playback of offscreen live video elements, then resumes them when visible. Voice and outgoing stream transmission remain connected; WebRTC may continue receiving and buffering video.
- **Disable animated media**: turns off Discord's GIF autoplay and animated emoji settings while LeanClient is active, restoring saved preferences when disabled or stopped.
- **Disable inline media**: turns off inline attachments and embeds by default for the aggressive low-memory profile. This changes how chat content appears; click links to open media. Turn it off to restore the saved Discord preferences. The plugin also restores them when stopped.

## Install

This is a custom Vencord user plugin. Put this folder at `src/userplugins/leanClient` in a Vencord source checkout and rebuild Vencord. A GitHub repository by itself will not make it appear in Vencord's official plugin catalog; that requires upstream acceptance.

## Verification status

The source has passed Vencord's TypeScript and lint checks and the full package build. It has not been installed or runtime-tested in Discord, and no controlled enabled/disabled RAM, CPU, or GPU comparison has been completed. Savings are unmeasured. In particular, the live-video behavior has not been runtime-tested during a call.
