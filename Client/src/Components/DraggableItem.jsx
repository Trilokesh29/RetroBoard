import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import Item from "./Item";

function DraggableItem(props) {
  return(
    <Draggable
      key={props.id ? props.id : ""}
      draggableId={props.id}
      index={props.index}
    >
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <Item
              key={props.id}
              item={props.item}
              onRemove={props.onRemove}
              onVote={props.onVote}
              onUnvote={props.onUnvote}
              onAddActionPoint={props.onAddActionPoint}
          />
        </div>
      )}
    </Draggable>
  )
}

export default DraggableItem;
