'use client';

const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed';

export function getInitialSidebarState(): boolean {
  if (typeof window === 'undefined') {
    return false; // Default: expanded
  }

  try {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored === null) {
      return false; // Default: expanded
    }
    return stored === 'true';
  } catch (error) {
    return false; // Default: expanded
  }
}

export function saveSidebarState(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed.toString());
  } catch (error) {
  }
}

