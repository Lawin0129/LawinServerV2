const jwt = require("jsonwebtoken");

const User = require("../model/user.js");
const functions = require("../structs/functions.js");
const error = require("../structs/error.js");

// verify access tokens
async function verifyToken(req, res, next) {
    const authErr = () => createAuthorizationError(req, res);

    if (!isValidAuthorizationHeader(req.headers["authorization"], "bearer eg1~")) return authErr();

    const token = req.headers["authorization"].replace("bearer eg1~", "");

    try {
        const decodedToken = jwt.decode(token);

        if (!isTokenValid(global.accessTokens, token)) throw new Error("Invalid token.");

        if (isTokenExpired(decodedToken.creation_date, decodedToken.hours_expire)) {
            throw new Error("Expired access token.");
        }

        req.user = await User.findOne({ accountId: decodedToken.sub }).lean();

        if (await checkBannedUser(req, res)) return;

        next();
    } catch {
        handleTokenError(token);
        return authErr();
    }
}

// verify access/client tokens (this shit i was stuck on for a while)
async function verifyClient(req, res, next) {
    const authErr = () => createAuthorizationError(req, res);

    if (!isValidAuthorizationHeader(req.headers["authorization"], "bearer eg1~")) return authErr();

    const token = req.headers["authorization"].replace("bearer eg1~", "");

    try {
        const decodedToken = jwt.decode(token);

        const findAccess = global.accessTokens.find(i => i.token === `eg1~${token}`);

        if (!findAccess && !isTokenValid(global.clientTokens, token)) {
            throw new Error("Invalid token.");
        }

        if (isTokenExpired(decodedToken.creation_date, decodedToken.hours_expire)) {
            throw new Error("Expired access/client token.");
        }

        if (findAccess) {
            req.user = await User.findOne({ accountId: decodedToken.sub }).lean();

            if (await checkBannedUser(req, res)) return;
        }

        next();
    } catch (err) {
        handleTokenError(token);
        return authErr();
    }
}

// function to check if the authorization header is valid
function isValidAuthorizationHeader(authorizationHeader, expectedPrefix) {
    return authorizationHeader && authorizationHeader.startsWith(expectedPrefix);
}

// function to check if a token is valid
function isTokenValid(tokensArray, token) {
    return tokensArray.some(i => i.token === `eg1~${token}`);
}

// function to check if a token is expired
function isTokenExpired(creationDate, hoursExpire) {
    return dateAddHours(new Date(creationDate), hoursExpire).getTime() <= new Date().getTime();
}

// function to handle token removal and update
function handleTokenError(token) {
    const accessIndex = global.accessTokens.findIndex(i => i.token === `eg1~${token}`);
    const clientIndex = global.clientTokens.findIndex(i => i.token === `eg1~${token}`);
    handleTokenRemovalAndRefresh(token, accessIndex, clientIndex);
}

// function to create an authorization error
function createAuthorizationError(req, res) {
    return error.createError(
        "errors.com.epicgames.common.authorization.authorization_failed",
        `Authorization failed for ${req.originalUrl}`,
        [req.originalUrl], 1032, undefined, 401, res
    );
}

// function to update tokens after removal
function handleTokenRemovalAndRefresh(token, accessIndex, clientIndex) {
    if (accessIndex !== -1) {
        global.accessTokens.splice(accessIndex, 1);
    }

    if (clientIndex !== -1) {
        global.clientTokens.splice(clientIndex, 1);
    }

    functions.UpdateTokens();
}

// function to add hours to a date
function dateAddHours(pdate, number) {
    const date = new Date(pdate);
    date.setHours(date.getHours() + number);
    return date;
}

// function to check if a user is banned
async function checkBannedUser(req, res) {
    if (req.user && req.user.banned) {
        await createAuthorizationError(req, res);
        return true;
    }
    return false;
}

module.exports = {
    verifyToken,
    verifyClient,
    isValidAuthorizationHeader,
    isTokenValid,
    isTokenExpired,
    handleTokenError,
    handleTokenRemovalAndRefresh,
    createAuthorizationError,
    dateAddHours,
    checkBannedUser
};
