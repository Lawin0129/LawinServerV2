const functions = require("../structs/functions.js");
const jwt = require("jsonwebtoken");

function createClient(clientId, grant_type, expiresIn) {
    return jwt.sign({
        "p": Buffer.from(functions.MakeID()).toString("base64"),
        "clsvc": "fortnite",
        "t": "s",
        "mver": false,
        "clid": clientId,
        "ic": true,
        "am": grant_type,
        "jti": functions.MakeID().replace(/-/ig, ""),
        "creation_date": new Date(),
        "hours_expire": expiresIn
    }, global.JWT_SECRET)
}

function createAccess(user, clientId, grant_type, deviceId, expiresIn) {
    return jwt.sign({
        "app": "fortnite",
        "sub": user.accountId,
        "dvid": deviceId,
        "mver": false,
        "clid": clientId,
        "dn": user.username,
        "am": grant_type,
        "p": Buffer.from(functions.MakeID()).toString("base64"),
        "iai": user.accountId,
        "sec": 1,
        "clsvc": "fortnite",
        "t": "s",
        "ic": true,
        "jti": functions.MakeID().replace(/-/ig, ""),
        "creation_date": new Date(),
        "hours_expire": expiresIn
    }, global.JWT_SECRET)
}

function createRefresh(user, clientId, grant_type, deviceId, expiresIn) {
    return jwt.sign({
        "sub": user.accountId,
        "dvid": deviceId,
        "t": "r",
        "clid": clientId,
        "am": grant_type,
        "jti": functions.MakeID().replace(/-/ig, ""),
        "creation_date": new Date(),
        "hours_expire": expiresIn
    }, global.JWT_SECRET)
}

module.exports = {
    createClient,
    createAccess,
    createRefresh
}