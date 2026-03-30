import React from "react";
import MenuList from "./MenuList";

function Menu() {
  const showSprints = window.location.pathname.startsWith("/team/");

  return (
    <div className="sidebar-card">
      <MenuList
        getItemsQuery={showSprints ? "/getSprints" : "/getTeams"}
        createNewItemQuery={showSprints ? "/createSprint" : "/createTeam"}
        itemName={showSprints ? "sprint" : "team"}
      />
    </div>
  );
}

export default Menu;
