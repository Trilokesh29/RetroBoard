import React, { useState } from "react";
import Button from "react-bootstrap/Button";
import FormControl from "react-bootstrap/FormControl";
import InputGroup from "react-bootstrap/InputGroup";
import Modal from "react-bootstrap/Modal";

import Config from "../Configuration";

function AddItemInputForm(props) {
  const [show, setShow] = useState(false);
  const [text, setText] = useState("");

  const handleShow = () => setShow(true);
  const handleClose = () => {
    setShow(false);
    setText("");
  };

  function handleSubmit(event) {
    event.preventDefault();

    if (text.trim() !== "") {
      let jsonObj = {
        sprint: Config.getSprintName(),
        name: Config.getCurrentUserName(),
        type: props.name,
        message: text.trim(),
        date: new Date(),
        vote: 0,
        team: Config.getTeamName(),
      };
      props.onSubmit(jsonObj);
      handleClose();
    }
  }

  return (
    <>
      <Button variant="primary" onClick={handleShow} className="w-100">
        Add new item{" "}
      </Button>

      <Modal size="lg" show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title> Add new item </Modal.Title>
        </Modal.Header>{" "}
        <form className="needs-validation" onSubmit={handleSubmit}>
          <Modal.Body>
            <InputGroup className="mb-3">
              <InputGroup.Text id="basic-addon1">@</InputGroup.Text>
              <FormControl
                value={Config.getCurrentUserName()}
                type="text"
                placeholder="Username"
                readOnly
                required
              />
            </InputGroup>{" "}
            <InputGroup>
              <InputGroup.Text>Item text</InputGroup.Text>
              <textarea
                className="form-control"
                onChange={(e) => setText(e.target.value)}
                type="text"
                placeholder="Write your thoughts here"
                required
              />{" "}
            </InputGroup>{" "}
          </Modal.Body>{" "}
          <Modal.Footer>
            {" "}
            <Button variant="secondary" onClick={handleClose}>
              {" "}
              Cancel{" "}
            </Button>{" "}
            <Button variant="primary" type="submit">
              Add item{" "}
            </Button>{" "}
          </Modal.Footer>{" "}
        </form>
      </Modal>
    </>
  );
}
export default AddItemInputForm;
