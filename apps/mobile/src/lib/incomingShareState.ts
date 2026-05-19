import type { IncomingShare } from "./shareIntent";

import { atom } from "nanostores";

export const $incomingShare = atom<IncomingShare | null>(null);
