import { atom } from 'nanostores'

/**
 * Set to true if the server returned HTTP 470 (corrupt key file).
 * The app should navigate to login and prompt the user to re-register their device.
 */
export const $keyReplaced = atom<boolean>(false)
