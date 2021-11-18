const bodyParser = require("body-parser");
const express = require("express");
// defining the Express app
const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// using bodyParser to parse JSON bodies into JS objects
app.use(bodyParser.json());

const { uuid } = require('uuidv4');

// var express = require("express");
var routes = express.Router();

const { DBClient } = require("../database/mongo");

// defining an endpoint to return all details
routes.get("/", (req, res) => {
    // res.send("Hello From Server");
});

routes.get("/sprint/:name", (req, res) => {

    DBClient.createNewSprint(req.body.name);
    DBClient.viewCompleteBoard(req.body.name)
        .then((result) => {
            res.send(result);
        })
        .catch((error) => {
            console.error(error);
        });
});

routes.get("/team/:name", (req, res) => {
    // provide the list of sprints corresponding to a team.

    DBClient.isSessionValid({ userName: req.params.userName, sessionId: req.params.sessionId, teamName: req.params.name }, true).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        DBClient.getSprintsForATeam(req.params.name)
            .then((result) => {
                res.send(result);
            })
            .catch((err) => {
                console.error(err);
            });
    });
});

routes.get("/team/:teamName/sprint/:sprintName/userName/:userName", (req, res) => {
    // provide the board details for the corresponding result

    if (!req.params && !req.params.teamName && !req.params.sprintName) {
        return res.status(400).send("Please update all the required fields!");
    }

    DBClient.isSessionValid({ userName: req.params.userName, sessionId: req.query.sessionId, teamName: req.params.teamName }, true).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        DBClient.viewCompleteBoard(req.params.teamName, req.params.sprintName)
            .then((result) => {
                DBClient.getColumnSettings(req.params.teamName)
                    .then((set) => {
                        let retunObj = {
                            items: result,
                            settings: set,
                        };

                        res.send(retunObj);
                    })
                    .catch((error) => {
                        console.error(error);
                    });
            })
            .catch((error) => {
                console.error(error);
            });
    });
});

routes.get("/getTeams", (req, res) => {

    if (!req.query.sessionId || !req.query.userName) {
        return res.status(400).send("Please update all the required fields!");
    }

    DBClient.isSessionValid({ userName: req.query.userName, sessionId: req.query.sessionId }).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        DBClient.getTeams(req.query)
            .then((result) => {
                res.send(result);
            })
            .catch((err) => {
                console.error(err);
            });
    });
});

routes.get("/getSprints", (req, res) => {

    if (!req.query.team || !req.query.userName || !req.query.sessionId) {
        return res.status(400).send("Please provide all the required fields!");
    }

    DBClient.isSessionValid({ userName: req.query.userName, sessionId: req.query.sessionId, teamName: req.query.team }, true).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        DBClient.getSprintsForATeam(req.query.team)
            .then((result) => {
                res.send(result);
            })
            .catch((err) => {
                console.error(err);
            });
    });
});

routes.post("/createSprint", (req, res) => {

    if (!req.body.team) {
        return res.status(400).send("Team name is not defined!");
    }
    if (!req.body.sprint) {
        return res.status(400).send("Sprint name is not defined!");
    }

    DBClient.isSessionValid({ userName: req.body.userName, sessionId: req.body.sessionId, teamName: req.body.team }, true).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        var sprintDbName = req.body.sprint
            .trim()
            .toLowerCase()
            .replace(/[^A-Z0-9]+/gi, "_");
        DBClient.findSprint(req.body.team, sprintDbName)
            .then((result) => {
                if (result && result.length) {
                    return res.status(400).send("Sprint exists!");
                } else {
                    let sprint = {
                        _id: uuid(),
                        team: req.body.team,
                        sprint: sprintDbName,
                    };
                    DBClient.addItemToCollection(sprint)
                        .then((result) => {
                            res.send(result);
                        })
                        .catch((error) => {
                            console.error(error);
                        });
                }
            })
            .catch((error) => {
                console.error(error);
            });
    });
});

routes.post("/createTeam", (req, res) => {

    if (!req.body.team) {
        return res.status(400).send("Team name is not defined!");
    }

    DBClient.isSessionValid({ userName: req.body.userName, sessionId: req.body.sessionId, teamName: req.body.team }, true).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        let teamDBName = req.body.team
            .trim()
            .toLowerCase()
            .replace(/[^A-Z0-9]+/gi, "_");
        DBClient.findTeam(teamDBName)
            .then((result) => {
                if (result && result.length) {
                    return res.status(400).send("Team exists!");
                } else {
                    let team = {
                        _id: uuid(),
                        team: teamDBName,
                    };
                    DBClient.addItemToCollection(team)
                        .then((result) => {
                            res.send(result);
                        })
                        .catch((error) => {
                            console.error(error);
                        });
                }
            })
            .catch((error) => {
                console.error(error);
            });
    });
});

