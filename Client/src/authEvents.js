export const AUTH_EXPIRED_EVENT = "retroboard:auth-expired";
export const VOTES_UPDATED_EVENT = "retroboard:votes-updated";

export function dispatchAuthExpired() {
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
}

export function dispatchVotesUpdated() {
  window.dispatchEvent(new CustomEvent(VOTES_UPDATED_EVENT));
}
