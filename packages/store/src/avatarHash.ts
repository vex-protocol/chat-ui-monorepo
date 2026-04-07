import { atom } from "nanostores";

/**
 * Incremented after a successful avatar upload to bust <img> caches.
 * Set to Date.now() after upload; Avatar components append ?v={$avatarHash} to the URL.
 */
export const $avatarHash = atom<number>(0);
