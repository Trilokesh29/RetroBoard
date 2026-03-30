import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import CreateItemForm from "./CreateItemForm";
import Configuration from "../../Configuration";

vi.mock("../../Configuration", () => ({
  default: {
    isDemoMode: vi.fn(),
    isDemoJiraBridgeEnabled: vi.fn(),
    getTeamName: vi.fn(),
  },
}));

describe("CreateItemForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Configuration.isDemoMode.mockReturnValue(false);
    Configuration.isDemoJiraBridgeEnabled.mockReturnValue(false);
    Configuration.getTeamName.mockReturnValue("aurora");
  });

  it("allows mocked demo Jira team creation with only a valid board URL", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    Configuration.isDemoMode.mockReturnValue(true);
    Configuration.isDemoJiraBridgeEnabled.mockReturnValue(false);

    render(<CreateItemForm itemName="team" onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: /create new team/i }));
    await user.type(screen.getByLabelText(/team name/i), "Aurora");
    await user.click(screen.getByLabelText(/this team uses jira for sprint tracking/i));
    await user.type(
      screen.getByLabelText(/jira board url/i),
      "https://thermofisher-asg.atlassian.net/jira/software/c/projects/XENON/boards/1393"
    );

    const submitButton = screen.getByRole("button", { name: /add team/i });
    expect(submitButton).toBeEnabled();

    await user.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        team: "Aurora",
        integration: {
          jira: {
            enabled: true,
            boardUrl: "https://thermofisher-asg.atlassian.net/jira/software/c/projects/XENON/boards/1393",
            userName: "",
            apiToken: "",
          },
        },
      });
    });
  });

  it("requires Jira credentials when the live demo bridge is enabled", async () => {
    const user = userEvent.setup();

    Configuration.isDemoMode.mockReturnValue(true);
    Configuration.isDemoJiraBridgeEnabled.mockReturnValue(true);

    render(<CreateItemForm itemName="team" onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /create new team/i }));
    await user.type(screen.getByLabelText(/team name/i), "Aurora");
    await user.click(screen.getByLabelText(/this team uses jira for sprint tracking/i));
    await user.type(
      screen.getByLabelText(/jira board url/i),
      "https://thermofisher-asg.atlassian.net/jira/software/c/projects/XENON/boards/1393"
    );

    expect(screen.getByText(/demo jira bridge is active/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/jira email \/ username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/jira api token \/ pat/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add team/i })).toBeDisabled();

    await user.type(screen.getByLabelText(/jira email \/ username/i), "jira@example.com");
    await user.type(screen.getByLabelText(/jira api token \/ pat/i), "secret-token");

    expect(screen.getByRole("button", { name: /add team/i })).toBeEnabled();
  });
});
