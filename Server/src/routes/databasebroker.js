const express = require("express");
var routes = express.Router();

const { createIdentifier } = require("../auth/security");
const { DBClient } = require("../database/mongo");
const { getSprintMetrics, listBoardSprints, validateConfiguration } = require("../integrations/jira");

const SESSION_COOKIE_NAME = "retroboard_session";
const minimumPasswordLength = 8;
const userNameRegexp = /^[a-zA-Z][a-zA-Z0-9_-]{2,31}$/;
const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const jiraBoardIdRegexp = /^[0-9]+$/;

function parseJiraBoardUrl(boardUrl) {
    if (!boardUrl) {
        return null;
    }

    try {
        const parsedUrl = new URL(String(boardUrl).trim());
        const boardMatch =
            parsedUrl.pathname.match(/\/jira\/software\/c\/projects\/([^/]+)\/boards\/(\d+)/i) ||
            parsedUrl.pathname.match(/\/boards\/(\d+)/i);

        if (!boardMatch) {
            return null;
        }

        return {
            baseUrl: `${parsedUrl.protocol}//${parsedUrl.host}`,
            projectKey: boardMatch[2] ? String(boardMatch[1] || "").toUpperCase() : "",
            boardId: boardMatch[2] || boardMatch[1],
        };
    }
    catch (error) {
        return null;
    }
}

function getSessionToken(req) {
    return req.cookies ? req.cookies[SESSION_COOKIE_NAME] : null;
}

function getCookieOptions() {
    return {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 7,
        path: "/",
    };
}

function setSessionCookie(res, sessionToken) {
    res.cookie(SESSION_COOKIE_NAME, sessionToken, getCookieOptions());
}

function clearSessionCookie(res) {
    res.clearCookie(SESSION_COOKIE_NAME, getCookieOptions());
}

function buildAuthResponse(user) {
    return {
        user: {
            userName: user.userName,
            emailId: user.emailId,
            role: user.role,
            teams: user.teams,
        },
    };
}

function normalizeTeamIntegration(integration) {
    const jira = integration && integration.jira ? integration.jira : {};
    const isJiraEnabled = Boolean(jira.enabled);
    const parsedBoard = parseJiraBoardUrl(jira.boardUrl);

    return {
        jira: {
            enabled: isJiraEnabled,
            boardUrl: isJiraEnabled ? String(jira.boardUrl || "").trim() : "",
            baseUrl: isJiraEnabled ? String(jira.baseUrl || parsedBoard?.baseUrl || "").trim().replace(/\/+$/, "") : "",
            boardId: isJiraEnabled ? String(jira.boardId || parsedBoard?.boardId || "").trim() : "",
            projectKey: isJiraEnabled ? String(jira.projectKey || parsedBoard?.projectKey || "").trim().toUpperCase() : "",
            userName: isJiraEnabled ? String(jira.userName || "").trim() : "",
            apiToken: isJiraEnabled ? String(jira.apiToken || "").trim() : "",
        },
    };
}

function validateTeamIntegration(integration) {
    const jira = integration.jira;

    if (!jira.enabled) {
        return null;
    }

    if (!jira.boardUrl || !jira.userName || !jira.apiToken) {
        return "Please provide the Jira board URL, username/email, and API token.";
    }

    if (!jiraBoardIdRegexp.test(jira.boardId)) {
        return "Please provide a valid Jira board URL.";
    }

    return null;
}

routes.get("/auth/session", async (req, res) => {
    const sessionToken = getSessionToken(req);

    if (!sessionToken) {
        return res.status(401).send("Authentication required");
    }

    const authenticatedUser = await DBClient.getUserForSession(sessionToken);

    if (!authenticatedUser) {
        clearSessionCookie(res);
        return res.status(401).send("Session expired. Please log in again.");
    }

    res.send(buildAuthResponse(authenticatedUser));
});

routes.post("/logout", async (req, res) => {
    const sessionToken = getSessionToken(req);

    if (sessionToken) {
        await DBClient.revokeSession(sessionToken);
    }

    clearSessionCookie(res);
    res.sendStatus(204);
});

routes.get("/health", (req, res) => {
    res.send({ status: "ok" });
});

