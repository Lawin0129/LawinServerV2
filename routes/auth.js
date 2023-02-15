const express = require("express");
const app = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const error = require("../structs/error.js");
const functions = require("../structs/functions.js");

const tokens = require("../model/tokens.js");
const tokenCreation = require("../tokenManager/tokenCreation.js");
const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");
const User = require("../model/user.js");

app.post("/account/api/oauth/token", async (req, res) => {
    try {
        var clientId = Buffer.from(req.headers["authorization"].split(" ")[1], "base64").toString().split(":")[0]

        if (!clientId) throw new Error("client id is empty");
    } catch (err) {
        return error.createError(
            "errors.com.epicgames.common.oauth.invalid_client",
            "It appears that your Authorization header may be invalid or not present, please verify that you are sending the correct headers.", 
            [], 1011, "invalid_client", 400, res
        );
    }

    switch (req.body.grant_type) {
        case "client_credentials":
            var ip = req.ip;

            var jwtTokens = await tokens.findOne({ clientTokens: { $exists: true }});

            if (jwtTokens.clientTokens.find(i => i.ip == ip)) {
                let index = jwtTokens.clientTokens.findIndex(i => i.ip == ip);
                await jwtTokens.updateOne({ [`clientTokens.${index}`]: [] });
                await jwtTokens.updateOne({ $pull: { "clientTokens": [] } });
            }

            const token = tokenCreation.createClient(clientId, req.body.grant_type, 4) // expires in 4 hours

            const decodedClient = jwt.decode(token);

            await jwtTokens.updateOne({ $push: { clientTokens: { token: `eg1~${token}`, ip: ip } } })

            res.json({
                access_token: `eg1~${token}`,
                expires_in: Math.round(((DateAddHours(new Date(decodedClient.creation_date), decodedClient.hours_expire).getTime()) - (new Date().getTime())) / 1000),
                expires_at: DateAddHours(new Date(decodedClient.creation_date), decodedClient.hours_expire).toISOString(),
                token_type: "bearer",
                client_id: clientId,
                internal_client: true,
                client_service: "fortnite"
            });
            return;
        break;

        case "password":
            if (!req.body.username || !req.body.password) return error.createError(
                "errors.com.epicgames.common.oauth.invalid_request",
                "Username/password is required.", 
                [], 1013, "invalid_request", 400, res
            );
            const { username: email, password: password } = req.body;

            req.user = await User.findOne({ email: email.toLowerCase() }).lean();

            if (!req.user) {
                return error.createError(
                    "errors.com.epicgames.account.invalid_account_credentials",
                    "Your e-mail and/or password are incorrect. Please check them and try again.", 
                    [], 18031, "invalid_grant", 400, res
                );
            } else {
                if (!await bcrypt.compare(password, req.user.password)) {
                    return error.createError(
                        "errors.com.epicgames.account.invalid_account_credentials",
                        "Your e-mail and/or password are incorrect. Please check them and try again.", 
                        [], 18031, "invalid_grant", 400, res
                    );
                }
            }
        break;

        case "refresh_token":
            if (!req.body.refresh_token) return error.createError(
                "errors.com.epicgames.common.oauth.invalid_request",
                "Refresh token is required.", 
                [], 1013, "invalid_request", 400, res
            );

            const refresh_token = req.body.refresh_token;
            var jwtTokens = await tokens.findOne({ refreshTokens: { $exists: true }});

            try {
                const decodedToken = jwt.decode(refresh_token.replace("eg1~", ""));

                var creation_date = new Date(decodedToken.creation_date);
                if (DateAddHours(creation_date, decodedToken.hours_expire).getTime() <= new Date().getTime()) throw new Error("Expired token.")

                if (!jwtTokens.refreshTokens.find(i => i.token == refresh_token)) throw new Error("Refresh token invalid.");
            } catch (err) {
                if (jwtTokens.refreshTokens.find(i => i.token == refresh_token)) {
                    let index = jwtTokens.refreshTokens.findIndex(i => i.token == refresh_token);
                    await jwtTokens.updateOne({ [`refreshTokens.${index}`]: [] });
                    await jwtTokens.updateOne({ $pull: { "refreshTokens": [] } });
                }

                error.createError(
                    "errors.com.epicgames.account.auth_token.invalid_refresh_token",
                    `Sorry the refresh token '${refresh_token}' is invalid`, 
                    [refresh_token], 18036, "invalid_grant", 400, res
                );

                return;
            }

            var object = jwtTokens.refreshTokens.find(i => i.token == refresh_token);
            req.user = await User.findOne({ accountId: object.accountId }).lean();
        break;

        case "exchange_code":
            if (!req.body.exchange_code) return error.createError(
                "errors.com.epicgames.common.oauth.invalid_request",
                "Exchange code is required.", 
                [], 1013, "invalid_request", 400, res
            );

            const { exchange_code: exchange_code } = req.body;

            if (!global.exchangeCodes.find(i => i.exchange_code == exchange_code)) return error.createError(
                "errors.com.epicgames.account.oauth.exchange_code_not_found",
                "Sorry the exchange code you supplied was not found. It is possible that it was no longer valid", 
                [], 18057, "invalid_grant", 400, res
            );
            
            var object = global.exchangeCodes.find(i => i.exchange_code == exchange_code);
            req.user = await User.findOne({ accountId: object.accountId }).lean();

            global.exchangeCodes.splice(global.exchangeCodes.findIndex(i => i.exchange_code == exchange_code), 1)
        break;
        
        default:
            error.createError(
                "errors.com.epicgames.common.oauth.unsupported_grant_type",
                `Unsupported grant type: ${req.body.grant_type}`, 
                [], 1016, "unsupported_grant_type", 400, res
            );
        return;
    }

    var jwtTokens = await tokens.findOne({ accessTokens: { $exists: true }, refreshTokens: { $exists: true }, clientTokens: { $exists: true } });

    if (jwtTokens.accessTokens.find(i => i.accountId == req.user.accountId)) {
        let index = jwtTokens.accessTokens.findIndex(i => i.accountId == req.user.accountId);
        await jwtTokens.updateOne({ [`accessTokens.${index}`]: [] });
        await jwtTokens.updateOne({ $pull: { "accessTokens": [] } });
    }

    if (jwtTokens.refreshTokens.find(i => i.accountId == req.user.accountId)) {
        let index = jwtTokens.refreshTokens.findIndex(i => i.accountId == req.user.accountId);
        await jwtTokens.updateOne({ [`refreshTokens.${index}`]: [] });
        await jwtTokens.updateOne({ $pull: { "refreshTokens": [] } });
    }

    const deviceId = functions.MakeID().replace(/-/ig, "");
    const accessToken = tokenCreation.createAccess(req.user, clientId, req.body.grant_type, deviceId, 8); // expires in 8 hours
    const refreshToken = tokenCreation.createRefresh(req.user, clientId, req.body.grant_type, deviceId, 24); // expires in 24 hours

    const decodedAccess = jwt.decode(accessToken);
    const decodedRefresh = jwt.decode(refreshToken);

    await jwtTokens.updateOne({ $push: { accessTokens: { accountId: req.user.accountId, token: `eg1~${accessToken}` } } });
    await jwtTokens.updateOne({ $push: { refreshTokens: { accountId: req.user.accountId, token: `eg1~${refreshToken}` } } });

    res.json({
        access_token: `eg1~${accessToken}`,
        expires_in: Math.round(((DateAddHours(new Date(decodedAccess.creation_date), decodedAccess.hours_expire).getTime()) - (new Date().getTime())) / 1000),
        expires_at: DateAddHours(new Date(decodedAccess.creation_date), decodedAccess.hours_expire).toISOString(),
        token_type: "bearer",
        refresh_token: `eg1~${refreshToken}`,
        refresh_expires: Math.round(((DateAddHours(new Date(decodedRefresh.creation_date), decodedRefresh.hours_expire).getTime()) - (new Date().getTime())) / 1000),
        refresh_expires_at: DateAddHours(new Date(decodedRefresh.creation_date), decodedRefresh.hours_expire).toISOString(),
        account_id: req.user.accountId,
        client_id: clientId,
        internal_client: true,
        client_service: "fortnite",
        displayName: req.user.username,
        app: "fortnite",
        in_app_id: req.user.accountId,
        device_id: deviceId
    })
});

