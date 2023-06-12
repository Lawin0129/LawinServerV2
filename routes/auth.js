const express = require("express");
const app = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const error = require("../structs/error.js");
const functions = require("../structs/functions.js");

const tokenCreation = require("../tokenManager/tokenCreation.js");
const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");
const User = require("../model/user.js");

app.post("/account/api/oauth/token", async (req, res) => {
    let clientId;

    try {
        clientId = functions.DecodeBase64(req.headers["authorization"].split(" ")[1]).split(":");

        if (!clientId[1]) throw new Error("invalid client id");

        clientId = clientId[0];
    } catch {
        return error.createError(
            "errors.com.epicgames.common.oauth.invalid_client",
            "It appears that your Authorization header may be invalid or not present, please verify that you are sending the correct headers.", 
            [], 1011, "invalid_client", 400, res
        );
    }

    switch (req.body.grant_type) {
        case "client_credentials":
            let ip = req.ip;

            let clientToken = global.clientTokens.findIndex(i => i.ip == ip);
            if (clientToken != -1) global.clientTokens.splice(clientToken, 1);

            const token = tokenCreation.createClient(clientId, req.body.grant_type, ip, 4); // expires in 4 hours

            functions.UpdateTokens();

            const decodedClient = jwt.decode(token);

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

        case "password":
            if (!req.body.username || !req.body.password) return error.createError(
                "errors.com.epicgames.common.oauth.invalid_request",
                "Username/password is required.", 
                [], 1013, "invalid_request", 400, res
            );
            const { username: email, password: password } = req.body;

            req.user = await User.findOne({ email: email.toLowerCase() }).lean();

            let err = () => error.createError(
                "errors.com.epicgames.account.invalid_account_credentials",
                "Your e-mail and/or password are incorrect. Please check them and try again.", 
                [], 18031, "invalid_grant", 400, res
            );

            if (!req.user) return err();
            else {
                if (!await bcrypt.compare(password, req.user.password)) return err();
            }
        break;

        case "refresh_token":
            if (!req.body.refresh_token) return error.createError(
                "errors.com.epicgames.common.oauth.invalid_request",
                "Refresh token is required.", 
                [], 1013, "invalid_request", 400, res
            );

            const refresh_token = req.body.refresh_token;

            let refreshToken = global.refreshTokens.findIndex(i => i.token == refresh_token);
            let object = global.refreshTokens[refreshToken];

            try {
                if (refreshToken == -1) throw new Error("Refresh token invalid.");
                let decodedRefreshToken = jwt.decode(refresh_token.replace("eg1~", ""));

                if (DateAddHours(new Date(decodedRefreshToken.creation_date), decodedRefreshToken.hours_expire).getTime() <= new Date().getTime()) {
                    throw new Error("Expired refresh token.");
                }
            } catch {
                if (refreshToken != -1) {
                    global.refreshTokens.splice(refreshToken, 1);

                    functions.UpdateTokens();
                }

                error.createError(
                    "errors.com.epicgames.account.auth_token.invalid_refresh_token",
                    `Sorry the refresh token '${refresh_token}' is invalid`, 
                    [refresh_token], 18036, "invalid_grant", 400, res
                );

                return;
            }

            req.user = await User.findOne({ accountId: object.accountId }).lean();
        break;

        case "exchange_code":
            if (!req.body.exchange_code) return error.createError(
                "errors.com.epicgames.common.oauth.invalid_request",
                "Exchange code is required.", 
                [], 1013, "invalid_request", 400, res
            );

            const { exchange_code } = req.body;

            let index = global.exchangeCodes.findIndex(i => i.exchange_code == exchange_code);
            let exchange = global.exchangeCodes[index];

            if (index == -1) return error.createError(
                "errors.com.epicgames.account.oauth.exchange_code_not_found",
                "Sorry the exchange code you supplied was not found. It is possible that it was no longer valid", 
                [], 18057, "invalid_grant", 400, res
            );

            global.exchangeCodes.splice(index, 1);
            
            req.user = await User.findOne({ accountId: exchange.accountId }).lean();
        break;
        
        default:
            error.createError(
                "errors.com.epicgames.common.oauth.unsupported_grant_type",
                `Unsupported grant type: ${req.body.grant_type}`, 
                [], 1016, "unsupported_grant_type", 400, res
            );
        return;
    }

    if (req.user.banned) return error.createError(
        "errors.com.epicgames.account.account_not_active",
        "You have been permanently banned from Fortnite.", 
        [], -1, undefined, 400, res
    );

    let refreshIndex = global.refreshTokens.findIndex(i => i.accountId == req.user.accountId);
    if (refreshIndex != -1) global.refreshTokens.splice(refreshIndex, 1);

    let accessIndex = global.accessTokens.findIndex(i => i.accountId == req.user.accountId);
    if (accessIndex != -1) {
        global.accessTokens.splice(accessIndex, 1);

        let xmppClient = global.Clients.find(i => i.accountId == req.user.accountId);
        if (xmppClient) xmppClient.client.close();
    }

    const deviceId = functions.MakeID().replace(/-/ig, "");
    const accessToken = tokenCreation.createAccess(req.user, clientId, req.body.grant_type, deviceId, 8); // expires in 8 hours
    const refreshToken = tokenCreation.createRefresh(req.user, clientId, req.body.grant_type, deviceId, 24); // expires in 24 hours

    functions.UpdateTokens();

    const decodedAccess = jwt.decode(accessToken);
    const decodedRefresh = jwt.decode(refreshToken);

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
    });
});

