import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MenuList from "./MenuList";
import Config from "../../Configuration";

vi.mock("../../Configuration", () => ({
  default: {
    getAxiosInstance: vi.fn(),
    getCurrentUserName: vi.fn(),
    getTeamName: vi.fn(),
    getBaseUrl: vi.fn(),
  },
}));

vi.mock("./CreateItemForm", () => ({
  default: function CreateItemFormMock(props) {
    return <div data-testid="create-item-form">{props.itemName}</div>;
  },
}));

describe("MenuList", () => {
  const getMock = vi.fn();
  const postMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Config.getAxiosInstance.mockReturnValue({
      get: getMock,
      post: postMock,
    });
    Config.getCurrentUserName.mockReturnValue("demo_lead");
    Config.getTeamName.mockReturnValue("aurora");
    Config.getBaseUrl.mockReturnValue("http://localhost:8081/");
  });

  it("sorts sprint names newest-first by default and toggles to oldest-first", async () => {
    const user = userEvent.setup();

    getMock.mockImplementation((url) => {
      if (url === "/getSprints") {
        return Promise.resolve({
          data: ["Sprint 2", "Sprint 10", "Sprint 1"],
        });
      }

      if (url === "getTeamConfiguration") {
        return Promise.resolve({
          data: {
            jira: { enabled: false },
          },
        });
      }

      throw new Error(`Unexpected GET ${url}`);
    });

    render(
      <MenuList
        itemName="sprint"
        createNewItemQuery="/createSprint"
        getItemsQuery="/getSprints"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Sprint 10")).toBeInTheDocument();
    });

    const sprintLinks = () => screen.getAllByRole("link").map((link) => link.textContent);

    expect(sprintLinks()).toEqual([
      expect.stringContaining("Sprint 10"),
      expect.stringContaining("Sprint 2"),
      expect.stringContaining("Sprint 1"),
    ]);

    await user.click(screen.getByRole("button", { name: /newest first/i }));

    expect(sprintLinks()).toEqual([
      expect.stringContaining("Sprint 1"),
      expect.stringContaining("Sprint 2"),
      expect.stringContaining("Sprint 10"),
    ]);
    expect(screen.getByRole("button", { name: /oldest first/i })).toBeInTheDocument();
  });

  it("hides sprint creation and deletion for Jira-synced sprint lists", async () => {
    getMock.mockImplementation((url) => {
      if (url === "/getSprints") {
        return Promise.resolve({
          data: ["Sprint 21", "Sprint 22"],
        });
      }

      if (url === "getTeamConfiguration") {
        return Promise.resolve({
          data: {
            jira: { enabled: true },
          },
        });
      }

      throw new Error(`Unexpected GET ${url}`);
    });

    render(
      <MenuList
        itemName="sprint"
        createNewItemQuery="/createSprint"
        getItemsQuery="/getSprints"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/sprints are synced from jira/i)).toBeInTheDocument();
    });

    expect(screen.queryByTestId("create-item-form")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("link").every((link) => link.textContent.includes("Synced from Jira"))
    ).toBe(true);
  });
});
