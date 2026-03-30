import React, { Component } from "react";

import axios from "axios";

var axiosInstance = axios.create({
  baseURL: "http://10.21.88.59:3000/"
});

class Home extends Component {
  constructor(props) {
    super(props);
    this.state = {
      items: []
    };
  }

  componentDidMount() {
    axiosInstance.get("/").then(res => {
      const board = res.data;
      console.log(board);
      this.setState({
        items: board
          .sort((a, b) => {
            if (a.name > b.name) return 1;
            else return -1;
          })
          .map(item => {
            return (
              <li>
                <a>{item.name}</a>
              </li>
            );
          })
      });
    });
  }

  render() {
    return <ul>{this.state.items}</ul>;
  }
}

export default Home;
