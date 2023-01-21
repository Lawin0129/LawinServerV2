const express = require("express");
const app = express();
const mongoose = require("mongoose");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const config = require("./Config/config.json");

const tokens = require("./model/tokens.js");
const log = require("./structs/log.js");
const error = require("./structs/error.js");
const functions = require("./structs/functions.js");

global.JWT_SECRET = "LAWIN_BACKEND";
const PORT = 8080;

global.exchangeCodes = [];

mongoose.connect(config.mongodb.database, () => {
    log.backend("App successfully connected to MongoDB!");

    async function createTokens() {
        if (!await tokens.findOne({ accessTokens: { $exists: true }, refreshTokens: { $exists: true }, clientTokens: { $exists: true } })) {
            await tokens.create({});
        } else {
            var jwtTokens = await tokens.findOne({ accessTokens: { $exists: true }, refreshTokens: { $exists: true }, clientTokens: { $exists: true } });

            for (var i in jwtTokens) {
                if (Array.isArray(jwtTokens[i])) {
                    for (var x in jwtTokens[i]) {
                        try {
                            let object = jwtTokens[i][x];
                            let decodedToken = jwt.decode(object.token.split("eg1~")[1]);

                            if (DateAddHours(new Date(decodedToken.creation_date), decodedToken.hours_expire).getTime() <= new Date().getTime()) {
                                await jwtTokens.updateOne({ [`${i}.${x}`]: [] });
                                await jwtTokens.updateOne({ $pull: { [`${i}`]: [] } });
                            }
                        } catch {}
                    }
                }
            }
        }

        function DateAddHours(pdate, number) {
            var date = pdate;
            date.setHours(date.getHours() + number);
        
            return date;
        }
    }
    
    createTokens();
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