const jwt = require("jsonwebtoken");

const User = require("../model/user.js");
const error = require("../structs/error.js");

async function verifyToken(req, res, next) {
    if (!req.headers["authorization"] || !req.headers["authorization"].startsWith("bearer eg1~")) return error.createError(
        "errors.com.epicgames.common.authorization.authorization_failed",
        `Authorization failed for ${req.originalUrl}`, 
        [req.originalUrl], 1032, undefined, 401, res
    );

    const token = req.headers["authorization"].split("bearer eg1~")[1];

    try {
        const decodedToken = jwt.verify(token, global.JWT_SECRET);

        if (!global.accessTokens.find(i => i.token == `eg1~${token}`)) throw new Error("Invalid token.");

        req.user = await User.findOne({ accountId: decodedToken.sub }).lean();

        if (req.user.banned == true) return error.createError(
            "errors.com.epicgames.account.account_not_active",
            "Sorry, your account is inactive and may not login.", 
            [], -1, undefined, 400, res
        );

        next();
    } catch (err) {
        if (global.accessTokens.find(i => i.token == `eg1~${token}`)) global.accessTokens.splice(global.accessTokens.findIndex(i => i.token == `eg1~${token}`), 1);
        
        return error.createError(
            "errors.com.epicgames.common.authorization.authorization_failed",
            `Authorization failed for ${req.originalUrl}`, 
            [req.originalUrl], 1032, undefined, 401, res
        );
    }
}

async function verifyClient(req, res, next) {
    if (!req.headers["authorization"] || !req.headers["authorization"].startsWith("bearer eg1~")) return error.createError(
        "errors.com.epicgames.common.authorization.authorization_failed",
        `Authorization failed for ${req.originalUrl}`, 
        [req.originalUrl], 1032, undefined, 401, res
    );

    const token = req.headers["authorization"].split("bearer eg1~")[1];

    try {
        const decodedToken = jwt.verify(token, global.JWT_SECRET);

        if (!global.accessTokens.find(i => i.token == `eg1~${token}`) && !global.clientTokens.find(i => i.token == `eg1~${token}`)) throw new Error("Invalid token.");

        if (global.accessTokens.find(i => i.token == `eg1~${token}`)) {
            req.user = await User.findOne({ accountId: decodedToken.sub }).lean();

            if (req.user.banned == true) return error.createError(
                "errors.com.epicgames.account.account_not_active",
                "Sorry, your account is inactive and may not login.", 
                [], -1, undefined, 400, res
            );
        }

        next();
    } catch (err) {
        if (global.accessTokens.find(i => i.token == `eg1~${token}`)) global.accessTokens.splice(global.accessTokens.findIndex(i => i.token == `eg1~${token}`), 1);
        if (global.clientTokens.find(i => i.token == `eg1~${token}`)) global.clientTokens.splice(global.clientTokens.findIndex(i => i.token == `eg1~${token}`), 1);
        
        return error.createError(
            "errors.com.epicgames.common.authorization.authorization_failed",
            `Authorization failed for ${req.originalUrl}`, 
            [req.originalUrl], 1032, undefined, 401, res
        );
    }
}

module.exports = {
    verifyToken,
    verifyClient
}