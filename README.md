# LeanClient for Vencord

LeanClient pauses playing videos when Discord is hidden or when a video scrolls outside the visible page. This may reduce video decoding and background CPU work. It is not a general RAM optimizer and cannot promise a large memory reduction. Vencord plugins do not provide supported control over Discord's message cache or Chromium's process memory policy.

## Install

This is a custom Vencord user plugin. Vencord's official documentation says custom plugins require building Vencord from source. Put this folder at `src/userplugins/leanClient` in a Vencord source checkout, then rebuild Vencord. A GitHub repository by itself will not make it appear in the official Vencord plugin catalog.

## Settings

- **Pause when Discord is hidden**: pauses videos after switching away from Discord.
- **Pause offscreen videos**: pauses videos outside the visible page area.

Videos may need to be resumed manually when brought back into view. The plugin does not delete cached media, change message history, or alter Discord network requests.

## Status

Initial source draft. It has not been built or runtime-verified against a Vencord checkout. Its effect on RAM has not been measured.
