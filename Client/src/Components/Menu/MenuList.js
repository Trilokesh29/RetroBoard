import React, { Component } from "react";
import Nav from "react-bootstrap/Nav";
import CreateItemForm from "./CreateItemForm";
import Config from "../../Configuration";
import stringSimilarity from "string-similarity";
import { Dropdown } from 'react-bootstrap';

class MenuList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      items: [],
      teams: [],
    };
    this.updateList = this.updateList.bind(this);
    this.handleSearch = this.handleSearch.bind(this);
  }

  componentDidMount() {
    this.updateList();
  }

  updateList() {
    var jsonObj = {};

    if (this.props.getItemsQuery === "/getTeams") {
      jsonObj = {
        params: {
          userName: localStorage.getItem("userName"),
          sessionId: localStorage.getItem("sessionId")
        },
      };
    }

    if (this.props.getItemsQuery === "/getSprints") {
      jsonObj = {
        params: {
          userName: localStorage.getItem("userName"),
          sessionId: localStorage.getItem("sessionId"),
          team: Config.getTeamName()
        },
      };
    }

    var baseUrl = Config.getBaseUrl();

    Config.getAxiosInstance()
      .get(this.props.getItemsQuery, jsonObj)
      .then((res) => {
        this.setState({
          items: res.data.map((item) => {
            var ref = "";
            if (this.props.getItemsQuery === "/getSprints") {
              ref =
                baseUrl + "team/" + Config.getTeamName() + "/sprint/" + item;
            } else if (this.props.getItemsQuery === "/getTeams") {
              ref = baseUrl + "team/" + item;

              this.state.teams.push(item);
            }
            return (
              <Nav.Link key={item} href={ref}>
                {" "}
                {item}{" "}
              </Nav.Link>
            );
          }),
        });
      });
  }

  handleSubmit(jsonObj) {
    jsonObj["userName"] = localStorage.getItem("userName");
    jsonObj["sessionId"] = localStorage.getItem("sessionId");

    Config.getAxiosInstance()
      .post(this.createNewItemQuery, jsonObj)
      .then((_) => this.updateList());
  }

  updateDisplay(listOfTeams) {
    var baseUrl = Config.getBaseUrl();
    this.setState({
      items: listOfTeams.map((item) => {
        var ref = baseUrl + "team/" + item;

        return (
          <Nav.Link key={item} href={ref}>
            {" "}
            {item}{" "}
          </Nav.Link>
        );
      }),
    });
  }

  updateTeamsListForPerfectMatch(itemName, index) {
    //remove elements before index
    this.state.teams.splice(0, index);

    //update the index
    index = this.state.teams.findIndex((data) => data === itemName);

    //remove elements after index
    this.state.teams.splice(index + 1, this.state.teams.length - 1 - index);
  }

  handleSearch(event) {
    // console.log("name search : " + event.target.value);

    if (
      event.target.value.length > 1 &&
      this.state.items &&
      this.state.teams &&
      this.state.teams.length
    ) {
      let matching = stringSimilarity.findBestMatch(
        event.target.value.toLowerCase(),
        this.state.teams
      );

      matching.ratings.sort(function (a, b) {
        return b.rating - a.rating;
      });

      // sort the display list as per the ratings obtained
      this.state.teams.sort(function (a, b) {
        let indexOfA = matching.ratings.findIndex((data) => data.target === a);
        let indexOfB = matching.ratings.findIndex((data) => data.target === b);

        return indexOfA - indexOfB;
      });

      matching.ratings.forEach((indexInfo) => {
        /*         console.log(
                  "name = " + indexInfo.target + " rating = " + indexInfo.rating
                ); */

        // we have a perfect match
        if (indexInfo.rating === 1) {
          this.state.teams.forEach((teamInfo, index) => {
            if (indexInfo.target === teamInfo) {
              this.updateTeamsListForPerfectMatch(indexInfo.target, index);
            }
          });
        } else if (indexInfo.rating < 0.05) {
          // we have less than 5% match, this filter can be modified
          this.state.teams.forEach((teamInfo, index) => {
            if (indexInfo.target === teamInfo) {
              /*               console.log(
                              "item to be removed == " +
                                indexInfo.target +
                                " index = " +
                                index
                            ); */

              this.state.teams.splice(index, 1);
            }
          });
        }
      });
      // console.log("List to be rendered = " + this.state.teams);
      this.updateDisplay(this.state.teams);
    } else if (event.target.value.length === 0) {
      // console.log("Reset the team list");
      let empty = [];
      this.setState({ teams: empty });
      this.updateList();
    }
  }

  checkIfSearchOptionIsRequired() {
    if (this.props.getItemsQuery === "/getTeams") {
      return (
        <form>
          <input
            type="text"
            name="searchBox"
            placeholder="Search Team..."
            onChange={(e) => {
              this.handleSearch(e);
            }}
            onKeyPress={(e) => {
              e.key === "Enter" && e.preventDefault();
            }}
          />{" "}
          <p> {this.state.query} </p> <h4> Registered Teams </h4>{" "}
        </form>
      );
    }

    return <h4> List Of Sprints </h4>;
  }

  displayAppropriateTextAndCondeseLongList(action)
  {
    var items = this.state.items;

    if(action !== "condense")
    { 
      return (<h7> Select from complete list </h7>)
    }
    else
    {
      return(
        <div>
          {items.slice(Math.max(items.length - 10, 0))}
        </div>) 
    }
  }

  render() {
    return (
      <Nav defaultActiveKey="/" className="flex-column">
        <link
          rel="stylesheet"
          href="https://use.fontawesome.com/releases/v5.7.0/css/all.css"
          integrity="sha384-lZN37f5QGtY3VHgisS14W3ExzMWZxybE1SJSEsQp9S+oqd12jhcu+A56Ebc1zFSJ"
          crossOrigin="anonymous"
        ></link>{" "}
        <h3>
          <i className="fas fa-bars"> </i> Menu{" "}
        </h3>{" "}
        <div> {this.checkIfSearchOptionIsRequired()} </div>         
        <div className='dropdown'>
        <Dropdown>
        <Dropdown.Toggle 
          variant="secondary btn-sm" 
        id="dropdown-advanced">
          {this.displayAppropriateTextAndCondeseLongList()}
        </Dropdown.Toggle>
        <Dropdown.Menu style={{backgroundColor:'#73a47'}}>
          {this.state.items}{" "}
        </Dropdown.Menu>
        </Dropdown>
                {this.displayAppropriateTextAndCondeseLongList("condense")}
        </div>

        <CreateItemForm
          onSubmit={this.handleSubmit}
          itemName={this.props.itemName}
          createNewItemQuery={this.props.createNewItemQuery}
          updateList={this.updateList}
        />{" "}
      </Nav>
    );
  }
}

export default MenuList;