app.get("/account/api/oauth/verify", verifyToken, async (req, res) => {
    var token = req.headers["authorization"].split("bearer ")[1];
    const decodedToken = jwt.decode(token.replace("eg1~", ""));

    res.json({
        token: token,
        session_id: decodedToken.jti,
        token_type: "bearer",
        client_id: decodedToken.clid,
        internal_client: true,
        client_service: "fortnite",
        account_id: req.user.accountId,
        expires_in: Math.round(((DateAddHours(new Date(decodedToken.creation_date), decodedToken.hours_expire).getTime()) - (new Date().getTime())) / 1000),
        expires_at: DateAddHours(new Date(decodedToken.creation_date), decodedToken.hours_expire).toISOString(),
        auth_method: decodedToken.am,
        display_name: req.user.username,
        app: "fortnite",
        in_app_id: req.user.accountId,
        device_id: decodedToken.dvid
    })
})

app.get("/account/api/oauth/exchange", verifyToken, async (req, res) => {
    var token = req.headers["authorization"].split("bearer ")[1];
    const exchange_code = functions.MakeID().replace(/-/ig, "");

    const decodedToken = jwt.decode(token.replace("eg1~", ""));

    global.exchangeCodes.push({
        accountId: req.user.accountId,
        exchange_code: exchange_code,
        creatingClientId: decodedToken.clid
    });

    setTimeout(() => {
        if (global.exchangeCodes.find(i => i.exchange_code == exchange_code)) {
            global.exchangeCodes.splice(global.exchangeCodes.findIndex(i => i.exchange_code == exchange_code), 1)
        }
    }, 300000) // remove exchange code in 5 minutes if unused

    res.json({
        expiresInSeconds: 300,
        code: exchange_code,
        creatingClientId: decodedToken.clid
    })
});

