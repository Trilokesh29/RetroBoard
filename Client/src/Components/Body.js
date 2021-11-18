import React, { useRef } from "react";
import Alert from "react-bootstrap/Alert";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button"
import ToggleButtonGroup from "react-bootstrap/ToggleButtonGroup"
import ToggleButton from "react-bootstrap/ToggleButton"

import Config from "../Configuration";

import Board from "./Board";
import Chart from "./Chart.js";
import { GeneratePDF } from "./PDFDocument";
import Happiness from "./Happiness";
import Menu from "./Menu/Menu";
import TopVoted from "./TopVoted";
import Velocity from "./Velocity";

const teamNameToIgnore = "http:";

function Body() {
  // Sort controls
  const boardRef = useRef();
  let sortType = "";

  const sortByVote = () => {
    if (sortType !== "vote") {
      boardRef.current.update("vote")
    }
  }

  const sortByDate = () => {
    if (sortType !== "date") {
      boardRef.current.update("date")
    }
  }

  async function getSprintsForATeam(teamName) {
    let sprints = [];

    if (teamName !== teamNameToIgnore) {
      let jsonObj = {
        params: {
          userName: localStorage.getItem("userName"),
          sessionId: localStorage.getItem("sessionId"),
          team: teamName
        },
      };
      let result = await Config.getAxiosInstance().get("getSprints", jsonObj);
      sprints = result.data;
    }
    return sprints;
  }

  const regEx = RegExp(".+/team/.*/sprint/.*");
  var validBoard = regEx.test(window.location.href);

  return (
    <Container fluid>
      <Row>
        <Col lg="2">
          <Menu />
        </Col>{" "}
        {validBoard ? (
          <Col>
            <Container fluid>
              <Row>
                <Col>
                  <div class="float-right" style={{ padding: 10 }}>
                    <ToggleButtonGroup type="radio" name="options" defaultValue="SBD" style={{ marginRight: "10px" }}>
                      <ToggleButton variant="secondary" type="radio" name="options" id="option1" autocomplete="off" value="SBD" size="sm" onClick={sortByDate}> Sort by Date </ToggleButton>
                      <ToggleButton variant="secondary" type="radio" name="options" id="option2" autocomplete="off" value="SBV" size="sm" onClick={sortByVote}> Sort by Vote </ToggleButton>
                    </ToggleButtonGroup>
                    <Button variant="info" onClick={() => { GeneratePDF(Config.getTeamName() + "_" + Config.getSprintName() + "_retrospective.pdf") }} size="sm">
                      Export to PDF
                    </Button>
                  </div><br />
                </Col>
              </Row>
            </Container>
            <Container fluid>
              <Row>
                <Board ref={boardRef} />
              </Row>{" "}
            </Container>{" "}
            <p />
            <Container fluid>
              <Row>
                <Col sm={8}>
                  <Happiness />
                </Col>{" "}
                <Col sm={4}>
                  <Velocity />
                </Col>{" "}
              </Row>{" "}
            </Container>{" "}
            <p />
            <TopVoted />
          </Col>
        ) : (
            <Col>
              <p />
              <Alert variant="info">
                {" "}
                {/* Please select a valid board to show it first{" "} */}{" "}
                {
                  <Chart
                    teamName={Config.getTeamName()}
                    sprints={getSprintsForATeam(Config.getTeamName())}
                  />
                }{" "}
              </Alert>{" "}
            </Col>
          )}{" "}
      </Row>{" "}
    </Container>
  );
}

export default Body;
