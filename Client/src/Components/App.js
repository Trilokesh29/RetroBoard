import React, { useState } from "react";
import Header from "./Header";
import Body from "./Body";
import Footer from "./Footer";
import LoginPage from "./LoginPage";
import PubSub from 'pubsub-js'

const KLogInStateChangeIdentifier = "LogInState";

function App() {

    const [loginState, setLoginState] = useState("");

    PubSub.subscribe(KLogInStateChangeIdentifier, function (msg, data) {
        if (data === "loggedOut") {
            setLoginState("loggedOut");
        }
        if (data === "loggedIn") {
            setLoginState("loggedIn");
        }
    });


    return (

        <div className="App" >
            <link
                rel="stylesheet"
                href="https://maxcdn.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css"
                integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T"
                crossOrigin="anonymous"
            />
            <Header />
            {
                (localStorage.getItem("sessionId") === null) && (localStorage.getItem("userName") === null || (loginState === "loggedOut")) ?
                    (<LoginPage />) :
                    (<Body />)
            }
            <Footer />
        </div>
    );
}

export default App;