app.delete("/account/api/oauth/sessions/kill", verifyToken, async (req, res) => {
    var token = req.headers["authorization"].split("bearer ")[1];

    var jwtTokens = await tokens.findOne({ accessTokens: { $exists: true }, refreshTokens: { $exists: true }});

    switch (req.query.killType) {
        case "ALL":
            for (var i in jwtTokens.accessTokens) {
                if (jwtTokens.accessTokens[i].accountId == req.user.accountId) {
                    await jwtTokens.updateOne({ [`accessTokens.${i}`]: [] });
                    await jwtTokens.updateOne({ $pull: { "accessTokens": [] } });

                    if (jwtTokens.refreshTokens.find(i => i.accountId == req.user.accountId)) {
                        let index = jwtTokens.refreshTokens.findIndex(i => i.accountId == req.user.accountId);
                        await jwtTokens.updateOne({ [`refreshTokens.${index}`]: [] });
                        await jwtTokens.updateOne({ $pull: { "refreshTokens": [] } });
                    }

                    var client = global.Clients.find(x => x.accountId == req.user.accountId);
                    if (client) client.client.close();
                }
            }

            res.status(204).end();
        break;

        case "OTHERS":
            for (var i in jwtTokens.accessTokens) {
                if (jwtTokens.accessTokens[i].accountId == req.user.accountId) {
                    if (jwtTokens.accessTokens[i].token != token) {
                        var client = global.Clients.find(x => x.token == jwtTokens.accessTokens[i].token);
                        if (client) client.client.close();

                        await jwtTokens.updateOne({ [`accessTokens.${i}`]: [] });
                        await jwtTokens.updateOne({ $pull: { "accessTokens": [] } });
                    }
                }
            }

            res.status(204).end();
        break;

        case "ALL_ACCOUNT_CLIENT":
            for (var i in jwtTokens.accessTokens) {
                if (jwtTokens.accessTokens[i].accountId == req.user.accountId) {
                    await jwtTokens.updateOne({ [`accessTokens.${i}`]: [] });
                    await jwtTokens.updateOne({ $pull: { "accessTokens": [] } });

                    if (jwtTokens.refreshTokens.find(i => i.accountId == req.user.accountId)) {
                        let index = jwtTokens.refreshTokens.findIndex(i => i.accountId == req.user.accountId);
                        await jwtTokens.updateOne({ [`refreshTokens.${index}`]: [] });
                        await jwtTokens.updateOne({ $pull: { "refreshTokens": [] } });
                    }

                    var client = global.Clients.find(x => x.accountId == req.user.accountId);
                    if (client) client.client.close();
                }
            }

            res.status(204).end();
        break;

        case "OTHERS_ACCOUNT_CLIENT":
            for (var i in jwtTokens.accessTokens) {
                if (jwtTokens.accessTokens[i].accountId == req.user.accountId) {
                    if (jwtTokens.accessTokens[i].token != token) {
                        var client = global.Clients.find(x => x.token == jwtTokens.accessTokens[i].token);
                        if (client) client.client.close();

                        await jwtTokens.updateOne({ [`accessTokens.${i}`]: [] });
                        await jwtTokens.updateOne({ $pull: { "accessTokens": [] } });
                    }
                }
            }

            res.status(204).end();
        break;

        case "OTHERS_ACCOUNT_CLIENT_SERVICE":
            for (var i in jwtTokens.accessTokens) {
                if (jwtTokens.accessTokens[i].accountId == req.user.accountId) {
                    if (jwtTokens.accessTokens[i].token != token) {
                        var client = global.Clients.find(x => x.token == jwtTokens.accessTokens[i].token);
                        if (client) client.client.close();

                        await jwtTokens.updateOne({ [`accessTokens.${i}`]: [] });
                        await jwtTokens.updateOne({ $pull: { "accessTokens": [] } });
                    }
                }
            }

            res.status(204).end();
        break;

        default:
            error.createError(
                "errors.com.epicgames.common.oauth.invalid_request",
                "A valid killType is required.", 
                [], 1013, "invalid_request", 400, res
            );
        return;
    }
});

