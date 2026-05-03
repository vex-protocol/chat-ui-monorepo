import { atom } from "nanostores";

// Global drawer coordination: only one side drawer should be open at a time.
export const $leftSidebarOpen = atom(false);
export const $rightSidebarOpen = atom(false);
