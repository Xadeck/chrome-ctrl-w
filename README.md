# Wayland-Safe Ctrl+W (`chrome-ctrl-w`)

A minimal, zero-permission Chrome Manifest V3 extension to prevent accidental tab closures with `Ctrl+W` and rebind closing highlighted tabs (e.g. `Ctrl+Shift+W`), designed to work reliably on Wayland tiling window managers such as **Niri**, **Sway**, and **Hyprland**.

## Why This Exists

Other extensions (such as *More Better Ctrl-W*) implement `close-highlighted-windows` by calling:

```javascript
chrome.tabs.query({ highlighted: true, currentWindow: true }, ...);
```

Inside a Manifest V3 background service worker (which has no window context of its own), `currentWindow: true` falls back to Chromium's internal `BrowserList::GetInstance()->GetLastActive()`. Under native Wayland (`--ozone-platform=wayland`), Wayland does not expose global window stacking/activation order to clients, so Chromium's `GetLastActive()` frequently gets out of sync when switching workspaces—causing `Ctrl+Shift+W` to close a tab in a completely different window on another workspace.

Meanwhile, Chrome's per-window `ExtensionKeybindingRegistryViews` receives the `wl_keyboard` shortcut event directly on the focused window and passes that exact window's active `Tab` object as the second parameter `(command, tab)` to `chrome.commands.onCommand`.

This extension uses `tab.windowId` directly:

```javascript
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "close-highlighted-tabs" && tab?.windowId !== undefined) {
    chrome.tabs.query({ highlighted: true, windowId: tab.windowId }, (tabs) => {
      chrome.tabs.remove(tabs.map((t) => t.id));
    });
  }
});
```

## Installation (Unpacked)

1. Clone this repository:
   ```sh
   git clone https://github.com/Xadeck/chrome-ctrl-w.git
   ```
2. Open `chrome://extensions` in Google Chrome.
3. Enable **Developer mode** (top-right toggle).
4. Remove or disable any existing *More Better Ctrl-W* extension.
5. Click **Load unpacked** and select the cloned `chrome-ctrl-w` directory.
6. Visit `chrome://extensions/shortcuts` and verify:
   - **Do absolutely nothing (intercept Ctrl+W)**: `Ctrl+W` (Scope: *In Chrome*)
   - **Close highlighted tabs in the focused window**: `Ctrl+Shift+W` (Scope: *In Chrome*)
7. (Optional) In `chrome://extensions` → **Details**, enable **Allow in Incognito**.

## Packaging for Chrome Web Store

To build a `.zip` archive ready for uploading to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole):

```sh
zip -r chrome-ctrl-w.zip manifest.json background.js icons/ LICENSE README.md
```
