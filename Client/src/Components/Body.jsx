import React, { useEffect, useMemo, useRef, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import ToggleButtonGroup from "react-bootstrap/ToggleButtonGroup";
import ToggleButton from "react-bootstrap/ToggleButton";

import Config from "../Configuration";
import { retroTemplates, findTemplateForSettings } from "../retroTemplates";
import Board from "./Board";
import BoardToolbar from "./BoardToolbar";
import Chart from "./Chart";
import { GeneratePDF } from "./PDFDocument";
import Happiness from "./Happiness";
import Menu from "./Menu/Menu";
import RetroInsights from "./RetroInsights";
import TopVoted from "./TopVoted";
import Velocity from "./Velocity";

const teamNameToIgnore = "http:";
const defaultFilters = {
  query: "",
  scope: "all",
  column: "all",
  actionOnly: false,
};

function Body() {
  const boardRef = useRef();
  const validBoard = Config.isBoardRoute();
  const teamName = Config.getTeamName();
  const [filters, setFilters] = useState(defaultFilters);
  const [boardSnapshot, setBoardSnapshot] = useState({ items: [], settings: null });
  const [selectedTemplateId, setSelectedTemplateId] = useState(retroTemplates[0].id);
  const [teamSprints, setTeamSprints] = useState([]);

  useEffect(() => {
    let isMounted = true;

    async function loadTeamSprints() {
      if (validBoard || teamName === teamNameToIgnore || !teamName) {
        if (isMounted) {
          setTeamSprints([]);
        }
        return;
      }

      try {
        const result = await Config.getAxiosInstance().get("getSprints", {
          params: {
            userName: Config.getCurrentUserName(),
            team: teamName,
          },
        });

        if (isMounted) {
          setTeamSprints(Array.isArray(result.data) ? result.data : []);
        }
      } catch (error) {
        if (isMounted) {
          setTeamSprints([]);
        }
      }
    }

    loadTeamSprints();

    return () => {
      isMounted = false;
    };
  }, [teamName, validBoard]);

  function handleBoardStateChange(nextSnapshot) {
    setBoardSnapshot(nextSnapshot);
    setSelectedTemplateId(findTemplateForSettings(nextSnapshot.settings).id);
  }

  function handleFiltersChange(patch) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      ...patch,
    }));
  }

  async function handleApplyTemplate() {
    const template = retroTemplates.find((entry) => entry.id === selectedTemplateId) || retroTemplates[0];

    await Config.getAxiosInstance().post("/applyColumnTemplate", {
      userName: Config.getCurrentUserName(),
      team: teamName,
      columns: template.columns,
    });

    if (boardRef.current) {
      await boardRef.current.refresh();
    }
  }

  const visibleItems = useMemo(() => {
    return boardSnapshot.items.filter((item) => {
      const query = String(filters.query || "").trim().toLowerCase();
      const haystack = [item.message, item.name, ...(item.actionPoints || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (query && !haystack.includes(query)) {
        return false;
      }

      if (filters.scope === "mine" && item.name !== Config.getCurrentUserName()) {
        return false;
      }

      if (filters.scope === "voted" && Number(item.votes || 0) <= 0) {
        return false;
      }

      if (filters.column !== "all" && item.type !== filters.column) {
        return false;
      }

      if (filters.actionOnly && (!item.actionPoints || item.actionPoints.length === 0)) {
        return false;
      }

      return true;
    });
  }, [boardSnapshot.items, filters]);

  return (
    <Container fluid className="dashboard-grid">
      <div className="hero-panel">
        <span className="hero-eyebrow">Facilitator cockpit</span>
        <h1 className="hero-title">
          {validBoard ? `Retro for ${Config.getSprintName()}` : "Choose a team to open the retro canvas"}
        </h1>
        <p className="hero-copy">
          Keep the team focused with a cleaner board, richer trends, and quick actions for sorting,
          exporting, and turning discussion into action.
        </p>
        <div className="hero-metrics">
          <div className="hero-metric">
            <strong>{Config.getCurrentUserName() || "Team"}</strong>
            <span>Signed in and ready to facilitate</span>
          </div>
          <div className="hero-metric">
            <strong>{validBoard ? teamName : "Insights"}</strong>
            <span>{validBoard ? "Current team space" : "Cross-sprint analytics at a glance"}</span>
          </div>
          <div className="hero-metric">
            <strong>{validBoard ? "Live board" : "History view"}</strong>
            <span>{validBoard ? "Capture, vote, and export in one flow" : "Compare health across sprints"}</span>
          </div>
        </div>
      </div>

      <Row style={{ marginTop: 20 }}>
        <Col lg="3" style={{ marginBottom: 20 }}>
          <Menu />
        </Col>
        <Col lg="9">
          {validBoard ? (
            <>
              <div className="section-heading">
                <div>
                  <h2>Board</h2>
                  <p className="section-caption">
                    Sort the conversation, export the summary, and guide the room without losing momentum.
                  </p>
                </div>
                <div className="board-actions">
                  <ToggleButtonGroup type="radio" name="sorting" defaultValue="date">
                    <ToggleButton
                      variant="secondary"
                      type="radio"
                      value="date"
                      size="sm"
                      onClick={() => boardRef.current && boardRef.current.update("date")}
                    >
                      Sort by date
                    </ToggleButton>
                    <ToggleButton
                      variant="secondary"
                      type="radio"
                      value="vote"
                      size="sm"
                      onClick={() => boardRef.current && boardRef.current.update("vote")}
                    >
                      Sort by vote
                    </ToggleButton>
                  </ToggleButtonGroup>
                  <Button
                    variant="info"
                    onClick={() =>
                      GeneratePDF(`${teamName}_${Config.getSprintName()}_retrospective.pdf`)
                    }
                    size="sm"
                  >
                    Export PDF
                  </Button>
                </div>
              </div>

              <div className="app-surface app-content" style={{ marginBottom: 20 }}>
                <BoardToolbar
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  selectedTemplateId={selectedTemplateId}
                  templates={retroTemplates}
                  onTemplateChange={setSelectedTemplateId}
                  onApplyTemplate={handleApplyTemplate}
                />
                <Row>
                  <Board
                    ref={boardRef}
                    filters={filters}
                    onBoardStateChange={handleBoardStateChange}
                  />
                </Row>
              </div>

              <Row>
                <Col lg="8" style={{ marginBottom: 20 }}>
                  <Happiness />
                </Col>
                <Col lg="4" style={{ marginBottom: 20 }}>
                  <Velocity />
                </Col>
              </Row>

              <Row>
                <Col lg="8" style={{ marginBottom: 20 }}>
                  <TopVoted />
                </Col>
                <Col lg="4" style={{ marginBottom: 20 }}>
                  <RetroInsights items={visibleItems} settings={boardSnapshot.settings} />
                </Col>
              </Row>
            </>
          ) : (
            <div className="app-surface app-content">
              <Alert variant="light" style={{ marginBottom: 0 }}>
                <div className="section-heading">
                  <div>
                    <h3>Trends overview</h3>
                    <p className="section-caption">
                      Select a team to jump into a retro, or use this view to spot momentum across past sprints.
                    </p>
                  </div>
                </div>
                <Chart teamName={teamName} sprints={teamSprints} />
              </Alert>
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
}

export default Body;
