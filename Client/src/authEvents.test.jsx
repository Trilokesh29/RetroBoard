import { describe, expect, it, vi } from "vitest";

import {
  AUTH_EXPIRED_EVENT,
  VOTES_UPDATED_EVENT,
  dispatchAuthExpired,
  dispatchVotesUpdated,
} from "./authEvents";

describe("authEvents", () => {
  it("dispatches the auth expired event", () => {
    const listener = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, listener);

    dispatchAuthExpired();

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(AUTH_EXPIRED_EVENT, listener);
  });

  it("dispatches the votes updated event", () => {
    const listener = vi.fn();
    window.addEventListener(VOTES_UPDATED_EVENT, listener);

    dispatchVotesUpdated();

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(VOTES_UPDATED_EVENT, listener);
  });
});
