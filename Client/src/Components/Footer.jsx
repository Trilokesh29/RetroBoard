import React from "react";
import Card from "react-bootstrap/Card";
import Nav from "react-bootstrap/Nav";

function Footer() {
  return (
    <Card className="footer-card text-center">
      <Card.Body>
        <Nav.Link href="https://tomtomslack.slack.com/archives/C010BSA9LGM">
          Need a hand? Join the RetroBoard support channel.
        </Nav.Link>
      </Card.Body>
      <Card.Footer className="text-muted">
        {new Date().getFullYear()} RetroBoard. Built for collaborative retros.
      </Card.Footer>
    </Card>
  );
}

export default Footer;