app.get("/account/api/oauth/verify", verifyToken, (req, res) => {
    let token = req.headers["authorization"].replace("bearer ", "");
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
    });
});

app.get("/account/api/oauth/exchange", verifyToken, (req, res) => {
    return res.status(400).json({
        "error": "This endpoint is deprecated, please use the discord bot to generate an exchange code."
    });
    // remove the return code above if you still want to make use of this endpoint

    let token = req.headers["authorization"].replace("bearer ", "");
    const exchange_code = functions.MakeID().replace(/-/ig, "");

    const decodedToken = jwt.decode(token.replace("eg1~", ""));

    global.exchangeCodes.push({
        accountId: req.user.accountId,
        exchange_code: exchange_code,
        creatingClientId: decodedToken.clid
    });

    setTimeout(() => {
        let exchangeCode = global.exchangeCodes.findIndex(i => i.exchange_code == exchange_code);

        if (exchangeCode != -1) global.exchangeCodes.splice(exchangeCode, 1);
    }, 300000) // remove exchange code in 5 minutes if unused

    res.json({
        expiresInSeconds: 300,
        code: exchange_code,
        creatingClientId: decodedToken.clid
    });
});

app.delete("/account/api/oauth/sessions/kill", (req, res) => {
    res.status(204).end();
});

app.delete("/account/api/oauth/sessions/kill/:token", (req, res) => {
    let token = req.params.token;

    let accessIndex = global.accessTokens.findIndex(i => i.token == token);

    if (accessIndex != -1) {
        let object = global.accessTokens[accessIndex];

        global.accessTokens.splice(accessIndex, 1);

        let xmppClient = global.Clients.find(i => i.token == object.token);
        if (xmppClient) xmppClient.client.close();

        let refreshIndex = global.refreshTokens.findIndex(i => i.accountId == object.accountId);
        if (refreshIndex != -1) global.refreshTokens.splice(refreshIndex, 1);
    }
    
    let clientIndex = global.clientTokens.findIndex(i => i.token == token);
    if (clientIndex != -1) global.clientTokens.splice(clientIndex, 1);

    if (accessIndex != -1 || clientIndex != -1) functions.UpdateTokens();

    res.status(204).end();
});

app.post("/auth/v1/oauth/token", async (req, res) => {
    res.json({
        access_token: "lawinsaccesstokenlol",
        token_type: "bearer",
        expires_at: "9999-12-31T23:59:59.999Z",
        features: [
            "AntiCheat",
            "Connect",
            "Ecom"
        ],
        organization_id: "lawinsorganizationidlol",
        product_id: "prod-fn",
        sandbox_id: "fn",
        deployment_id: "lawinsdeploymentidlol",
        expires_in: 3599
    });
})

app.post("/epic/oauth/v2/token", async (req, res) => {
    let clientId;

    try {
        clientId = functions.DecodeBase64(req.headers["authorization"].split(" ")[1]).split(":");

        if (!clientId[1]) throw new Error("invalid client id");

        clientId = clientId[0];
    } catch {
        return error.createError(
            "errors.com.epicgames.common.oauth.invalid_client",
            "It appears that your Authorization header may be invalid or not present, please verify that you are sending the correct headers.", 
            [], 1011, "invalid_client", 400, res
        );
    }

    if (!req.body.refresh_token) return error.createError(
        "errors.com.epicgames.common.oauth.invalid_request",
        "Refresh token is required.", 
        [], 1013, "invalid_request", 400, res
    );

    const refresh_token = req.body.refresh_token;

    let refreshToken = global.refreshTokens.findIndex(i => i.token == refresh_token);
    let object = global.refreshTokens[refreshToken];

    try {
        if (refreshToken == -1) throw new Error("Refresh token invalid.");
        let decodedRefreshToken = jwt.decode(refresh_token.replace("eg1~", ""));

        if (DateAddHours(new Date(decodedRefreshToken.creation_date), decodedRefreshToken.hours_expire).getTime() <= new Date().getTime()) {
            throw new Error("Expired refresh token.");
        }
    } catch {
        if (refreshToken != -1) {
            global.refreshTokens.splice(refreshToken, 1);

            functions.UpdateTokens();
        }

        error.createError(
            "errors.com.epicgames.account.auth_token.invalid_refresh_token",
            `Sorry the refresh token '${refresh_token}' is invalid`, 
            [refresh_token], 18036, "invalid_grant", 400, res
        );

        return;
    }

    req.user = await User.findOne({ accountId: object.accountId }).lean();

    res.json({
        scope: req.body.scope || "basic_profile friends_list openid presence",
        token_type: "bearer",
        access_token: "lawinsaccesstokenlol",
        refresh_token: "lawinsrefreshtokenlol",
        id_token: "lawinsidtokenlol",
        expires_in: 7200,
        expires_at: "9999-12-31T23:59:59.999Z",
        refresh_expires_in: 28800,
        refresh_expires_at: "9999-12-31T23:59:59.999Z",
        account_id: req.user.accountId,
        client_id: clientId,
        application_id: "lawinsacpplicationidlol",
        selected_account_id: req.user.accountId,
        merged_accounts: []
    });
})

function DateAddHours(pdate, number) {
    let date = pdate;
    date.setHours(date.getHours() + number);

    return date;
}

module.exports = app;