routes.get("/Board", (req, res) => {

    DBClient.isSessionValid({ userName: req.query.userName, sessionId: req.query.sessionId }).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        DBClient.viewCompleteBoard(req.query.team, req.query.sprint)
            .then((result) => {
                res.send(result);
            })
            .catch((error) => {
                console.error(error);
            });
    });
});

routes.post("/update/:name", (req, res) => {

    if (!req.body.team ||
        !req.body.sprint ||
        !req.body.name ||
        !req.body.message ||
        !req.body.type ||
        !req.body.date
    ) {
        return res.status(400).send("Please update all the required fields!");
    }

    DBClient.isSessionValid({ userName: req.body.userName, sessionId: req.body.sessionId, teamName: req.body.team }, true).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        let item = {
            _id: uuid(),
            team: req.body.team,
            sprint: req.body.sprint,
            name: req.body.name,
            type: req.body.type,
            message: req.body.message,
            date: req.body.date,
            votes: req.body.vote,
            index: req.body.index,
        };

        DBClient.addItemToCollection(item)
            .then((result) => {
                res.send(result);
            })
            .catch((err) => {
                res.send(err);
            });
    });
});

routes.get("/search", (req, res) => {

    DBClient.isSessionValid({ userName: req.query.userName, sessionId: req.query.sessionId }).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        DBClient.viewByUserName(req.body.sprint, req.body.name)
            .then((result) => {
                res.send(result);
            })
            .catch((error) => {
                console.error(error);
            });
    });
});

routes.post("/renameColumn", (req, res) => {
    if (!req.body.team || !req.body.column || !req.body.value) {
        return res.status(400).send("Please update all the required fields!");
    }


    DBClient.isSessionValid({ userName: req.body.userName, sessionId: req.body.sessionId, teamName: req.body.team }, true).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        if (
            req.body.column !== "Good" &&
            req.body.column !== "Bad" &&
            req.body.column !== "Ugly"
        ) {
            return res.status(400).send("Undefined column name!");
        }

        DBClient.renameColumn(req.body.team, req.body.column, req.body.value)
            .then(function () {
                res.sendStatus(200);
            })
            .catch((err) => {
                res.send(err);
            });
    });
});

routes.post("/deletepost", (req, res) => {


    DBClient.isSessionValid({ userName: req.body.userName, sessionId: req.body.sessionId, teamName: req.body.team }, true).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        DBClient.deletePost(req.body)
            .then((result) => {
                if (-1 === result) {
                    return res.status(400).send("Insufficient permission");
                }
                res.send(result);
            })
            .catch((error) => {
                console.error(error);
            });
    });
});

routes.post("/addvote", (req, res) => {

    DBClient.isSessionValid({ userName: req.body.userName, sessionId: req.body.sessionId, teamName: req.body.team }, true).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        DBClient.addVote(req.body)
            .then((result) => {
                res.send(result);
            })
            .catch((error) => {
                console.error(error);
            });
    });
});

routes.post("/removevote", (req, res) => {

    DBClient.isSessionValid({ userName: req.body.userName, sessionId: req.body.sessionId, teamName: req.body.team }, true).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        DBClient.removeVote(req.body)
            .then((result) => {
                res.send(result);
            })
            .catch((error) => {
                console.error(error);
            });
    });
});

routes.post("/removehappiness", (req, res) => {

    if (!req.body || !req.body.id) {
        return res.status(400).send("id is missing!");
    }

    DBClient.isSessionValid({ userName: req.body.userName, sessionId: req.body.sessionId, teamName: req.body.team }, true).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }
        DBClient.removeHappiness(req.body)
            .then((result) => {
                res.send(result);
            })
            .catch((error) => {
                console.error(error);
            });
    });
});

routes.post("/addactionpoint", (req, res) => {

    DBClient.isSessionValid({ userName: req.body.userName, sessionId: req.body.sessionId, teamName: req.body.team }, true).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        DBClient.addActionPointToItem(req.body)
            .then((result) => {
                res.send(result);
            })
            .catch((error) => {
                console.error(error);
            });
    });

});

