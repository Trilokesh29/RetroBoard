import React, { Component } from "react";
import Item from "./Item";
import itemsData from "../Data/items";
import Button from "react-bootstrap/Button";
import ListGroup from "react-bootstrap/ListGroup";
import AddItemInputForm from "./AddItemInputForm";

import axios from "axios";

var axiosInstance = axios.create({
    baseURL: "http://10.21.88.59:3000/"
        /* other custom settings */
});

class Column extends Component {
    constructor(props) {
        super(props);
        this.state = {
            items: []
        };

        this.handleSubmit = this.handleSubmit.bind(this);
    }

    getDataAndPopulateTheBoard() {
        const sprint = {
            sprint: "sprint_2006"
        };
        axiosInstance.get("/Board", sprint).then(res => {
                const board = res.data;
                console.log(board);
                this.setState({
                        items: board
                            .filter(item => item.type === this.props.name)
                            .map(item => < Item key = { item.id }
                                item = { item }
                                />)
                            });
                });
        }

        componentDidMount() {
            this.getDataAndPopulateTheBoard();
        }

        handleSubmit(aName, aText, aDate) {
            let jsonObj = {
                sprint: "sprint_2008",
                name: aName,
                type: this.props.name,
                message: aText,
                date: aDate,
                vote: 7
            };

            axiosInstance
                .post("/update/Person", jsonObj)
                .then(_ => this.getDataAndPopulateTheBoard());
        }

        render() {
            return ( <
                div className = "col-sm" >
                <
                h1 > { this.props.name } < /h1> <ListGroup> {this.state.items} </ListGroup > { " " } <
                AddItemInputForm onSubmit = { this.handleSubmit }
                />{" "} <
                /div>
            );
        }
    }

    export default Column;