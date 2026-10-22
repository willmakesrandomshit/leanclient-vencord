# LeanClient for Vencord

LeanClient reduces memory retained by media where a Vencord plugin can safely intervene. It unloads offscreen image and URL-backed video sources, can unload those sources while Discord is hidden, pauses background videos, stops GIF autoplay and animated emoji/stickers, hides inline attachments and embeds, and can hide reactions.

The defaults are intentionally aggressive and trade convenience for lower media use. Offscreen media reloads when it returns to view. Disabling autoplay and sticker animation removes motion. Disabling inline media means opening links to see attachments and embeds. Disabling reaction rendering hides reactions. Chromium may retain cached data, so the amount released varies.

## Voice and screen sharing

LeanClient does not disconnect voice, stop outgoing screen sharing, change stream quality, or expose controls for Discord's WebRTC receive buffers. It can pause playback of live video elements that are offscreen or while Discord is hidden; those streams may continue receiving data, and an offscreen tile may freeze until visible again. This can reduce local rendering or decoder work, but its memory effect is unknown. During calls, the most direct way to avoid receiving video is to stay in voice without watching a stream or camera video. For outgoing screen sharing, selecting a lower resolution and frame rate reduces capture and encoding workload, with lower stream quality as the tradeoff. Discord documents both stream-quality controls and joining voice without watching a stream in its [screen-share guide](https://support.discord.com/hc/en-us/articles/360040816151-Go-Live-and-Screen-Share). LeanClient cannot cap Discord's JavaScript heap, message caches, or total process memory, so it cannot guarantee a large overall RAM reduction or a target such as under 1 GB.

Discord's Accessibility settings include reduced motion, GIF autoplay, animated emoji, and sticker animation controls: [Accessibility settings](https://support.discord.com/hc/en-us/articles/1500010454681-Accessibility-Settings-Tab).

## Settings

- **Pause when Discord is hidden**: pauses URL-backed videos when Discord is in the background.
- **Unload offscreen media**: unloads offscreen image and URL-backed video sources, restoring them when visible.
- **Unload media when Discord is hidden**: unloads image and URL-backed video sources in the background and restores them when Discord returns.
- **Pause offscreen live video**: pauses playback of offscreen live video elements, then resumes them when visible. Voice and outgoing stream transmission remain connected; WebRTC may continue receiving and buffering video.
- **Disable animated media**: turns off Discord's GIF autoplay and animated emoji and sets sticker animation to Never while LeanClient is active, restoring saved preferences when disabled or stopped.
- **Disable inline media**: turns off inline attachments and embeds by default for the aggressive low-memory profile. This changes how chat content appears; click links to open media. Turn it off to restore the saved Discord preferences. The plugin also restores them when stopped.
- **Disable reactions**: stops rendering reactions by default. Turn it off to restore Discord's saved preference.

## Install

This is a custom Vencord user plugin. Put this folder at `src/userplugins/leanClient` in a Vencord source checkout and rebuild Vencord. A GitHub repository by itself will not make it appear in Vencord's official plugin catalog; that requires upstream acceptance.

## Verification status

The source has passed Vencord's TypeScript and lint checks and the full package build. It has not been installed or runtime-tested in Discord, and no controlled enabled/disabled RAM, CPU, or GPU comparison has been completed. Savings are unmeasured. In particular, the live-video behavior has not been runtime-tested during a call.