routes.post("/updateHappiness", (req, res) => {

    if (!req.body ||
        !req.body.team ||
        !req.body.sprint ||
        !req.body.name ||
        !req.body.happiness
    ) {
        return res.status(400).send("Please update all the required fields!");
    }

    DBClient.isSessionValid({ userName: req.body.userName, sessionId: req.body.sessionId, teamName: req.body.team }, true).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        let myQuery = {
            _id: uuid(),
            team: req.body.team,
            sprint: req.body.sprint,
            name: req.body.name,
            happiness: req.body.happiness,
        };
        DBClient.updateHappiness(myQuery)
            .then((result) => {
                res.send(result);
            })
            .catch((error) => {
                console.error(error);
            });
    });
});

routes.post("/setVelocity", (req, res) => {
    if (!req.body ||
        !req.body.team ||
        !req.body.sprint ||
        !req.body.spPlanned ||
        !req.body.spBurnt ||
        !req.body.pi ||
        !req.body.bbAccuracy
    ) {
        return res.status(400).send("Please update all the required fields!");
    }


    DBClient.isSessionValid({ userName: req.body.userName, sessionId: req.body.sessionId, teamName: req.body.team }, true).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        DBClient.setVelocity(req.body)
            .then((result) => {
                res.send(result);
            })
            .catch((error) => {
                console.error(error);
            });
    });
});

routes.post("/setSortingCriteria", (req, res) => {
    if (!req.body || !req.body.team ||
        !req.body.sprint || !req.body.criteria) {
        return res.status(400).send("Please update all the required fields!");
    }

    DBClient.isSessionValid({ userName: req.body.userName, sessionId: req.body.sessionId, teamName: req.body.team }, true).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        DBClient.setSortingCriteria(req.body.team, req.body.sprint, req.body.criteria)
            .then((result) => {
                res.send(result);
            })
            .catch((error) => {
                console.error(error);
            });
    });
});


routes.get("/getSortingCriteria", (req, res) => {
    if (!req.query || !req.query.team ||
        !req.query.sprint) {
        return res.status(400).send("Please update all the required fields!");
    }

    DBClient.isSessionValid({ userName: req.query.userName, sessionId: req.query.sessionId }).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        DBClient.getSortingCriteria(req.query.team, req.query.sprint)
            .then((result) => {
                res.send(result);
            })
            .catch((error) => {
                console.error(error);
            });
    });
});

routes.get("/checkIfVotingAllowed", (req, res) => {
    if (!req.query || !req.query.team ||
        !req.query.sprint) {
        return res.status(400).send("Please update all the required fields!");
    }

    DBClient.isSessionValid({ userName: req.query.userName, sessionId: req.query.sessionId }).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        DBClient.checkIfVotingAllowed(req.query)
            .then((result) => {
                res.send(result);
            })
            .catch((error) => {
                console.error(error);
            });
    });
});

routes.get("/getVelocityForSprint", (req, res) => {

    if (!req.query || !req.query.team || !req.query.sprint) {
        return res.status(400).send("Missing field!");
    }

    DBClient.isSessionValid({ userName: req.query.userName, sessionId: req.query.sessionId, teamName: req.query.team }, true).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        let query = {
            team: req.query.team,
            sprint: req.query.sprint,
        };

        DBClient.getVelocity(query)
            .then((result) => {
                res.send(result);
            })
            .catch((error) => {
                console.error(error);
            });
    });
});

routes.get("/getHappinessForASprint", (req, res) => {

    if (!req.query || !req.query.team || !req.query.sprint) {
        return res.status(400).send("Please update all the required fields!");
    }

    DBClient.isSessionValid({ userName: req.query.userName, sessionId: req.query.sessionId, teamName: req.query.team }, true).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        let query = {
            team: req.query.team,
            sprint: req.query.sprint,
        };
        DBClient.getHappinessForASprint(query)
            .then((result) => {
                res.send(result);
            })
            .catch((error) => {
                console.error(error);
            });
    });
});

routes.get("/getAvgHappinessForASprint", (req, res) => {

    if (!req.query || !req.query.team || !req.query.sprint) {
        return res.status(400).send("Please update all the required fields!");
    }

    DBClient.isSessionValid({ userName: req.query.userName, sessionId: req.query.sessionId, teamName: req.query.team }, true).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        let query = {
            team: req.query.team,
            sprint: req.query.sprint,
        };
        DBClient.getAvgHappinessForASprint(query)
            .then((result) => {
                res.send(result);
            })
            .catch((error) => {
                console.error(error);
            });
    });
});

