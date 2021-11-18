import React, { useState } from "react";
import Button from "react-bootstrap/Button";
import FormControl from "react-bootstrap/FormControl";
import InputGroup from "react-bootstrap/InputGroup";
import Modal from "react-bootstrap/Modal";

import Config from "../Configuration";

function AddItemInputForm(props) {
  const [show, setShow] = useState(false);
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");

  const handleShow = () => setShow(true);
  const handleClose = () => setShow(false);

  function handleSubmit(event) {
    event.preventDefault();

    if (!/[^$|^a-zA-Z]/.test(author) && text !== "") {
      let jsonObj = {
        sprint: Config.getSprintName(),
        name: localStorage.getItem("userName"),
        type: props.name,
        message: text,
        date: new Date(),
        vote: 0,
        team: Config.getTeamName(),
      };
      props.onSubmit(jsonObj);
      setShow(false);
      setText("");
      setAuthor("");
    }
  }

  return (
    <>
      <Button variant="primary" onClick={handleShow} block>
        Add new item{" "}
      </Button>

      <Modal size="lg" show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title> Add new item </Modal.Title>
        </Modal.Header>{" "}
        <form className="needs-validation" onSubmit={handleSubmit}>
          <Modal.Body>
            <InputGroup className="mb-3">
              <InputGroup.Prepend>
                <InputGroup.Text id="basic-addon1"> @ </InputGroup.Text>
              </InputGroup.Prepend>{" "}
              <FormControl
                value={localStorage.getItem("userName")}
                type="text"
                placeholder="Username"
                required
              />
            </InputGroup>{" "}
            <InputGroup>
              <InputGroup.Prepend>
                <InputGroup.Text> Item text </InputGroup.Text>
              </InputGroup.Prepend>{" "}
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
            <Button color="primary" type="submit">
              Add item{" "}
            </Button>{" "}
          </Modal.Footer>{" "}
        </form>
      </Modal>
    </>
  );
}
export default AddItemInputForm;
