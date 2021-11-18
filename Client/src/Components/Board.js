import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { DragDropContext } from "react-beautiful-dnd";
import DraggableList from "./DraggableList";
import Config from "../Configuration";
import { UpdateData } from "./PDFDocument";

const KNames = ["Good", "Bad", "Ugly"];

function reorder(list, startIndex, endIndex) {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
}

function move(source, destination, droppableSource, droppableDestination) {
  const sourceClone = Array.from(source);
  const destClone = Array.from(destination);
  const [removed] = sourceClone.splice(droppableSource.index, 1);

  destClone.splice(droppableDestination.index, 0, removed);

  const result = {};
  result[droppableSource.droppableId] = sourceClone;
  result[droppableDestination.droppableId] = destClone;

  return result;
}

// Fucntional object
const Board = forwardRef((props, ref) => {
  let [boardItemsGood, setBoardItemsGood] = useState([]);
  let [boardItemsBad, setBoardItemsBad] = useState([]);
  let [boardItemsUgly, setBoardItemsUgly] = useState([]);
  let [settings, setSettings] = useState([]);

  const boardItems = {
    Good: boardItemsGood,
    Bad: boardItemsBad,
    Ugly: boardItemsUgly,
  };

  const name2setItems = {
    Good: setBoardItemsGood,
    Bad: setBoardItemsBad,
    Ugly: setBoardItemsUgly,
  };

  useImperativeHandle(ref, () => ({
    update(sortType) {
      var jsonObj = {
        userName: localStorage.getItem("userName"),
        sessionId: localStorage.getItem("sessionId"),
        team: Config.getTeamName(),
        sprint: Config.getSprintName(),
        criteria: sortType
      }

      Config.getAxiosInstance()
        .post("setSortingCriteria", jsonObj)
        .then(() => {
          updateBoard(sortType, false);
        })
        .catch((error) => {
          alert("failed to udpate sorting criteria !!! try again");
        });
    }
  }));

  useEffect(updateBoard, []);

  function updateBoard(sortType, fetchSortingCriteria) {

    if (false === fetchSortingCriteria) {
      populateBoard(sortType);
    }
    else {
      let reqData = {
        params: {
          userName: localStorage.getItem("userName"),
          sessionId: localStorage.getItem("sessionId"),
          team: Config.getTeamName(),
          sprint: Config.getSprintName(),
        },
      };

      Config.getAxiosInstance().get(
        "getSortingCriteria",
        reqData
      ).then(res => {
        populateBoard(res.data[0]);
      }).catch(error => {
        alert("failed to get sorting criteria!!! try again");
      });
    }
  }

  function populateBoard(sortingType) {
    var url = window.location.href.replace(/^.*\/\/[^/]+/, "");
    url += "/userName/" + localStorage.getItem("userName");

    var sessionInfo =
    {
      params:
      {
        sessionId: localStorage.getItem("sessionId")
      }
    }

    Config.getAxiosInstance()
      .get(url, sessionInfo)
      .then((res) => {
        const board = res.data.items.sort((a, b) => {
          if (sortingType === "vote") {
            return b.votes - a.votes;
          } else {
            return false;
          }

        });
        setSettings(res.data.settings);
        name2setItems["Good"](board.filter((item) => item.type === "Good"));
        name2setItems["Bad"](board.filter((item) => item.type === "Bad"));
        name2setItems["Ugly"](board.filter((item) => item.type === "Ugly"));
        UpdateData(
          board.filter((item) => item.type === "Good"),
          board.filter((item) => item.type === "Bad"),
          board.filter((item) => item.type === "Ugly"),
          res.data.settings
        );
      });
  }

  function getColumns(nameArray) {
    return nameArray.map((name) => (
      <DraggableList
        key={name}
        name={name}
        displayName={!settings ? name : settings[name]}
        items={boardItems[name]}
        onBoardUpdate={updateBoard}
      />
    ));
  }

  function onDragEnd(result) {
    const { source, destination } = result;

    //dropped outside the list
    if (!destination) {
      return;
    }

    Config.getAxiosInstance()
      .post("/moveacrosscolumn", {
        userName: localStorage.getItem("userName"),
        sessionId: localStorage.getItem("sessionId"),
        _id: boardItems[source.droppableId][source.index]._id,
        type: destination.droppableId,
        //index: destination.index
      })
      .then(updateBoard);

    if (source.droppableId === destination.droppableId) {
      const items = reorder(
        boardItems[source.droppableId],
        source.index,
        destination.index
      );
      name2setItems[source.droppableId](items);
    } else {
      const result = move(
        boardItems[source.droppableId],
        boardItems[destination.droppableId],
        source,
        destination
      );
      name2setItems[source.droppableId](result[source.droppableId]);
      name2setItems[destination.droppableId](result[destination.droppableId]);
    }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      {" "}
      {getColumns(KNames)}{" "}
    </DragDropContext>
  );
});

export default Board;
