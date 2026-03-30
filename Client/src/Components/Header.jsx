import React, { useEffect, useState } from "react";
import Navbar from "react-bootstrap/Navbar";
import Button from "react-bootstrap/Button";
import Config from "../Configuration";
import { useAuth } from "../AuthContext";
import { VOTES_UPDATED_EVENT } from "../authEvents";
import { resetDemoState } from "../demo/demoApi";

const teamNameToIgnore = "http:";

function Header() {
  const { user, logout } = useAuth();
  const [totalVote, setTotalVote] = useState("");

  useEffect(() => {
    async function updateVoteCountForSprint() {
      if (!user || !Config.isBoardRoute() || Config.getTeamName() === teamNameToIgnore) {
        setTotalVote("");
        return;
      }

      try {
        const result = await Config.getAxiosInstance().get("checkIfVotingAllowed", {
          params: {
            userName: Config.getCurrentUserName(),
            team: Config.getTeamName(),
            sprint: Config.getSprintName(),
          },
        });

        setTotalVote(result.data[1]);
      } catch (error) {
        setTotalVote("");
      }
    }

    function handleVoteUpdate() {
      updateVoteCountForSprint();
    }

    updateVoteCountForSprint();
    window.addEventListener(VOTES_UPDATED_EVENT, handleVoteUpdate);

    return () => {
      window.removeEventListener(VOTES_UPDATED_EVENT, handleVoteUpdate);
    };
  }, [user]);

  async function handleDemoReset() {
    if (!window.confirm("Reset the demo workspace back to the seeded sample state?")) {
      return;
    }

    resetDemoState();
    await logout();
    window.location.assign("/");
  }

  return (
    <Navbar className="app-navbar" expand="lg">
      <Navbar.Brand href="/">
        <span className="brand-mark">RB</span>
        <span className="brand-copy">
          <span className="brand-title">RetroBoard</span>
          <span className="brand-subtitle">Sharper retros for modern teams</span>
        </span>
      </Navbar.Brand>
      <Navbar.Collapse className="justify-content-end">
        {Config.isDemoMode() ? (
          <>
            <div className="nav-user-chip">
              {Config.isDemoJiraBridgeEnabled() ? "Demo + Jira bridge" : "Demo mode"}
            </div>
            <Button variant="link" onClick={handleDemoReset}>
              Reset demo
            </Button>
          </>
        ) : null}
        {user ? (
          <>
            {Config.isBoardRoute() && totalVote !== "" ? (
              <div className="nav-vote-chip">Vote count {totalVote}</div>
            ) : null}
            <div className="nav-user-chip">{user.userName}</div>
            <Button variant="link" onClick={logout}>
              Log out
            </Button>
          </>
        ) : (
          <div className="nav-user-chip">Private workspace</div>
        )}
      </Navbar.Collapse>
    </Navbar>
  );
}

export default Header;
