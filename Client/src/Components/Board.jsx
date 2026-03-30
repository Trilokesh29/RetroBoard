import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import DraggableList from "./DraggableList";
import Config from "../Configuration";
import { UpdateData } from "./PDFDocument";

const columnKeys = ["Good", "Bad", "Ugly"];

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

  return {
    [droppableSource.droppableId]: sourceClone,
    [droppableDestination.droppableId]: destClone,
  };
}

function matchesFilters(item, filters) {
  if (!filters) {
    return true;
  }

  const query = String(filters.query || "").trim().toLowerCase();
  const haystack = [
    item.message,
    item.name,
    ...(item.actionPoints || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (query && !haystack.includes(query)) {
    return false;
  }

  if (filters.scope === "mine" && item.name !== Config.getCurrentUserName()) {
    return false;
  }

  if (filters.scope === "voted" && Number(item.votes || 0) <= 0) {
    return false;
  }

  if (filters.column && filters.column !== "all" && item.type !== filters.column) {
    return false;
  }

  if (filters.actionOnly && (!Array.isArray(item.actionPoints) || item.actionPoints.length === 0)) {
    return false;
  }

  return true;
}

const Board = forwardRef(({ filters, onBoardStateChange }, ref) => {
  const [boardItems, setBoardItems] = useState({
    Good: [],
    Bad: [],
    Ugly: [],
  });
  const [settings, setSettings] = useState(null);

  function assignBoardItems(board) {
    setBoardItems({
      Good: board.filter((item) => item.type === "Good"),
      Bad: board.filter((item) => item.type === "Bad"),
      Ugly: board.filter((item) => item.type === "Ugly"),
    });
  }

  function syncBoardArtifacts(board, nextSettings) {
    UpdateData(
      board.filter((item) => item.type === "Good"),
      board.filter((item) => item.type === "Bad"),
      board.filter((item) => item.type === "Ugly"),
      nextSettings
    );

    if (onBoardStateChange) {
      onBoardStateChange({
        items: board,
        settings: nextSettings,
      });
    }
  }

  async function populateBoard(sortingType) {
    let url = window.location.href.replace(/^.*\/\/[^/]+/, "");
    url += `/userName/${Config.getCurrentUserName()}`;

    const sessionInfo = {
      params: {
        userName: Config.getCurrentUserName(),
      },
    };

    const response = await Config.getAxiosInstance().get(url, sessionInfo);
    const board = [...response.data.items].sort((left, right) => {
      if (sortingType === "vote") {
        return Number(right.votes || 0) - Number(left.votes || 0);
      }

      return 0;
    });

    setSettings(response.data.settings);
    assignBoardItems(board);
    syncBoardArtifacts(board, response.data.settings);
  }

  async function updateBoard(sortType, fetchSortingCriteria = true) {
    if (fetchSortingCriteria === false) {
      await populateBoard(sortType);
      return;
    }

    const response = await Config.getAxiosInstance().get("getSortingCriteria", {
      params: {
        userName: Config.getCurrentUserName(),
        team: Config.getTeamName(),
        sprint: Config.getSprintName(),
      },
    });

    await populateBoard(response.data[0]);
  }

  useImperativeHandle(ref, () => ({
    async update(sortType) {
      await Config.getAxiosInstance().post("setSortingCriteria", {
        userName: Config.getCurrentUserName(),
        team: Config.getTeamName(),
        sprint: Config.getSprintName(),
        criteria: sortType,
      });

      await updateBoard(sortType, false);
    },
    async refresh() {
      await updateBoard(undefined, true);
    },
  }));

  useEffect(() => {
    updateBoard(undefined, true).catch(() => {
      alert("failed to load board data. try again");
    });
  }, []);

  const visibleBoardItems = useMemo(
    () =>
      Object.fromEntries(
        columnKeys.map((key) => [key, boardItems[key].filter((item) => matchesFilters(item, filters))])
      ),
    [boardItems, filters]
  );

  function getColumns() {
    return columnKeys.map((name) => (
      <DraggableList
        key={name}
        name={name}
        displayName={!settings ? name : settings[name]}
        items={visibleBoardItems[name]}
        onBoardUpdate={updateBoard}
      />
    ));
  }

  function onDragEnd(result) {
    const { source, destination } = result;

    if (!destination) {
      return;
    }

    Config.getAxiosInstance()
      .post("/moveacrosscolumn", {
        userName: Config.getCurrentUserName(),
        _id: visibleBoardItems[source.droppableId][source.index]._id,
        type: destination.droppableId,
      })
      .then(() => updateBoard(undefined, true));

    if (source.droppableId === destination.droppableId) {
      const items = reorder(
        visibleBoardItems[source.droppableId],
        source.index,
        destination.index
      );
      setBoardItems((currentItems) => ({
        ...currentItems,
        [source.droppableId]: items,
      }));
    } else {
      const nextItems = move(
        visibleBoardItems[source.droppableId],
        visibleBoardItems[destination.droppableId],
        source,
        destination
      );

      setBoardItems((currentItems) => ({
        ...currentItems,
        [source.droppableId]: nextItems[source.droppableId],
        [destination.droppableId]: nextItems[destination.droppableId],
      }));
    }
  }

  return <DragDropContext onDragEnd={onDragEnd}>{getColumns()}</DragDropContext>;
});

export default Board;
