import React, { useState, useEffect } from "react";
import Navbar from 'react-bootstrap/Navbar'
import Button from 'react-bootstrap/Button'
import Col from "react-bootstrap/Col";
import Config from "../Configuration";
import PubSub from 'pubsub-js'

const teamNameToIgnore = "http:";
const KChangeInVoteIdentifier = 'Change In Vote';
const KLogInStateChangeIdentifier = "LogInState";

function Header() {

	const [totalVote, updateVote] = useState("");
	const [loginState, updateLoginState] = useState("");

	useEffect(() => {
		updateVoteCountForASprint(Config.getTeamName(), Config.getSprintName());
	}, []);


	PubSub.subscribe(KChangeInVoteIdentifier, function (msg, data) {
		updateVoteCountForASprint(Config.getTeamName(), Config.getSprintName());
	});

	PubSub.subscribe(KLogInStateChangeIdentifier, function (msg, data) {
		if (data === "loggedIn") {
			updateLoginState("loggedIn");
		}
	});

	const updateVoteCountForASprint = async (teamName, sprintName) => {

		if (teamName !== teamNameToIgnore) {
			let reqData = {
				params: {
					userName: localStorage.getItem("userName"),
					sessionId: localStorage.getItem("sessionId"),
					team: teamName,
					sprint: sprintName
				},
			};
			Config.getAxiosInstance().get("checkIfVotingAllowed", reqData).then(result => {
				updateVote(result.data[1]);
			})
		}
	}

	function checkIfVoteCountShouldBeDisplayed() {
		const regEx = RegExp(".+/team/.*/sprint/.*");
		let validBoard = regEx.test(window.location.href);

		if (validBoard && loginState !== "loggedOut") {

			updateVoteCountForASprint(Config.getTeamName(), Config.getSprintName());

			return <Col> <div class="float-right" style={{ padding: 10 }}>
				<form style={{
					backgroundColor: 'orange',
				}}><Col><h2>{"Vote Count " + totalVote}</h2></Col></form>
			</div><br /></Col>
		}
	}

	function logOut() {
		localStorage.removeItem("sessionId")
		localStorage.removeItem("userName")
		updateLoginState("loggedOut")
		PubSub.publish("LogInState", "loggedOut");
	}

	return (
		<div>
			<Navbar bg="light" variant="green" width="30">
				<Navbar.Brand href="/">
					<i className="fas fa-paw" />
				PandaBoard
			</Navbar.Brand>
				<div>
					{(loginState !== "loggedOut" && loginState !== "") || (localStorage.getItem("userName")) ? "[" + localStorage.getItem("userName") + "]" : ""}
				</div>
				<Button variant="link" onClick={logOut}>Log out</Button>
				{checkIfVoteCountShouldBeDisplayed()}
			</Navbar>
		</div >
	)
}

export default Header;
