import React, { useEffect, useMemo, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import FormControl from "react-bootstrap/FormControl";
import Row from "react-bootstrap/Row";

import Config from "../Configuration";

const numericRegexp = /^[0-9]+$/;
const emptyVelocity = {
  spPlanned: "",
  spBurnt: "",
  bbAccuracy: "",
  pi: "",
  source: "manual",
  syncedAt: "",
};

function Velocity() {
  const teamName = Config.getTeamName();
  const sprintName = Config.getSprintName();
  const [velocity, setVelocity] = useState(emptyVelocity);
  const [teamConfiguration, setTeamConfiguration] = useState(null);
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const isJiraTeam = Boolean(teamConfiguration?.jira?.enabled);
  const isManualSubmitEnabled = useMemo(() => {
    return (
      numericRegexp.test(velocity.spBurnt) &&
      numericRegexp.test(velocity.spPlanned) &&
      numericRegexp.test(velocity.bbAccuracy) &&
      velocity.pi !== "" &&
      parseInt(velocity.pi, 10) > 0
    );
  }, [velocity]);

  async function loadTeamConfiguration() {
    const response = await Config.getAxiosInstance().get("getTeamConfiguration", {
      params: {
        userName: Config.getCurrentUserName(),
        team: teamName,
      },
    });

    setTeamConfiguration(response.data);
    return response.data;
  }

  async function loadVelocity(nextTeamConfiguration) {
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await Config.getAxiosInstance().get("getVelocityForSprint", {
        params: {
          userName: Config.getCurrentUserName(),
          team: teamName,
          sprint: sprintName,
        },
      });

      if (response.data.length !== 0) {
        setVelocity({
          spPlanned: response.data[0].spPlanned || "",
          spBurnt: response.data[0].spBurnt || "",
          pi: response.data[0].pi || "",
          bbAccuracy: response.data[0].bbAccuracy || "",
          source: response.data[0].source || (nextTeamConfiguration?.jira?.enabled ? "jira" : "manual"),
          syncedAt: response.data[0].syncedAt || "",
        });
      } else {
        setVelocity(emptyVelocity);
      }

      setStatus("ready");
    } catch (error) {
      setVelocity(emptyVelocity);
      setStatus("error");
      setErrorMessage(
        nextTeamConfiguration?.jira?.enabled
          ? "We couldn't sync sprint metrics from Jira right now."
          : "We couldn't load the stored sprint velocity."
      );
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function hydrateVelocityPanel() {
      try {
        const nextTeamConfiguration = await loadTeamConfiguration();
        if (!isMounted) {
          return;
        }
        await loadVelocity(nextTeamConfiguration);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setStatus("error");
        setErrorMessage("We couldn't load the team setup right now.");
      }
    }

    hydrateVelocityPanel();

    return () => {
      isMounted = false;
    };
  }, [teamName, sprintName]);

  function updateField(fieldName, fieldValue) {
    setVelocity((currentVelocity) => ({
      ...currentVelocity,
      [fieldName]: fieldValue,
    }));
  }

  async function submitVelocity() {
    if (!isManualSubmitEnabled) {
      return;
    }

    setStatus("saving");
    setErrorMessage("");

    try {
      await Config.getAxiosInstance().post("setVelocity", {
        userName: Config.getCurrentUserName(),
        team: teamName,
        sprint: sprintName,
        spPlanned: velocity.spPlanned,
        spBurnt: velocity.spBurnt,
        pi: velocity.pi,
        bbAccuracy: velocity.bbAccuracy,
      });

      setStatus("ready");
      alert("Submitted successfully.");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error.response && typeof error.response.data === "string"
          ? error.response.data
          : "Error in submitting sprint velocity. Retry."
      );
    }
  }

  async function syncFromJira() {
    await loadVelocity(teamConfiguration);
  }

  return (
    <Container fluid>
      <Card border="light">
        <Card.Header>Velocity</Card.Header>
        <Card.Body>
          {isJiraTeam ? (
            <Alert variant="info">
              This team is connected to Jira. Sprint story points and velocity are synced automatically.
            </Alert>
          ) : (
            <Alert variant="light">
              This team uses manual sprint metrics. Enter the velocity details below as before.
            </Alert>
          )}

          {errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}

          <Row>
            <Col style={{ paddingLeft: "0", paddingRight: "0" }}>
              <Alert key="light" variant="light" style={{ paddingLeft: "0", paddingRight: "0" }}>
                PI:
              </Alert>
            </Col>
            <Col>
              <FormControl
                value={velocity.pi}
                name="pi"
                onChange={(event) => updateField("pi", event.target.value)}
                type="text"
                readOnly={isJiraTeam}
                isInvalid={velocity.pi === "" ? false : !numericRegexp.test(velocity.pi)}
                required
              />
            </Col>
          </Row>
          <Row>
            <Col style={{ paddingLeft: "0", paddingRight: "0" }}>
              <Alert key="light" variant="light" style={{ paddingLeft: "0", paddingRight: "0" }}>
                Story points planned:
              </Alert>
            </Col>
            <Col>
              <FormControl
                value={velocity.spPlanned}
                name="story points planned"
                onChange={(event) => updateField("spPlanned", event.target.value)}
                type="text"
                readOnly={isJiraTeam}
                isInvalid={velocity.spPlanned === "" ? false : !numericRegexp.test(velocity.spPlanned)}
                required
              />
            </Col>
          </Row>
          <Row>
            <Col style={{ paddingLeft: "0", paddingRight: "0" }}>
              <Alert key="light" variant="light" style={{ paddingLeft: "0", paddingRight: "0" }}>
                Story points burnt:
              </Alert>
            </Col>
            <Col>
              <FormControl
                value={velocity.spBurnt}
                name="story points burnt"
                onChange={(event) => updateField("spBurnt", event.target.value)}
                type="text"
                readOnly={isJiraTeam}
                isInvalid={velocity.spBurnt === "" ? false : !numericRegexp.test(velocity.spBurnt)}
                required
              />
            </Col>
          </Row>
          <Row>
            <Col style={{ paddingLeft: "0", paddingRight: "0" }}>
              <Alert key="light" variant="light" style={{ paddingLeft: "0", paddingRight: "0" }}>
                Bugbuffer accuracy:
              </Alert>
            </Col>
            <Col>
              <FormControl
                value={velocity.bbAccuracy}
                name="Bugbuffer Accuracy"
                onChange={(event) => updateField("bbAccuracy", event.target.value)}
                type="text"
                readOnly={isJiraTeam}
                isInvalid={velocity.bbAccuracy === "" ? false : !numericRegexp.test(velocity.bbAccuracy)}
                required
              />
            </Col>
          </Row>

          {isJiraTeam ? (
            <>
              <div className="section-caption" style={{ marginBottom: 12 }}>
                Board {teamConfiguration?.jira?.boardId}
                {teamConfiguration?.jira?.projectKey ? ` / ${teamConfiguration.jira.projectKey}` : ""}
                {velocity.syncedAt ? ` | last synced ${new Date(velocity.syncedAt).toLocaleString()}` : ""}
              </div>
              <Button variant="primary" onClick={syncFromJira} disabled={status === "loading"}>
                {status === "loading" ? "Syncing..." : "Sync from Jira"}
              </Button>
            </>
          ) : (
            <Row>
              <Button
                disabled={!isManualSubmitEnabled || status === "saving"}
                variant="primary"
                onClick={submitVelocity}
              >
                {status === "saving" ? "Saving..." : "Submit Sprint Velocity"}
              </Button>
            </Row>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Velocity;
