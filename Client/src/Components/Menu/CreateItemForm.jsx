import React, { useMemo, useState } from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import InputGroup from "react-bootstrap/InputGroup";
import FormControl from "react-bootstrap/FormControl";
import Configuration from "../../Configuration";

const initialJiraState = {
  enabled: false,
  boardUrl: "",
  userName: "",
  apiToken: "",
};

function parseJiraBoardUrl(boardUrl) {
  if (!boardUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(String(boardUrl).trim());
    const match =
      parsedUrl.pathname.match(/\/jira\/software\/c\/projects\/([^/]+)\/boards\/(\d+)/i) ||
      parsedUrl.pathname.match(/\/boards\/(\d+)/i);

    if (!match) {
      return null;
    }

    return {
      baseUrl: `${parsedUrl.protocol}//${parsedUrl.host}`,
      projectKey: match[2] ? String(match[1] || "").toUpperCase() : "",
      boardId: match[2] || match[1],
    };
  } catch (error) {
    return null;
  }
}

function CreateItemForm(props) {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [jiraConfig, setJiraConfig] = useState(initialJiraState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isTeamSetup = props.itemName === "team";
  const isDemoMode = Configuration.isDemoMode();
  const isLiveJiraDemoMode = Configuration.isDemoJiraBridgeEnabled();
  const parsedBoard = useMemo(() => parseJiraBoardUrl(jiraConfig.boardUrl), [jiraConfig.boardUrl]);

  const canSubmit = useMemo(() => {
    if (!name.trim()) {
      return false;
    }

    if (!isTeamSetup || !jiraConfig.enabled) {
      return true;
    }

    if (!parsedBoard) {
      return false;
    }

    if (isDemoMode && !isLiveJiraDemoMode) {
      return true;
    }

    return jiraConfig.userName.trim() && jiraConfig.apiToken.trim();
  }, [isDemoMode, isLiveJiraDemoMode, isTeamSetup, jiraConfig, name, parsedBoard]);

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    setShow(false);
    setName("");
    setJiraConfig(initialJiraState);
    setIsSubmitting(false);
  }

  function updateJiraConfig(patch) {
    setJiraConfig((currentConfig) => ({
      ...currentConfig,
      ...patch,
    }));
  }

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    const payload =
      props.itemName === "sprint"
        ? {
            team: Configuration.getTeamName(),
            sprint: name.trim(),
          }
        : {
            team: name.trim(),
            integration: {
              jira: {
                enabled: jiraConfig.enabled,
                boardUrl: jiraConfig.enabled ? jiraConfig.boardUrl.trim() : "",
                userName: jiraConfig.enabled ? jiraConfig.userName.trim() : "",
                apiToken: jiraConfig.enabled ? jiraConfig.apiToken : "",
              },
            },
          };

    setIsSubmitting(true);

    try {
      await props.onSubmit(payload);
      setShow(false);
      setName("");
      setJiraConfig(initialJiraState);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="primary" onClick={() => setShow(true)} className="w-100">
        Create new {props.itemName}
      </Button>

      <Modal size="lg" show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Create new {props.itemName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <InputGroup>
            <InputGroup.Text>{props.itemName} name</InputGroup.Text>
            <FormControl
              placeholder={`Name your ${props.itemName}`}
              aria-label={`${props.itemName} name`}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </InputGroup>

          {isTeamSetup ? (
            <div className="team-setup-panel">
              <Form.Check
                type="switch"
                id="team-uses-jira"
                label="This team uses Jira for sprint tracking"
                checked={jiraConfig.enabled}
                onChange={(event) => updateJiraConfig({ enabled: event.target.checked })}
              />

              {isDemoMode ? (
                <p className="section-caption" style={{ marginTop: 12 }}>
                  {isLiveJiraDemoMode
                    ? "Demo Jira bridge is active. New Jira teams will validate the board and pull real sprint data from Jira through your local bridge."
                    : "Demo mode uses a mocked Jira connection so you can test the setup and sync flow safely."}
                </p>
              ) : null}

              {jiraConfig.enabled ? (
                <div className="team-setup-grid">
                  <Form.Group controlId="jiraBoardUrl">
                    <Form.Label>Jira board URL</Form.Label>
                    <Form.Control
                      placeholder="https://thermofisher-asg.atlassian.net/jira/software/c/projects/XENON/boards/1393"
                      value={jiraConfig.boardUrl}
                      onChange={(event) => updateJiraConfig({ boardUrl: event.target.value })}
                      isInvalid={jiraConfig.boardUrl !== "" && !parsedBoard}
                    />
                    <Form.Text className="text-muted">
                      Paste the Jira board link and RetroBoard will extract the project and board details.
                    </Form.Text>
                  </Form.Group>

                  {parsedBoard ? (
                    <div className="menu-empty" style={{ textAlign: "left" }}>
                      <strong>Detected board</strong>
                      <div>{parsedBoard.baseUrl}</div>
                      <div>Project: {parsedBoard.projectKey || "Unknown"}</div>
                      <div>Board: {parsedBoard.boardId}</div>
                    </div>
                  ) : jiraConfig.boardUrl ? (
                    <div className="menu-empty" style={{ textAlign: "left" }}>
                      Paste a Jira board URL in the format `/jira/software/c/projects/KEY/boards/1234`.
                    </div>
                  ) : null}

                  {isDemoMode && !isLiveJiraDemoMode ? null : (
                    <>
                      <Form.Group controlId="jiraUserName">
                        <Form.Label>Jira email / username</Form.Label>
                        <Form.Control
                          placeholder="name@company.com"
                          value={jiraConfig.userName}
                          onChange={(event) => updateJiraConfig({ userName: event.target.value })}
                        />
                      </Form.Group>

                      <Form.Group controlId="jiraApiToken">
                        <Form.Label>Jira API token / PAT</Form.Label>
                        <Form.Control
                          type="password"
                          placeholder={isLiveJiraDemoMode ? "Used locally by the demo bridge only" : "Paste a Jira access token"}
                          value={jiraConfig.apiToken}
                          onChange={(event) => updateJiraConfig({ apiToken: event.target.value })}
                        />
                      </Form.Group>
                    </>
                  )}
                </div>
              ) : (
                <p className="section-caption" style={{ marginTop: 12 }}>
                  Teams without Jira will continue using the manual sprint velocity inputs.
                </p>
              )}
            </div>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? "Adding..." : `Add ${props.itemName}`}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default CreateItemForm;
