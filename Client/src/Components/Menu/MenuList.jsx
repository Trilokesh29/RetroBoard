import React, { useCallback, useEffect, useMemo, useState } from "react";
import FormControl from "react-bootstrap/FormControl";
import Button from "react-bootstrap/Button";
import Config from "../../Configuration";
import CreateItemForm from "./CreateItemForm";

const sprintNameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function compareSprintNames(left, right) {
  return sprintNameCollator.compare(String(left || ""), String(right || ""));
}

function MenuList({ createNewItemQuery, getItemsQuery, itemName }) {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [teamConfiguration, setTeamConfiguration] = useState(null);
  const [sprintSortDirection, setSprintSortDirection] = useState("desc");

  const isSprintList = itemName === "sprint";
  const isJiraTeam = Boolean(teamConfiguration?.jira?.enabled);

  const updateList = useCallback(async () => {
    const params =
      getItemsQuery === "/getSprints"
        ? {
            userName: Config.getCurrentUserName(),
            team: Config.getTeamName(),
          }
        : {
            userName: Config.getCurrentUserName(),
          };

    const response = await Config.getAxiosInstance().get(getItemsQuery, { params });
    setItems(Array.isArray(response.data) ? response.data : []);
  }, [getItemsQuery]);

  const updateTeamConfiguration = useCallback(async () => {
    if (!isSprintList || !Config.getTeamName()) {
      setTeamConfiguration(null);
      return;
    }

    const response = await Config.getAxiosInstance().get("getTeamConfiguration", {
      params: {
        userName: Config.getCurrentUserName(),
        team: Config.getTeamName(),
      },
    });

    setTeamConfiguration(response.data);
  }, [isSprintList]);

  useEffect(() => {
    updateList();
    updateTeamConfiguration();
  }, [updateList, updateTeamConfiguration]);

  async function handleSubmit(payload) {
    try {
      await Config.getAxiosInstance().post(createNewItemQuery, {
        ...payload,
        userName: Config.getCurrentUserName(),
      });
      await updateList();
      await updateTeamConfiguration();
    } catch (error) {
      const message =
        error.response && typeof error.response.data === "string"
          ? error.response.data
          : `We couldn't create that ${itemName} right now.`;

      alert(message);
      throw error;
    }
  }

  async function handleDelete(event, entry) {
    event.preventDefault();
    event.stopPropagation();

    const resourceLabel = itemName === "team" ? "team" : "sprint";
    const team = itemName === "team" ? entry : Config.getTeamName();
    const sprint = itemName === "sprint" ? entry : undefined;

    if (!window.confirm(`Delete this ${resourceLabel}: ${entry}?`)) {
      return;
    }

    try {
      await Config.getAxiosInstance().post(itemName === "team" ? "/deleteTeam" : "/deleteSprint", {
        userName: Config.getCurrentUserName(),
        team,
        sprint,
      });

      if (itemName === "team" && window.location.pathname.startsWith(`/team/${entry}`)) {
        window.location.assign("/");
        return;
      }

      if (itemName === "sprint" && window.location.pathname.includes(`/sprint/${entry}`)) {
        window.location.assign(`${Config.getBaseUrl()}team/${Config.getTeamName()}`);
        return;
      }

      await updateList();
    } catch (error) {
      const message =
        error.response && typeof error.response.data === "string"
          ? error.response.data
          : `We couldn't delete that ${resourceLabel} right now.`;

      alert(message);
    }
  }

  const filteredItems = useMemo(() => {
    const nextItems = !query.trim()
      ? [...items]
      : items.filter((entry) => entry.toLowerCase().includes(query.trim().toLowerCase()));

    if (isSprintList) {
      nextItems.sort((left, right) =>
        sprintSortDirection === "desc"
          ? compareSprintNames(right, left)
          : compareSprintNames(left, right)
      );
    }

    return nextItems;
  }, [isSprintList, items, query, sprintSortDirection]);

  const heading = itemName === "team" ? "Teams" : "Sprints";
  const caption =
    itemName === "team"
      ? "Choose a team workspace or create a new one."
      : isJiraTeam
        ? `Sprints are synced from Jira for ${Config.getTeamName()}.`
        : `Navigate the sprint history for ${Config.getTeamName()}.`;

  return (
    <>
      <div className="section-heading">
        <div>
          <h3>{heading}</h3>
          <p className="section-caption">{caption}</p>
        </div>
        {isSprintList ? (
          <Button
            variant="outline-secondary"
            size="sm"
            className="sidebar-sort-toggle"
            onClick={() =>
              setSprintSortDirection((currentDirection) =>
                currentDirection === "desc" ? "asc" : "desc"
              )
            }
          >
            {sprintSortDirection === "desc" ? "Newest first" : "Oldest first"}
          </Button>
        ) : null}
      </div>

      <FormControl
        className="sidebar-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={`Search ${heading.toLowerCase()}...`}
        style={{ marginBottom: 16 }}
      />

      <div className="sidebar-list">
        {filteredItems.length ? (
          filteredItems.map((entry) => {
            const href =
              itemName === "team"
                ? `${Config.getBaseUrl()}team/${entry}`
                : `${Config.getBaseUrl()}team/${Config.getTeamName()}/sprint/${entry}`;
            const showDelete = itemName === "team" || !isJiraTeam;

            return (
              <a key={entry} className="sidebar-link" href={href}>
                <span>{entry}</span>
                <div className="sidebar-actions">
                  <small>{itemName === "team" ? "Open workspace" : isJiraTeam ? "Synced from Jira" : "Open board"}</small>
                  {showDelete ? (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={(event) => handleDelete(event, entry)}
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
              </a>
            );
          })
        ) : (
          <div className="menu-empty">
            No {heading.toLowerCase()} matched your search yet.
          </div>
        )}
      </div>

      {isJiraTeam && isSprintList ? null : (
        <div style={{ marginTop: 18 }}>
          <CreateItemForm
            onSubmit={handleSubmit}
            itemName={itemName}
            createNewItemQuery={createNewItemQuery}
            updateList={updateList}
          />
        </div>
      )}
    </>
  );
}

export default MenuList;