routes.get("/getTopVotedItemsForASprint", (req, res) => {

    if (!req.query || !req.query.team || !req.query.sprint) {
        return res.status(400).send("Please update all the required fields!");
    }

    DBClient.isSessionValid({ userName: req.query.userName, sessionId: req.query.sessionId, teamName: req.query.team }, true).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        let query = {
            team: req.query.team,
            sprint: req.query.sprint,
        };

        DBClient.getTopVotedItemsForASprint(query)
            .then((result) => {
                DBClient.getColumnSettings(req.query.team)
                    .then((setting) => {
                        let retData = {
                            items: result,
                            settings: setting,
                        };
                        res.send(retData);
                    })
                    .catch((error) => {
                        console.error(error);
                    });
            })
            .catch((error) => {
                console.error(error);
            });
    });
});

routes.post("/moveacrosscolumn", (req, res) => {

    if (!req.body._id || !req.body.type) {
        return res.status(400).send("Please update all the required fields!");
    }

    DBClient.moveAcrossColumn(req.body)
        .then((result) => {
            res.send(result);
        })
        .catch((error) => {
            console.error(error);
        });
});

routes.post("/editSprintNameOfATeam", (req, res) => {
    if (!req.body || !req.body.team || !req.body.sprint || !req.body.newSprint) {
        return res.status(400).send("Please update all the required fields!");
    }

    DBClient.editSprintNameOfATeam(req.body)
        .then((result) => {
            res.send(result);
        })
        .catch((error) => {
            console.error(error);
        });
});

routes.post("/editNameOfATeam", (req, res) => {
    if (!req.body || !req.body.team || !req.body.newTeam) {
        return res.status(400).send("Please update all the required fields!");
    }

    DBClient.editNameOfATeam(req.body)
        .then((result) => {
            res.send(result);
        })
        .catch((error) => {
            console.error(error);
        });
});

routes.post("/move", (req, res) => {

    if (!req.body._id || !req.body.type || !req.body.index) {
        return res.status(400).send("Please update all the required fields!");
    }

    DBClient.moveAnItem(req.body)
        .then((result) => {
            res.send(result);
        })
        .catch((error) => {
            console.error(error);
        });
});

routes.get("/getActionItemsForASprint", (req, res) => {
    if (!req.query || !req.query.team || !req.query.sprint) {
        return res.status(400).send("Please update all the required fields!");
    }

    DBClient.isSessionValid({ userName: req.query.userName, sessionId: req.query.sessionId }).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        let query = {
            team: req.query.team,
            sprint: req.query.sprint,
        };
        DBClient.getActionItemsForASprint(query)
            .then((result) => {
                res.send(result);
            })
            .catch((error) => {
                console.error(error);
            });
    });
});

routes.get("/getPIListForATeam", (req, res) => {
    if (!req.query || !req.query.team) {
        return res.status(400).send("Please update all the required fields!");
    }

    DBClient.isSessionValid({ userName: req.query.userName, sessionId: req.query.sessionId }).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        let query = {
            team: req.query.team,
        };
        DBClient.getPIListForATeam(query)
            .then((result) => {
                res.send(result);
            })
            .catch((error) => {
                console.error(error);
            });
    });
});

routes.get("/getSprintsForAPI", (req, res) => {

    if (!req.query || !req.query.team) {
        return res.status(400).send("Please update all the required fields!");
    }

    DBClient.isSessionValid({ userName: req.query.userName, sessionId: req.query.sessionId }).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        let query = {
            team: req.query.team,
            pi: req.query.pi,
        };

        DBClient.getSprintsForAPI(query)
            .then((result) => {
                res.send(result);
            })
            .catch((error) => {
                console.error(error);
            });
    });


});

routes.post("/verifyAndSignUp", (req, res) => {

    if (!req.body.userName || !req.body.emailId || !req.body.password) {
        return res.status(400).send("Please provide all the required fields!");
    }

    const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailRegexp.test(req.body.emailId)) {
        return res.status(400).send("Please provide valid username / email address");
    }

    let signUpData = {
        _id: uuid(),
        userName: req.body.userName.toLowerCase(),
        emailId: req.body.emailId.toLowerCase(),
        password: req.body.password,
        role: ['user'],
        teams: ["test_playground", "ehv_psa_all"]
    }

    DBClient.verifyAndSignUp(signUpData)
        .then((result) => {
            if (-2 === result) {
                return res.status(400).send({
                    message: "Failed to signup!"
                })
            }

            res.send(result);
        })
        .catch((error) => {
            console.error(error);
        });
});

routes.get("/authenticate", (req, res) => {

    if (!req.query || !req.query.userName || !req.query.password) {
        return res.status(400).send("Please update all the required fields!");
    }

    DBClient.authenticate(req.query)
        .then((result) => {
            if (-1 === result) {
                return res.status(400).send("UserName/Password is incorrect!");
            }
            res.send(result);
        })
        .catch((error) => {
            console.error(error);
        });
});


module.exports = routes;