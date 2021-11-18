import React, { useState, useEffect } from "react";
import "react-bootstrap-range-slider/dist/react-bootstrap-range-slider.css";
import Container from "react-bootstrap/Container";
import RangeSlider from "react-bootstrap-range-slider";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import FormControl from "react-bootstrap/FormControl";
import ListGroup from "react-bootstrap/ListGroup";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Config from "../Configuration";
import Alert from "react-bootstrap/Alert";

const Happiness = () => {
  const [value, setValue] = useState(3.0);
  const [name, setName] = useState(localStorage.getItem("userName"));
  const [average, setAverage] = useState("");
  const [happinessList, setHappinessList] = useState([]);

  useEffect(() => {
    updateAverage();
    updateList();
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    var jsonObj = {
      userName: localStorage.getItem("userName"),
      sessionId: localStorage.getItem("sessionId"),
      team: Config.getTeamName(),
      sprint: Config.getSprintName(),
      name: localStorage.getItem("userName"),
      happiness: value,
    };

    if (!/[^$|^a-zA-Z]/.test(name)) {
      Config.getAxiosInstance()
        .post("updateHappiness", jsonObj)
        .then(() => {
          updateAverage();
        })
        .then(() => {
          updateList();
        });
    }
  }

  function shouldEnableSubmit() {
    if (/[^$|^a-zA-Z]/.test(name) || name === "") {
      return false;
    }

    return true;
  }

  function changeHandler(event) {
    setName(event.target.value);
  }

  function updateAverage() {
    var jsonObj = {
      params: {
        userName: localStorage.getItem("userName"),
        sessionId: localStorage.getItem("sessionId"),
        team: Config.getTeamName(),
        sprint: Config.getSprintName(),
      },
    };
    Config.getAxiosInstance()
      .get("getAvgHappinessForASprint", jsonObj)
      .then((res) => {
        setAverage(res.data.average);
      });
  }

  function removeHappiness(e) {
    if (window.confirm("Do you want to remove happiness ?")) {
      Config.getAxiosInstance()
        .post("removeHappiness", {
          userName: localStorage.getItem("userName"),
          sessionId: localStorage.getItem("sessionId"),
          id: e.currentTarget.dataset.id
        })
        .then((result) => {
          if (-1 === result.data) {
            alert("[" + localStorage.getItem("userName") + "] does not have permission!");
          }
          updateAverage();
        })
        .then(() => {
          updateList();
        });
    }
  }

  function updateList() {
    var jsonObj = {
      params: {
        userName: localStorage.getItem("userName"),
        sessionId: localStorage.getItem("sessionId"),
        team: Config.getTeamName(),
        sprint: Config.getSprintName(),
      },
    };
    Config.getAxiosInstance()
      .get("getHappinessForASprint", jsonObj)
      .then((res) => {
        setHappinessList(
          res.data.map((item) => (
            <ListGroup.Item key={item._id}>
              <div style={{ borderBottom: "1px solid #DCDBDB" }}>
                <Row>
                  <Col>{item.name}</Col>
                  <Col>{item.happiness}</Col>
                  <Col>
                    <button
                      data-id={item._id}
                      type="button"
                      className="close"
                      aria-label="Close"
                      onClick={removeHappiness.bind(this)}
                    >
                      <span aria-hidden="true">&times;</span>
                    </button>
                  </Col>
                </Row>
              </div>
            </ListGroup.Item>
          ))
        );
      });
  }

  return (
    <Container fluid>
      <Card border="light">
        <Card.Header>Happiness</Card.Header>
        <Card.Body>
          <Col style={{ paddingLeft: "0", paddingRight: "0" }}>
            <form
              className="needs-validation"
              onSubmit={handleSubmit}
              noValidate
            >
              <Row style={{ marginBottom: "30px" }}>
                <Col xs lg="2" style={{ paddingLeft: "0", paddingRight: "0" }}>
                  <Alert key="light" variant="light" style={{ paddingLeft: "0", paddingRight: "0" }}>
                    Range slider:
                  </Alert>
                </Col>
                <Col xs lg="6" style={{ paddingLeft: "0" }}>
                  <RangeSlider
                    value={value}
                    min={1.0}
                    max={5.0}
                    step={1.0}
                    onChange={(changeEvent) =>
                      setValue(changeEvent.target.value)
                    }
                    style={{ marginBottom: "8%" }}
                  />
                </Col>
                <Col xs lg="2" style={{ paddingLeft: "0", paddingRight: "0" }}>
                  <FormControl
                    value={localStorage.getItem("userName")}
                    name="name"
                    onChange={changeHandler}
                    type="text"
                    placeholder="Name"
                    required
                  />
                </Col>

                <Col xs lg="2" style={{ paddingLeft: "5px", paddingRight: "0" }}>
                  <Button disabled={!shouldEnableSubmit()} color="primary" type="submit" size="sm">
                    Submit Happiness
                  </Button>
                </Col>
              </Row>
            </form>
          </Col>
          <Col style={{ paddingLeft: "0", paddingRight: "0" }}>
            <Row style={{ marginBottom: "30px" }}>
              <Col style={{ paddingLeft: "0", paddingRight: "0" }}>
                <ListGroup> {happinessList} </ListGroup>
              </Col>
            </Row>
            <Row>
              <Col xs style={{ paddingLeft: "0", paddingRight: "0" }}>
                <Alert key="primary" variant="primary">
                  Average Happiness : {average}{" "}
                </Alert>
              </Col>
            </Row>
          </Col>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Happiness;