app.delete("/account/api/oauth/sessions/kill/:token", verifyClient, async (req, res) => {
    var token = req.headers["authorization"].split("bearer ")[1];

    var jwtTokens = await tokens.findOne({ accessTokens: { $exists: true }, refreshTokens: { $exists: true }, clientTokens: { $exists: true } });

    if (jwtTokens.accessTokens.find(i => i.token == token)) {
        var object = jwtTokens.accessTokens.find(i => i.token == token);

        var client = global.Clients.find(i => i.token == object.token);
        if (client) client.client.close();

        let index = jwtTokens.accessTokens.findIndex(i => i.token == token);
        await jwtTokens.updateOne({ [`accessTokens.${index}`]: [] });
        await jwtTokens.updateOne({ $pull: { "accessTokens": [] } });

        if (jwtTokens.refreshTokens.find(i => i.accountId == object.accountId)) {
            let refreshindex = jwtTokens.refreshTokens.findIndex(i => i.accountId == object.accountId);
            await jwtTokens.updateOne({ [`refreshTokens.${refreshindex}`]: [] });
            await jwtTokens.updateOne({ $pull: { "refreshTokens": [] } });
        }
    }
    if (jwtTokens.clientTokens.find(i => i.token == token)) {
        let index = jwtTokens.clientTokens.findIndex(i => i.token == token);
        await jwtTokens.updateOne({ [`clientTokens.${index}`]: [] });
        await jwtTokens.updateOne({ $pull: { "clientTokens": [] } });
    }

    res.status(204).end();
});

function GetDateAddHours(number) {
    var date = new Date();
    date.setHours(date.getHours() + number);

    return date.toISOString();
}

function DateAddHours(pdate, number) {
    var date = pdate;
    date.setHours(date.getHours() + number);

    return date;
}

module.exports = app;
