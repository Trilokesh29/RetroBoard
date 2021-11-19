import React, { useState } from "react";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import ToggleButtonGroup from "react-bootstrap/ToggleButtonGroup";
import ToggleButton from "react-bootstrap/ToggleButton";
import Container from "react-bootstrap/Container";
import Config from "../Configuration";
import PubSub from 'pubsub-js'

const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function LoginPage() {
    const [register, setRegister] = useState(false);
    const [userName, setUserName] = useState("");
    const [email, setEmail] = useState("");
    const [userPassword, setUserPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleSubmit = (event) => {

        if (register) {
            let jsonObj = {
                userName: userName,
                emailId: email,
                password: userPassword
            }

            Config.getAxiosInstance()
                .post("/verifyAndSignUp/", jsonObj)
                .then((reply) => {
                    if (reply.data === -1) {
                        alert("UserName already exists!");
                    }
                    else {
                        localStorage.setItem("sessionId", reply.data.sessionId)
                        localStorage.setItem("userName", reply.data.userName)
                        PubSub.publish("LogInState", "loggedIn")
                    }
                })
                .catch(error => { alert("Check all the input fields") });
        }
        else {
            let jsonObj = {
                params: {
                    userName: userName,
                    password: userPassword
                }
            }

            Config.getAxiosInstance()
                .get("/authenticate/", jsonObj)
                .then((reply) => {
                    localStorage.setItem("sessionId", reply.data.sessionId)
                    localStorage.setItem("userName", reply.data.userName)
                    PubSub.publish("LogInState", "loggedIn")
                })
                .catch(error => { alert("wrong username/ password") });
        }
    };

    const renderEmailField = () => {
        if (register) {
            return (
                <Form.Group controlId="formBasicEmail">
                    <Form.Label>Email address</Form.Label>
                    <Form.Control type="email" placeholder="Enter email"
                        onChange={(e) => setEmail(e.target.value)}
                        value={email}
                        isValid={emailRegexp.test(email) && email !== ""}
                        isInvalid={!emailRegexp.test(email) || email === ""}
                        required
                    />
                </Form.Group>
            )
        }
    }

    function shouldEnableSumbit() {
        if (register) {
            return (userPassword === confirmPassword) && (!/[^a-zA-Z]/.test(userName) && userName !== "") &&
                (emailRegexp.test(email) && email !== "")
        }
        else {
            return (!/[^a-zA-Z]/.test(userName) && userName !== "") && (userPassword !== "")
        }
    }

    return (
        <Container className="mt-2 mb-2" style={{ width: "200px" }}>
            <Form noValidate  >
                <Form.Group controlId="formUserName">
                    <Form.Label>User Name</Form.Label>
                    <Form.Control placeholder="Enter User Name"
                        onChange={(e) => setUserName(e.target.value)}
                        value={userName}
                        isValid={!/[^a-zA-Z]/.test(userName) && userName !== ""}
                        isInvalid={/[^a-zA-Z]/.test(userName) || userName === ""}
                        required
                    />
                </Form.Group>

                <Form.Group controlId="formPassword">
                    <Form.Label>Password</Form.Label>
                    <Form.Control type="password"
                        placeholder="Password" onChange={(e) => setUserPassword(e.target.value)}
                        value={userPassword}
                        isValid={userPassword !== ""}
                        isInvalid={userPassword === ""}
                        required
                    />
                </Form.Group>

                {(register === true) ?
                    <Form.Group controlId="formConfirmPassword">
                        <Form.Label>Confirm Password</Form.Label>
                        <Form.Control type="Password"
                            placeholder="Confirm Password" onChange={(e) => setConfirmPassword(e.target.value)}
                            value={confirmPassword}
                            isValid={confirmPassword !== "" && confirmPassword === userPassword}
                            isInvalid={confirmPassword === "" || confirmPassword !== userPassword}
                            required
                        />
                    </Form.Group> : ""
                }

                {renderEmailField()}

                <Form.Group controlId="formLogin">
                    <ToggleButtonGroup type="radio" name="register" defaultValue="Login">
                        <ToggleButton variant="secondary" type="radio" size="sm" value="Login" onClick={() => setRegister(false)}>Log In</ToggleButton>
                        <ToggleButton variant="secondary" type="radio" size="sm" value="Register" onClick={() => setRegister(true)}>Register</ToggleButton>
                    </ToggleButtonGroup>
                </Form.Group>

                <Button
                    variant="primary"
                    disabled={!shouldEnableSumbit()}
                    onClick={handleSubmit}>
                    Submit
                </Button>
            </Form>
        </Container>
    );
}

export default LoginPage;