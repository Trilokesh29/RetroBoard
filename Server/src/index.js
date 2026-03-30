const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const nodeCleanup = require("node-cleanup");
const databasebroker = require("./routes/databasebroker.js");
const pdfGenerator = require("./routes/pdfmake");
const { DBConnection } = require("./database/mongo");

// defining the Express app
const app = express();
const port = process.env.PORT || 3000;
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:8081";

// adding Helmet to enhance your API's security
app.use(
    helmet({
        crossOriginResourcePolicy: false,
    })
);

app.use((req, res, next) => {
    const cookieHeader = req.headers.cookie || "";
    req.cookies = cookieHeader
        .split(";")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .reduce((cookies, entry) => {
            const separatorIndex = entry.indexOf("=");

            if (separatorIndex === -1) {
                return cookies;
            }

            const key = decodeURIComponent(entry.slice(0, separatorIndex));
            const value = decodeURIComponent(entry.slice(separatorIndex + 1));
            cookies[key] = value;
            return cookies;
        }, {});

    next();
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(
    cors({
        origin: clientOrigin,
        credentials: true,
    })
);

// adding morgan to log HTTP requests
app.use(morgan("combined"));

DBConnection.connectToMongo();

nodeCleanup(function(exitCode, signal) {
    // release resources here before node exits
    console.log("Received signal to exit");
    DBConnection.closeDB();
});

app.use(databasebroker, pdfGenerator);

// starting the server
app.listen(port, () => {
    console.log(`listening on port ${port}`);
});
