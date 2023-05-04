const jwt = require("jsonwebtoken");

const User = require("../model/user.js");
const error = require("../structs/error.js");

async function verifyToken(req, res, next) {
    let authErr = () => error.createError(
        "errors.com.epicgames.common.authorization.authorization_failed",
        `Authorization failed for ${req.originalUrl}`, 
        [req.originalUrl], 1032, undefined, 401, res
    );

    if (!req.headers["authorization"] || !req.headers["authorization"].startsWith("bearer eg1~")) return authErr();

    const token = req.headers["authorization"].replace("bearer eg1~", "");

    try {
        const decodedToken = jwt.verify(token, global.JWT_SECRET);

        if (!global.accessTokens.find(i => i.token == `eg1~${token}`)) throw new Error("Invalid token.");

        req.user = await User.findOne({ accountId: decodedToken.sub }).lean();

        if (req.user.banned) return error.createError(
            "errors.com.epicgames.account.account_not_active",
            "You have been permanently banned from Fortnite.", 
            [], -1, undefined, 400, res
        );

        next();
    } catch {
        let accessIndex = global.accessTokens.findIndex(i => i.token == `eg1~${token}`);
        if (accessIndex != -1) global.accessTokens.splice(accessIndex, 1);
        
        return authErr();
    }
}

async function verifyClient(req, res, next) {
    let authErr = () => error.createError(
        "errors.com.epicgames.common.authorization.authorization_failed",
        `Authorization failed for ${req.originalUrl}`, 
        [req.originalUrl], 1032, undefined, 401, res
    );

    if (!req.headers["authorization"] || !req.headers["authorization"].startsWith("bearer eg1~")) return authErr();

    const token = req.headers["authorization"].replace("bearer eg1~", "");

    try {
        const decodedToken = jwt.verify(token, global.JWT_SECRET);

        let findAccess = global.accessTokens.find(i => i.token == `eg1~${token}`);

        if (!findAccess && !global.clientTokens.find(i => i.token == `eg1~${token}`)) throw new Error("Invalid token.");

        if (findAccess) {
            req.user = await User.findOne({ accountId: decodedToken.sub }).lean();

            if (req.user.banned) return error.createError(
                "errors.com.epicgames.account.account_not_active",
                "You have been permanently banned from Fortnite.", 
                [], -1, undefined, 400, res
            );
        }

        next();
    } catch (err) {
        let accessIndex = global.accessTokens.findIndex(i => i.token == `eg1~${token}`);
        if (accessIndex != -1) global.accessTokens.splice(accessIndex, 1);

        let clientIndex = global.clientTokens.findIndex(i => i.token == `eg1~${token}`);
        if (clientIndex != -1) global.clientTokens.splice(clientIndex, 1);
        
        return authErr();
    }
}

module.exports = {
    verifyToken,
    verifyClient
}