const express = require("express");
const app = express();
const mongoose = require("mongoose");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const config = require("./Config/config.json");

const log = require("./structs/log.js");
const error = require("./structs/error.js");
const functions = require("./structs/functions.js");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieParser());

global.JWT_SECRET = "LAWIN_BACKEND";
const PORT = 8080;

global.accessTokens = [];
global.refreshTokens = [];
global.clientTokens = [];
global.exchangeCodes = [];

mongoose.connect(config.mongodb.database, () => {
    log.backend("App successfully connected to MongoDB!");
});

mongoose.connection.on("error", err => {
    log.error("MongoDB failed to connect, please make sure you have MongoDB installed and running.");
    throw err;
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

fs.readdirSync("./routes").forEach(fileName => {
    app.use(require(`./routes/${fileName}`));
});

app.listen(PORT, () => {
    log.backend(`App started listening on port ${PORT}`);

    require("./xmpp/xmpp.js");
    require("./DiscordBot");
}).on("error", async (err) => {
    if (err.code == "EADDRINUSE") {
        log.error(`Port ${PORT} is already in use!\nClosing in 3 seconds...`);
        await functions.sleep(3000)
        process.exit(0);
    } else throw err;
});

// if endpoint not found, return this error
app.use((req, res, next) => {
    error.createError(
        "errors.com.epicgames.common.not_found", 
        "Sorry the resource you were trying to find could not be found", 
        undefined, 1004, undefined, 404, res
    );
});