chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== "close-highlighted-tabs") {
    return;
  }

  // When a shortcut is pressed inside a browser window, Chrome's per-window
  // ExtensionKeybindingRegistryViews passes the active `tab` of THAT exact
  // window as the second argument.
  //
  // Relying on `currentWindow: true` inside a Manifest V3 service worker falls
  // back to Chromium's internal `BrowserList::GetLastActive()`, which gets out
  // of sync with Wayland keyboard focus across workspaces (e.g. under Niri).
  if (
    tab &&
    tab.windowId !== undefined &&
    tab.windowId !== chrome.windows.WINDOW_ID_NONE
  ) {
    chrome.tabs.query(
      { highlighted: true, windowId: tab.windowId },
      (tabs) => {
        const ids = tabs.map((t) => t.id).filter((id) => id !== undefined);
        if (ids.length > 0) {
          chrome.tabs.remove(ids);
        } else if (tab.id !== undefined) {
          chrome.tabs.remove(tab.id);
        }
      }
    );
  } else if (tab && tab.id !== undefined) {
    chrome.tabs.remove(tab.id);
  } else {
    chrome.tabs.query({ highlighted: true, lastFocusedWindow: true }, (tabs) => {
      const ids = tabs.map((t) => t.id).filter((id) => id !== undefined);
      if (ids.length > 0) {
        chrome.tabs.remove(ids);
      }
    });
  }
});