routes.use(async (req, res, next) => {
    try {
        const publicRoutes = new Set(["/", "/health", "/auth/session", "/logout", "/verifyAndSignUp", "/authenticate"]);

        if (publicRoutes.has(req.path)) {
            return next();
        }

        const sessionToken = getSessionToken(req);

        if (!sessionToken) {
            return res.status(401).send("Authentication required");
        }

        const authenticatedUser = await DBClient.getUserForSession(sessionToken);

        if (!authenticatedUser) {
            clearSessionCookie(res);
            return res.status(401).send("Session expired. Please log in again.");
        }

        req.auth = authenticatedUser;
        req.query = {
            ...req.query,
            userName: req.query.userName || authenticatedUser.userName,
            sessionId: req.query.sessionId || sessionToken,
        };
        req.body = {
            ...req.body,
            userName: req.body.userName || authenticatedUser.userName,
            sessionId: req.body.sessionId || sessionToken,
        };

        next();
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Unable to validate the current session.");
    }
});

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

    DBClient.isSessionValid({ userName: req.query.userName, sessionId: req.query.sessionId, teamName: req.params.name }, true).then(isValidSession => {

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

    DBClient.isSessionValid({ userName: req.query.userName, sessionId: req.query.sessionId, teamName: req.params.teamName }, true).then(isValidSession => {

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

routes.get("/getTeamConfiguration", async (req, res) => {

    if (!req.query.team) {
        return res.status(400).send("Team name is not defined!");
    }

    try {
        const teamConfiguration = await DBClient.getTeamConfiguration(req.query.team);
        res.send(teamConfiguration);
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Unable to load the team configuration.");
    }
});

routes.get("/getSprints", (req, res) => {

    if (!req.query.team || !req.query.userName || !req.query.sessionId) {
        return res.status(400).send("Please provide all the required fields!");
    }

    DBClient.isSessionValid({ userName: req.query.userName, sessionId: req.query.sessionId, teamName: req.query.team }, true).then(async isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        try {
            const teamConfiguration = await DBClient.getTeamConfiguration(req.query.team);

            if (teamConfiguration.jira && teamConfiguration.jira.enabled) {
                const jiraSprints = await listBoardSprints(teamConfiguration.jira);
                return res.send(jiraSprints.map((entry) => entry.name));
            }

            const result = await DBClient.getSprintsForATeam(req.query.team);
            res.send(result);
        }
        catch (err) {
            console.error(err);
            res.status(502).send("Unable to load sprints right now.");
        }
    });
});

routes.post("/createSprint", (req, res) => {

    if (!req.body.team) {
        return res.status(400).send("Team name is not defined!");
    }
    if (!req.body.sprint) {
        return res.status(400).send("Sprint name is not defined!");
    }

    DBClient.isSessionValid({ userName: req.body.userName, sessionId: req.body.sessionId, teamName: req.body.team }, true).then(async isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        const teamConfiguration = await DBClient.getTeamConfiguration(req.body.team);
        if (teamConfiguration.jira && teamConfiguration.jira.enabled) {
            return res.status(400).send("This team's sprints are synced from Jira. Create the sprint in Jira and refresh RetroBoard.");
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
                        _id: createIdentifier(),
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

    DBClient.isSessionValid({ userName: req.body.userName, sessionId: req.body.sessionId, teamName: req.body.team }, true).then(async isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        const integration = normalizeTeamIntegration(req.body.integration);
        const integrationValidationError = validateTeamIntegration(integration);

        if (integrationValidationError) {
            return res.status(400).send(integrationValidationError);
        }

        let teamDBName = req.body.team
            .trim()
            .toLowerCase()
            .replace(/[^A-Z0-9]+/gi, "_");

        if (integration.jira.enabled) {
            try {
                await validateConfiguration(integration.jira);
            }
            catch (error) {
                console.error(error);
                return res.status(400).send("We couldn't connect to Jira with those details. Please verify the board, URL, and credentials.");
            }
        }

        DBClient.findTeam(teamDBName)
            .then(async (result) => {
                if (result && result.length) {
                    return res.status(400).send("Team exists!");
                } else {
                    let team = {
                        _id: createIdentifier(),
                        team: teamDBName,
                    };
                    DBClient.addItemToCollection(team)
                        .then(async (result) => {
                            await DBClient.setTeamConfiguration(teamDBName, integration);
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
            _id: createIdentifier(),
            team: req.body.team,
            sprint: req.body.sprint,
            name: req.auth.userName,
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

routes.post("/applyColumnTemplate", (req, res) => {
    if (
        !req.body.team ||
        !req.body.columns ||
        !req.body.columns.Good ||
        !req.body.columns.Bad ||
        !req.body.columns.Ugly
    ) {
        return res.status(400).send("Please update all the required fields!");
    }

    DBClient.isSessionValid({ userName: req.body.userName, sessionId: req.body.sessionId, teamName: req.body.team }, true).then(isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        DBClient.applyColumnTemplate(req.body.team, req.body.columns)
            .then(() => {
                res.sendStatus(200);
            })
            .catch((error) => {
                console.error(error);
                res.status(500).send("Failed to apply the selected template.");
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
            _id: createIdentifier(),
            team: req.body.team,
            sprint: req.body.sprint,
            name: req.auth.userName,
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

routes.post("/setVelocity", async (req, res) => {
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


    DBClient.isSessionValid({ userName: req.body.userName, sessionId: req.body.sessionId, teamName: req.body.team }, true).then(async isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        const teamConfiguration = await DBClient.getTeamConfiguration(req.body.team);
        if (teamConfiguration.jira && teamConfiguration.jira.enabled) {
            return res.status(400).send("Velocity for this team is synced from Jira and can't be edited manually.");
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

    DBClient.isSessionValid({ userName: req.query.userName, sessionId: req.query.sessionId, teamName: req.query.team }, true).then(async isValidSession => {

        if (!isValidSession) {
            return res.status(400).send("Invalid Session! Login Please");
        }

        try {
            const teamConfiguration = await DBClient.getTeamConfiguration(req.query.team);
            let query = {
                team: req.query.team,
                sprint: req.query.sprint,
            };

            if (teamConfiguration.jira && teamConfiguration.jira.enabled) {
                try {
                    const jiraMetrics = await getSprintMetrics(teamConfiguration.jira, req.query.sprint);
                    await DBClient.setVelocity({
                        team: req.query.team,
                        sprint: req.query.sprint,
                        ...jiraMetrics,
                    });
                }
                catch (jiraError) {
                    console.error(jiraError);
                    const cachedVelocity = await DBClient.getVelocity(query);
                    if (cachedVelocity && cachedVelocity.length) {
                        return res.send(cachedVelocity);
                    }

                    return res.status(502).send("Unable to sync sprint metrics from Jira.");
                }
            }

            const result = await DBClient.getVelocity(query);
            res.send(result);
        }
        catch (error) {
            console.error(error);
            res.status(502).send("Unable to load sprint metrics right now.");
        }
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

routes.post("/deleteSprint", async (req, res) => {
    if (!req.body || !req.body.team || !req.body.sprint) {
        return res.status(400).send("Please update all the required fields!");
    }

    const isValidSession = await DBClient.isSessionValid({
        userName: req.body.userName,
        sessionId: req.body.sessionId,
        teamName: req.body.team
    }, true);

    if (!isValidSession) {
        return res.status(400).send("Invalid Session! Login Please");
    }

    const teamConfiguration = await DBClient.getTeamConfiguration(req.body.team);
    if (teamConfiguration.jira && teamConfiguration.jira.enabled) {
        return res.status(400).send("This sprint comes from Jira. Delete or close it in Jira instead.");
    }

    try {
        await DBClient.deleteSprint(req.body.team, req.body.sprint);
        res.sendStatus(200);
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Unable to delete that sprint.");
    }
});

routes.post("/deleteTeam", async (req, res) => {
    if (!req.body || !req.body.team) {
        return res.status(400).send("Please update all the required fields!");
    }

    const isValidSession = await DBClient.isSessionValid({
        userName: req.body.userName,
        sessionId: req.body.sessionId,
        teamName: req.body.team
    }, true);

    if (!isValidSession) {
        return res.status(400).send("Invalid Session! Login Please");
    }

    try {
        await DBClient.deleteTeam(req.body.team);
        res.sendStatus(200);
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Unable to delete that team.");
    }
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

routes.post("/verifyAndSignUp", async (req, res) => {

    if (!req.body.userName || !req.body.emailId || !req.body.password) {
        return res.status(400).send("Please provide all the required fields!");
    }

    const normalizedUserName = req.body.userName.trim().toLowerCase();
    const normalizedEmail = req.body.emailId.trim().toLowerCase();

    if (!userNameRegexp.test(normalizedUserName)) {
        return res.status(400).send("User name must start with a letter and be 3-32 characters long.");
    }

    if (!emailRegexp.test(normalizedEmail)) {
        return res.status(400).send("Please provide valid username / email address");
    }

    if (req.body.password.length < minimumPasswordLength) {
        return res.status(400).send("Password must be at least 8 characters long.");
    }

    let signUpData = {
        userName: normalizedUserName,
        emailId: normalizedEmail,
        password: req.body.password,
        role: ['user'],
        teams: ["test_playground", "ehv_psa_all"]
    }

    try {
        const user = await DBClient.verifyAndSignUp(signUpData);

        if (-1 === user) {
            return res.status(409).send("That username or email is already registered.");
        }

        if (-2 === user) {
            return res.status(400).send({
                message: "Failed to signup!"
            })
        }

        const sessionToken = await DBClient.createSession({ _id: user.id });
        setSessionCookie(res, sessionToken);
        res.send(buildAuthResponse(user));
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Unable to complete signup right now.");
    }
});

routes.get("/authenticate", (req, res) => {
    res.status(405).send("Use POST /authenticate");
});

routes.post("/authenticate", async (req, res) => {

    if (!req.body || !req.body.userName || !req.body.password) {
        return res.status(400).send("Please update all the required fields!");
    }

    try {
        const user = await DBClient.authenticate({
            userName: req.body.userName.trim().toLowerCase(),
            password: req.body.password,
        });

        if (-1 === user) {
            return res.status(400).send("UserName/Password is incorrect!");
        }

        const sessionToken = await DBClient.createSession({ _id: user.id });
        setSessionCookie(res, sessionToken);
        res.send(buildAuthResponse(user));
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Unable to complete authentication right now.");
    }
});


module.exports = routes;
module.exports._test = {
    buildAuthResponse,
    getCookieOptions,
    getSessionToken,
    normalizeTeamIntegration,
    parseJiraBoardUrl,
    validateTeamIntegration,
};
