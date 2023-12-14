const express = require("express");
const app = express();
const mongoose = require("mongoose");
const fs = require("fs");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const config = JSON.parse(fs.readFileSync("./Config/config.json").toString());

const log = require("./structs/log.js");
const error = require("./structs/error.js");
const functions = require("./structs/functions.js");

if (!fs.existsSync("./ClientSettings")) fs.mkdirSync("./ClientSettings");

global.JWT_SECRET = functions.MakeID();
const PORT = 8080;

const tokens = JSON.parse(fs.readFileSync("./tokenManager/tokens.json").toString());

for (let tokenType in tokens) {
    for (let tokenIndex in tokens[tokenType]) {
        let decodedToken = jwt.decode(tokens[tokenType][tokenIndex].token.replace("eg1~", ""));

        if (DateAddHours(new Date(decodedToken.creation_date), decodedToken.hours_expire).getTime() <= new Date().getTime()) {
            tokens[tokenType].splice(Number(tokenIndex), 1);
        }
    }
}

fs.writeFileSync("./tokenManager/tokens.json", JSON.stringify(tokens, null, 2));
log.log(" ▄▄▄     ▄▄▄▄▄▄ ▄     ▄ ▄▄▄ ▄▄    ▄    ▄▄▄▄▄▄▄ ▄▄▄▄▄▄▄ ▄▄▄▄▄▄   ▄▄   ▄▄ ▄▄▄▄▄▄▄ ▄▄▄▄▄▄      ▄▄   ▄▄ ▄▄▄▄▄▄▄ ");
log.log("█   █   █      █ █ ▄ █ █   █  █  █ █  █       █       █   ▄  █ █  █ █  █       █   ▄  █    █  █ █  █       █");
log.log("█   █   █  ▄   █ ██ ██ █   █   █▄█ █  █  ▄▄▄▄▄█    ▄▄▄█  █ █ █ █  █▄█  █    ▄▄▄█  █ █ █    █  █▄█  █▄▄▄▄   █");
log.log("█   █   █ █▄█  █       █   █       █  █ █▄▄▄▄▄█   █▄▄▄█   █▄▄█▄█       █   █▄▄▄█   █▄▄█▄   █       █▄▄▄▄█  █");
log.log("█   █▄▄▄█      █       █   █  ▄    █  █▄▄▄▄▄  █    ▄▄▄█    ▄▄  █       █    ▄▄▄█    ▄▄  █  █       █ ▄▄▄▄▄▄█");
log.log("█       █  ▄   █   ▄   █   █ █ █   █   ▄▄▄▄▄█ █   █▄▄▄█   █  █ ██     ██   █▄▄▄█   █  █ █   █     ██ █▄▄▄▄▄ ");
log.log("█▄▄▄▄▄▄▄█▄█ █▄▄█▄▄█ █▄▄█▄▄▄█▄█  █▄▄█  █▄▄▄▄▄▄▄█▄▄▄▄▄▄▄█▄▄▄█  █▄█ █▄▄▄█ █▄▄▄▄▄▄▄█▄▄▄█  █▄█    █▄▄▄█ █▄▄▄▄▄▄▄█");

global.accessTokens = tokens.accessTokens;
global.refreshTokens = tokens.refreshTokens;
global.clientTokens = tokens.clientTokens;

global.exchangeCodes = [];



mongoose.connect(config.mongodb.database, () => {
    log.backend("Backend successfully connected to MongoDB!");
});

mongoose.connection.on("error", err => {
    log.error("MongoDB failed to connect, please make sure you have MongoDB installed and running.");
    throw err;
});

app.use(rateLimit({ windowMs: 0.5 * 60 * 1000, max: 45 }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

fs.readdirSync("./routes").forEach(fileName => {
    app.use(require(`./routes/${fileName}`));
});



app.listen(PORT, () => {
    log.backend(`LawinServerV2 started listening on port ${PORT}`);

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

function DateAddHours(pdate, number) {
    let date = pdate;
    date.setHours(date.getHours() + number);

    return date;
}
