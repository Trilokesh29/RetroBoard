import React, { useEffect, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import FormControl from "react-bootstrap/FormControl";
import Row from "react-bootstrap/Row";

import Config from "../Configuration";

function Velocity() {
  let [spPlanned, setSpPlanned] = useState("");
  let [spBurnt, setSpBurnt] = useState("");
  let [bbAccuracy, setBBAccuracy] = useState("");
  let [pi, setPi] = useState("");

  useEffect(() => {
    setSpPlanned("");
    setSpBurnt("");
    setPi("");
    setBBAccuracy("");
    updateVelocity();
  }, []);

  function changePi(event) {
    setPi(event.target.value);
  }

  function changeSpPlanned(event) {
    setSpPlanned(event.target.value);
  }

  function changeSpBurnt(event) {
    setSpBurnt(event.target.value);
  }

  function changeBBAccuracy(event) {
    setBBAccuracy(event.target.value);
  }

  function shouldEnableSumbit() {

    if (
      !/^[0-9]+$/.test(spBurnt) ||
      !/^[0-9]+$/.test(spPlanned) ||
      !/^[0-9]+$/.test(bbAccuracy)
    ) {
      return false;
    }

    if (pi === "" || parseInt(pi, 10) === 0) {
      return false;
    }

    return true;
  }

  function submitVelocity() {
    if (
      !/^[0-9]+$/.test(spBurnt) ||
      !/^[0-9]+$/.test(spPlanned) ||
      !/^[0-9]+$/.test(bbAccuracy)
    ) {
      return;
    }

    if (pi === "" || parseInt(pi, 10) === 0) {
      return;
    }

    var jsonObj = {
      userName: localStorage.getItem("userName"),
      sessionId: localStorage.getItem("sessionId"),
      team: Config.getTeamName(),
      sprint: Config.getSprintName(),
      spPlanned: spPlanned,
      spBurnt: spBurnt,
      pi: pi,
      bbAccuracy: bbAccuracy,
    };
    Config.getAxiosInstance()
      .post("setVelocity", jsonObj)
      .then(() => {
        alert("Submitted Sucessfully !!!");
        updateVelocity();
      })
      .catch((error) => {
        alert("Error In Submitting !!! Retry");
      });
  }

  function updateVelocity() {
    var jsonObj = {
      params: {
        userName: localStorage.getItem("userName"),
        sessionId: localStorage.getItem("sessionId"),
        team: Config.getTeamName(),
        sprint: Config.getSprintName(),
      },
    };

    Config.getAxiosInstance()
      .get("getVelocityForSprint", jsonObj)
      .then((res) => {
        if (res.data.length !== 0) {
          setSpPlanned(res.data[0].spPlanned);
          setSpBurnt(res.data[0].spBurnt);
          setPi(res.data[0].pi);
          setBBAccuracy(res.data[0].bbAccuracy);
        }
      });
  }

  return (
    <Container fluid>
      <Card border="light">
        <Card.Header> Velocity </Card.Header>{" "}
        <Card.Body>
          <Row>
            <Col style={{ paddingLeft: "0", paddingRight: "0" }}>
              <Alert
                key="light"
                variant="light"
                style={{ paddingLeft: "0", paddingRight: "0" }}
              >
                PI:
              </Alert>{" "}
            </Col>{" "}
            <Col>
              <FormControl
                value={pi}
                name="pi"
                onChange={changePi}
                type="text"
                isInvalid={pi === "" ? false : !/^[0-9]+$/.test(pi)}
                required
              />{" "}
            </Col>{" "}
          </Row>{" "}
          <Row>
            {" "}
            <Col
              style={{
                paddingLeft: "0",
                paddingRight: "0",
              }}
            >
              {" "}
              <Alert
                key="light"
                variant="light"
                style={{
                  paddingLeft: "0",
                  paddingRight: "0",
                }}
              >
                {" "}
                Story points planned:{" "}
              </Alert>{" "}
            </Col>{" "}
            <Col>
              {" "}
              <FormControl
                value={spPlanned}
                name="story points planned"
                onChange={changeSpPlanned}
                type="text"
                isInvalid={
                  spPlanned === "" ? false : !/^[0-9]+$/.test(spPlanned)
                }
                required
              />
            </Col>{" "}
          </Row>{" "}
          <Row>
            {" "}
            <Col
              style={{
                paddingLeft: "0",
                paddingRight: "0",
              }}
            >
              {" "}
              <Alert
                key="light"
                variant="light"
                style={{
                  paddingLeft: "0",
                  paddingRight: "0",
                }}
              >
                {" "}
                Story points burnt:{" "}
              </Alert>{" "}
            </Col>{" "}
            <Col>
              {" "}
              <FormControl
                value={spBurnt}
                name="story points burnt"
                onChange={changeSpBurnt}
                type="text"
                isInvalid={spBurnt === "" ? false : !/^[0-9]+$/.test(spBurnt)}
                required
              />
            </Col>{" "}
          </Row>{" "}
          <Row>
            {" "}
            <Col
              style={{
                paddingLeft: "0",
                paddingRight: "0",
              }}
            >
              {" "}
              <Alert
                key="light"
                variant="light"
                style={{
                  paddingLeft: "0",
                  paddingRight: "0",
                }}
              >
                {" "}
                Bugbuffer accuracy:{" "}
              </Alert>{" "}
            </Col>{" "}
            <Col>
              {" "}
              <FormControl
                value={bbAccuracy}
                name="Bugbuffer Accuracy"
                onChange={changeBBAccuracy}
                type="text"
                isInvalid={
                  bbAccuracy === "" ? false : !/^[0-9]+$/.test(bbAccuracy)
                }
                required
              />
            </Col>{" "}
          </Row>{" "}
          <Row>
            {" "}
            <Button
              disabled={!shouldEnableSumbit()}
              variant="primary"
              onClick={submitVelocity}>
              Submit Sprint Velocity
            </Button>
          </Row>{" "}
        </Card.Body>{" "}
      </Card>{" "}
    </Container >
  );
}

export default Velocity;
