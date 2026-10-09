// When a shortcut with "In Chrome" scope is pressed inside a browser window,
// Chrome's per-window ExtensionKeybindingRegistryViews intercepts the key event
// on that window's FocusManager and passes the active `tab` of THAT exact
// window as the second argument `(command, tab)`.
//
// Relying on `currentWindow: true` or `lastFocusedWindow: true` inside a
// Manifest V3 service worker falls back to Chromium's internal
// `BrowserList::GetLastActive()`, which frequently gets out of sync with
// Wayland keyboard focus across workspaces (e.g. under Niri, Sway, Hyprland).

async function getTargetTabs(tab, queryProps = { highlighted: true }) {
  if (
    tab &&
    tab.windowId !== undefined &&
    tab.windowId !== chrome.windows.WINDOW_ID_NONE
  ) {
    const tabs = await chrome.tabs.query({
      ...queryProps,
      windowId: tab.windowId,
    });
    if (tabs.length > 0) {
      return tabs;
    }
  }
  if (tab && tab.id !== undefined) {
    return [tab];
  }
  return chrome.tabs.query({ ...queryProps, lastFocusedWindow: true });
}

async function moveTabsToNewWindow(tab, windowType) {
  const tabs = await getTargetTabs(tab, { highlighted: true });
  if (tabs.length === 0) {
    return;
  }

  const activeTab = tabs.find((t) => t.active) ?? tabs[0];
  if (activeTab.id === undefined) {
    return;
  }

  const newWin = await chrome.windows.create({
    tabId: activeTab.id,
    type: windowType,
    focused: true,
  });

  if (!newWin || newWin.id === undefined) {
    return;
  }

  const otherTabIds = tabs
    .filter((t) => t.id !== activeTab.id && t.id !== undefined)
    .map((t) => t.id);

  if (otherTabIds.length > 0 && windowType === "normal") {
    await chrome.tabs.move(otherTabIds, { windowId: newWin.id, index: -1 });
    for (const id of otherTabIds) {
      await chrome.tabs.update(id, { highlighted: true });
    }
  }
}

chrome.commands.onCommand.addListener(async (command, tab) => {
  switch (command) {
    case "do-nothing":
      return;

    case "close-highlighted-tabs": {
      const tabs = await getTargetTabs(tab, { highlighted: true });
      const ids = tabs.map((t) => t.id).filter((id) => id !== undefined);
      if (ids.length > 0) {
        await chrome.tabs.remove(ids);
      }
      break;
    }

    case "duplicate-tab": {
      const tabs = await getTargetTabs(tab, { highlighted: true });
      for (const t of tabs) {
        if (t.id !== undefined) {
          await chrome.tabs.duplicate(t.id);
        }
      }
      break;
    }

    case "tab-to-window": {
      await moveTabsToNewWindow(tab, "normal");
      break;
    }

    case "tab-to-popup": {
      await moveTabsToNewWindow(tab, "popup");
      break;
    }

    case "close-other-tabs": {
      if (!tab || tab.windowId === undefined) {
        return;
      }
      const tabs = await chrome.tabs.query({
        active: false,
        highlighted: false,
        pinned: false,
        windowId: tab.windowId,
      });
      const ids = tabs.map((t) => t.id).filter((id) => id !== undefined);
      if (ids.length > 0) {
        await chrome.tabs.remove(ids);
      }
      break;
    }

    default:
      break;
  }
});
