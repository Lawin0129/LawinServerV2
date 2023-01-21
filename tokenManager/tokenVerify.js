const jwt = require("jsonwebtoken");

const tokens = require("../model/tokens.js");
const User = require("../model/user.js");
const error = require("../structs/error.js");

async function verifyToken(req, res, next) {
    if (!req.headers["authorization"] || !req.headers["authorization"].startsWith("bearer eg1~")) return error.createError(
        "errors.com.epicgames.common.authorization.authorization_failed",
        `Authorization failed for ${req.originalUrl}`, 
        [req.originalUrl], 1032, undefined, 401, res
    );

    const token = req.headers["authorization"].split("bearer eg1~")[1];
    var jwtTokens = await tokens.findOne({ accessTokens: { $exists: true }, refreshTokens: { $exists: true }, clientTokens: { $exists: true } });

    try {
        const decodedToken = jwt.decode(token);

        if (!jwtTokens.accessTokens.find(i => i.token == `eg1~${token}`)) throw new Error("Invalid token.");

        var creation_date = new Date(decodedToken.creation_date);
        if (DateAddHours(creation_date, decodedToken.hours_expire).getTime() <= new Date().getTime()) throw new Error("Expired token.")

        req.user = await User.findOne({ accountId: decodedToken.sub }).lean();

        if (req.user.banned == true) return error.createError(
            "errors.com.epicgames.account.account_not_active",
            "Sorry, your account is inactive and may not login.", 
            [], -1, undefined, 400, res
        );

        next();
    } catch (err) {
        if (jwtTokens.accessTokens.find(i => i.token == `eg1~${token}`)) {
            let index = jwtTokens.accessTokens.findIndex(i => i.token == `eg1~${token}`);
            await jwtTokens.updateOne({ [`accessTokens.${index}`]: [] });
            await jwtTokens.updateOne({ $pull: { "accessTokens": [] } });
        }
        
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
    var jwtTokens = await tokens.findOne({ accessTokens: { $exists: true }, refreshTokens: { $exists: true }, clientTokens: { $exists: true } });

    try {
        const decodedToken = jwt.decode(token);

        if (!jwtTokens.accessTokens.find(i => i.token == `eg1~${token}`) && !jwtTokens.clientTokens.find(i => i.token == `eg1~${token}`)) throw new Error("Invalid token.");

        var creation_date = new Date(decodedToken.creation_date);
        if (DateAddHours(creation_date, decodedToken.hours_expire).getTime() <= new Date().getTime()) throw new Error("Expired token.")

        if (jwtTokens.accessTokens.find(i => i.token == `eg1~${token}`)) {
            req.user = await User.findOne({ accountId: decodedToken.sub }).lean();

            if (req.user.banned == true) return error.createError(
                "errors.com.epicgames.account.account_not_active",
                "Sorry, your account is inactive and may not login.", 
                [], -1, undefined, 400, res
            );
        }

        next();
    } catch (err) {
        if (jwtTokens.accessTokens.find(i => i.token == `eg1~${token}`)) {
            let index = jwtTokens.accessTokens.findIndex(i => i.token == `eg1~${token}`);
            await jwtTokens.updateOne({ [`accessTokens.${index}`]: [] });
            await jwtTokens.updateOne({ $pull: { "accessTokens": [] } });
        }
        if (jwtTokens.clientTokens.find(i => i.token == `eg1~${token}`)) {
            let index = jwtTokens.clientTokens.findIndex(i => i.token == `eg1~${token}`);
            await jwtTokens.updateOne({ [`clientTokens.${index}`]: [] });
            await jwtTokens.updateOne({ $pull: { "clientTokens": [] } });
        }
        
        return error.createError(
            "errors.com.epicgames.common.authorization.authorization_failed",
            `Authorization failed for ${req.originalUrl}`, 
            [req.originalUrl], 1032, undefined, 401, res
        );
    }
}

function DateAddHours(pdate, number) {
    var date = pdate;
    date.setHours(date.getHours() + number);

    return date;
}

module.exports = {
    verifyToken,
    verifyClient
}