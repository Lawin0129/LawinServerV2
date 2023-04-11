const jwt = require("jsonwebtoken");

const User = require("../model/user.js");
const error = require("../structs/error.js");

async function verifyToken(req, res, next) {
    let authErr = error.createError(
        "errors.com.epicgames.common.authorization.authorization_failed",
        `Authorization failed for ${req.originalUrl}`, 
        [req.originalUrl], 1032, undefined
    );

    if (!req.headers["authorization"] || !req.headers["authorization"].startsWith("bearer eg1~")) return res.status(401).json(authErr);

    const token = req.headers["authorization"].replace("bearer eg1~", "");

    try {
        const decodedToken = jwt.verify(token, global.JWT_SECRET);

        if (!global.accessTokens.find(i => i.token == `eg1~${token}`)) throw new Error("Invalid token.");

        req.user = await User.findOne({ accountId: decodedToken.sub }).lean();

        if (req.user.banned) return res.status(400).json(error.createError(
            "errors.com.epicgames.account.account_not_active",
            "Sorry, your account is inactive and may not login.", 
            [], -1, undefined)
        );

        next();
    } catch {
        let accessIndex = global.accessTokens.findIndex(i => i.token == `eg1~${token}`);
        if (accessIndex != -1) global.accessTokens.splice(accessIndex, 1);
        
        return res.status(401).json(authErr);
    }
}

async function verifyClient(req, res, next) {
    let authErr = error.createError(
        "errors.com.epicgames.common.authorization.authorization_failed",
        `Authorization failed for ${req.originalUrl}`, 
        [req.originalUrl], 1032, undefined
    );

    if (!req.headers["authorization"] || !req.headers["authorization"].startsWith("bearer eg1~")) return res.status(401).json(authErr);

    const token = req.headers["authorization"].replace("bearer eg1~", "");

    try {
        const decodedToken = jwt.verify(token, global.JWT_SECRET);

        let findAccess = global.accessTokens.find(i => i.token == `eg1~${token}`);

        if (!findAccess && !global.clientTokens.find(i => i.token == `eg1~${token}`)) throw new Error("Invalid token.");

        if (findAccess) {
            req.user = await User.findOne({ accountId: decodedToken.sub }).lean();

            if (req.user.banned) return res.status(400).json(error.createError(
                "errors.com.epicgames.account.account_not_active",
                "Sorry, your account is inactive and may not login.", 
                [], -1, undefined)
            );
        }

        next();
    } catch (err) {
        let accessIndex = global.accessTokens.findIndex(i => i.token == `eg1~${token}`);
        if (accessIndex != -1) global.accessTokens.splice(accessIndex, 1);

        let clientIndex = global.clientTokens.findIndex(i => i.token == `eg1~${token}`);
        if (clientIndex != -1) global.clientTokens.splice(clientIndex, 1);
        
        return res.status(401).json(authErr);
    }
}

module.exports = {
    verifyToken,
    verifyClient
}