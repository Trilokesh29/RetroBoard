import React, { useState } from "react";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import ListGroup from "react-bootstrap/ListGroup";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import FormControl from "react-bootstrap/FormControl";
import Card from 'react-bootstrap/Card'
import InputGroup from 'react-bootstrap/InputGroup'

function Item(props) {

  const [actionPoint, setActionPoint] = useState("")

  function handleSubmit(event) {
    event.preventDefault();
    event.target.className += " was-validated";
    if (actionPoint !== "") {
      props.onAddActionPoint(props.item._id, actionPoint)
      setActionPoint("");
      event.target.className = "needs-validation";
    }
  }

  return (
    <div className='mt-1'>
      <Card border="info">
        <Card.Body>
          <Card.Text><div style={{ whiteSpace: "pre-wrap", borderBottom: "1px solid #DCDBDB" }}>{props.item.message}</div></Card.Text>
          {
            props.item.actionPoints ?
              <ListGroup>
                {props.item.actionPoints.map(item => <ListGroup.Item>{item}</ListGroup.Item>)}
              </ListGroup>
              :
              <p />
          }
          <p />
          <Row>
            <Col>
              <form
                className="needs-validation"
                onSubmit={handleSubmit}
                noValidate
              >
                <InputGroup onSubmit={handleSubmit} className="mb-3" noValidate>
                  <FormControl
                    placeholder="Action point"
                    size="sm"
                    value={actionPoint}
                    onChange={e => setActionPoint(e.target.value)}
                    type="text"
                    placeholder="Action point"
                    required
                    noValidate
                  />
                  <InputGroup.Append>
                    <Button size="sm" color="primary" type="submit">Add AP</Button>
                  </InputGroup.Append>
                </InputGroup>
              </form>
            </Col>
          </Row>

        </Card.Body>
        <Card.Footer>
          <Card.Text className="text-muted" style={{ fontSize: '10px' }}>{props.item.name} / {props.item.date}</Card.Text>
          <Button variant="info" onClick={() => props.onVote(props.item._id)}>
            Vote <Badge variant="light"> {props.item.votes} </Badge>
            <span className="sr-only"> votes </span>
          </Button>
          {" "}
          <Button variant="outline-danger" onClick={() => props.onUnvote(props.item._id)}>
            Unvote
            </Button>
          {" "}
          <Button variant="danger" onClick={() => props.onRemove(props.item._id)}>
            Remove
            </Button>
        </Card.Footer>
      </Card>
    </div>
  );
}

export default Item;
