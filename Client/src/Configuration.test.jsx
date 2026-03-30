import { beforeEach, describe, expect, it } from "vitest";

import Configuration from "./Configuration";

describe("Configuration", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("derives team and sprint names from the current route", () => {
    window.history.replaceState({}, "", "/team/aurora/sprint/sprint_24");

    expect(Configuration.getTeamName()).toBe("aurora");
    expect(Configuration.getSprintName()).toBe("sprint_24");
    expect(Configuration.isBoardRoute()).toBe(true);
  });

  it("caches and clears the current user safely", () => {
    Configuration.cacheCurrentUser({
      userName: "demo_lead",
      emailId: "demo@example.com",
    });

    expect(Configuration.getCachedUser()).toEqual({
      userName: "demo_lead",
      emailId: "demo@example.com",
    });
    expect(Configuration.getCurrentUserName()).toBe("demo_lead");

    Configuration.clearCachedUser();

    expect(Configuration.getCachedUser()).toBeNull();
    expect(Configuration.getCurrentUserName()).toBe("");
  });

  it("clears invalid cached user payloads", () => {
    window.localStorage.setItem("retroboard_user", "{not-json");
    window.localStorage.setItem("userName", "demo_lead");

    expect(Configuration.getCachedUser()).toBeNull();
    expect(window.localStorage.getItem("retroboard_user")).toBeNull();
    expect(window.localStorage.getItem("userName")).toBeNull();
  });
});
