import React, { Component } from "react";
import { Droppable } from "@hello-pangea/dnd";
import DraggableItem from "./DraggableItem";
import Config from "../Configuration";
import AddItemInputForm from "./AddItemInputForm";
import { dispatchVotesUpdated } from "../authEvents";

class DraggableList extends Component {
  constructor(props) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleRemove = this.handleRemove.bind(this);
    this.handleVote = this.handleVote.bind(this);
    this.handleUnvote = this.handleUnvote.bind(this);
    this.handleAddActionPoint = this.handleAddActionPoint.bind(this);
    this.handleTitleChange = this.handleTitleChange.bind(this);
  }

  handleSubmit(jsonObj) {
    Config.getAxiosInstance().post("/update/Person", jsonObj).then(this.props.onBoardUpdate);
  }

  handleRemove(id) {
    if (window.confirm("Do you want to remove this item?")) {
      Config.getAxiosInstance()
        .post("/deletepost", {
          userName: Config.getCurrentUserName(),
          team: Config.getTeamName(),
          _id: id,
        })
        .then(() => {
          this.props.onBoardUpdate();
          dispatchVotesUpdated();
        })
        .catch(() => {
          alert(`[${Config.getCurrentUserName()}] does not have permission to remove this item.`);
        });
    }
  }

  handleVote(id) {
    Config.getAxiosInstance()
      .get("checkIfVotingAllowed", {
        params: {
          userName: Config.getCurrentUserName(),
          team: Config.getTeamName(),
          sprint: Config.getSprintName(),
        },
      })
      .then((res) => {
        if (res.data[0] === true) {
          return Config.getAxiosInstance().post("/addvote", {
            userName: Config.getCurrentUserName(),
            _id: id,
            sprint: Config.getSprintName(),
            team: Config.getTeamName(),
          });
        }

        alert(`[${Config.getCurrentUserName()}] vote limit reached.`);
        return null;
      })
      .then((response) => {
        if (response) {
          this.props.onBoardUpdate();
          dispatchVotesUpdated();
        }
      });
  }

  handleUnvote(id) {
    Config.getAxiosInstance()
      .post("/removevote", {
        userName: Config.getCurrentUserName(),
        _id: id,
        sprint: Config.getSprintName(),
        team: Config.getTeamName(),
      })
      .then((res) => {
        if (res.data === -1) {
          alert("Vote count is already at the lowest value.");
        } else if (res.data === -2) {
          alert(`[${Config.getCurrentUserName()}] has not voted for this item.`);
        } else {
          this.props.onBoardUpdate();
          dispatchVotesUpdated();
        }
      });
  }

  handleTitleChange(event, columnName) {
    const nextValue = event.target.innerText.trim();

    if (nextValue && nextValue !== this.props.displayName) {
      Config.getAxiosInstance().post("/renameColumn", {
        userName: Config.getCurrentUserName(),
        column: columnName,
        value: nextValue,
        team: Config.getTeamName(),
      });
    }
  }

  handleAddActionPoint(id, actionPoint) {
    Config.getAxiosInstance()
      .post("/addactionpoint", {
        userName: Config.getCurrentUserName(),
        _id: id,
        actionPoint,
        team: Config.getTeamName(),
        sprint: Config.getSprintName(),
      })
      .then(this.props.onBoardUpdate);
  }

  render() {
    return (
      <div className="col-sm" style={{ marginBottom: 20 }}>
        <div className="board-column">
          <div
            className="board-column-title"
            contentEditable
            suppressContentEditableWarning
            onBlur={(event) => this.handleTitleChange(event, this.props.name)}
          >
            {this.props.displayName || this.props.name}
          </div>

          <Droppable droppableId={this.props.name}>
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {this.props.items.map((item, index) => (
                  <DraggableItem
                    key={item._id}
                    id={item._id}
                    index={index}
                    item={item}
                    onVote={this.handleVote}
                    onUnvote={this.handleUnvote}
                    onRemove={this.handleRemove}
                    onAddActionPoint={this.handleAddActionPoint}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          <div style={{ marginTop: 14 }}>
            <AddItemInputForm name={this.props.name} onSubmit={this.handleSubmit} />
          </div>
        </div>
      </div>
    );
  }
}

export default DraggableList;
