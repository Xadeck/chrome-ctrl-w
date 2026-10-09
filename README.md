# Wayland-Safe Tab Shortcuts (`chrome-ctrl-w`)

A minimal, zero-permission Chrome Manifest V3 extension that replaces three popular tab-shortcut extensions whose shortcuts break across workspaces on Wayland tiling window managers (**Niri**, **Sway**, **Hyprland**):

- **More Better Ctrl-W** ([thalesmello/better-ctrlw#5](https://github.com/thalesmello/better-ctrlw/issues/5)): swallow `Ctrl+W`, close highlighted tabs (`Ctrl+Shift+W`), close other unpinned tabs
- **Duplicate Tab**: duplicate highlighted tab(s) (`Ctrl+Shift+D`)
- **Tab to Window/Popup**: move highlighted tab(s) to a new normal window (`Alt+Shift+X`) or popup window

## Commands

| Command | Default Shortcut | Description |
| :--- | :--- | :--- |
| `do-nothing` | `Ctrl+W` | Do nothing (intercept accidental `Ctrl+W`) |
| `close-highlighted-tabs` | `Ctrl+Shift+W` | Close highlighted tab(s) in the focused window |
| `duplicate-tab` | `Ctrl+Shift+D` | Duplicate highlighted tab(s) in the focused window |
| `tab-to-window` | `Alt+Shift+X` | Move highlighted tab(s) to a new normal window |
| `tab-to-popup` | *(Unassigned)* | Move active tab to a new popup window |
| `close-other-tabs` | *(Unassigned)* | Close other unpinned tabs in the focused window |

All shortcuts can be customized at `chrome://extensions/shortcuts` (keep Scope set to **In Chrome**).

## Why Other Extensions Break on Wayland (Especially Niri)

Extensions like *More Better Ctrl-W*, *Duplicate Tab*, and *Tab to Window/Popup* listen to `chrome.commands.onCommand.addListener((command) => ...)` **ignoring the second parameter `tab`**, and instead query `chrome.tabs.query({ currentWindow: true })`, `chrome.tabs.query({ lastFocusedWindow: true })`, or `chrome.windows.getCurrent()` from a Manifest V3 background service worker.

Inside a background service worker (which has no window context of its own), both `currentWindow: true` and `lastFocusedWindow: true` fall back to Chromium's internal `BrowserList::GetInstance()->GetLastActive()`.

Under native Wayland (`--ozone-platform=wayland`), Chromium's `WaylandToplevelWindow::HandleToplevelConfigure` drives window activation (`OnActivationChanged` -> `BrowserList::SetLastActive`) from the `xdg_toplevel` `Activated` state rather than actual `wl_keyboard` focus. Compositors like **Niri** intentionally keep the `Activated` state on the active window of unfocused workspaces (to avoid visual border flashing during workspace animations). When you switch workspaces back to an already-`Activated` Chrome window, `did_active_change` is `false`, so Chromium never calls `BrowserList::SetLastActive()` for that window—causing `currentWindow: true` / `lastFocusedWindow: true` to act on a Chrome window on another workspace!

Meanwhile, when an **In Chrome** shortcut is pressed, Chrome's per-window `ExtensionKeybindingRegistryViews` intercepts the `wl_keyboard` event on the focused window's `FocusManager` and passes that exact window's active `Tab` as the second argument `(command, tab)` to `chrome.commands.onCommand`.

This extension always uses `tab.windowId` directly:

```javascript
chrome.commands.onCommand.addListener(async (command, tab) => {
  const tabs = await chrome.tabs.query({
    highlighted: true,
    windowId: tab.windowId,
  });
  // ...
});
```

### Optional Niri Compositor Workaround

In Niri ($\ge$ 25.08), you can also add the following to `~/.config/niri/config.kdl` to force Niri to drop the `Activated` state on unfocused workspaces (which also fixes Chromium/Electron web notification suppression and IME popup placement across workspaces):

```kdl
debug {
    deactivate-unfocused-windows
}
```

## Installation (Unpacked)

1. Clone this repository:
   ```sh
   git clone https://github.com/Xadeck/chrome-ctrl-w.git
   ```
2. Open `chrome://extensions` in Google Chrome.
3. Enable **Developer mode** (top-right toggle).
4. Remove or disable *More Better Ctrl-W*, *Duplicate Tab*, and *Tab to Window/Popup*.
5. Click **Load unpacked** and select the cloned `chrome-ctrl-w` directory (or click the **Reload** button on the extension card if already loaded).
6. Visit `chrome://extensions/shortcuts` and verify your desired keybindings (with Scope set to **In Chrome**).
7. (Optional) In `chrome://extensions` -> **Details**, enable **Allow in Incognito**.

## Packaging for Chrome Web Store

To build a `.zip` archive ready for uploading to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole):

```sh
zip -r chrome-ctrl-w.zip manifest.json background.js icons/ LICENSE README.md
```
