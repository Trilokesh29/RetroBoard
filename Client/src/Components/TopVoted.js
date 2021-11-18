import React, { useEffect, useState } from "react";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";

import Config from "../Configuration";

function TopVoted() {
  let [items, setItems] = useState([]);

  useEffect(() => {
    updateItems();
    const interval = setInterval(() => updateItems(), 5000);
    return () => clearInterval(interval);
  }, []);

  function updateItems() {
    var jsonObj = {
      params: {
        userName: localStorage.getItem("userName"),
        sessionId: localStorage.getItem("sessionId"),
        team: Config.getTeamName(),
        sprint: Config.getSprintName()
      },
    };

    Config.getAxiosInstance()
      .get("getTopVotedItemsForASprint", jsonObj)
      .then((res) => {
        setItems(
          res.data.items.map((item) => (
            <Col key={item._id}>
              {" "}
              <Card bg="info" text="white">
                <Card.Body>
                  {" "}
                  <Card.Title>
                    {" "}
                    {item.votes}
                    votes[
                    {res.data.settings
                      ? res.data.settings[item.type]
                      : item.type}
                    ]{" "}
                  </Card.Title>{" "}
                  <Card.Text> {item.message} </Card.Text>
                </Card.Body>{" "}
                <Card.Footer> {item.name} </Card.Footer>{" "}
              </Card>{" "}
            </Col>
          ))
        );
      });
  }

  return (
    <Container fluid>
      <Card border="light">
        <Card.Header> Top Voted </Card.Header>{" "}
        <Card.Body>
          <Row> {items} </Row>{" "}
        </Card.Body>{" "}
      </Card>{" "}
    </Container>
  );
}

export default TopVoted;
