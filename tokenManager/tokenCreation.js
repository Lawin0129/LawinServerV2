const functions = require("../structs/functions.js");
const jwt = require("jsonwebtoken");

function createToken(payload, secret, expiresIn, tokenType) {
    const token = jwt.sign({
        ...payload,
        "jti": functions.MakeID().replace(/-/ig, ""),
        "creation_date": new Date(),
        "hours_expire": expiresIn
    }, secret, { expiresIn: `${expiresIn}h` });

    switch (tokenType) {
        case 'client':
            global.clientTokens.push({ ip: payload.ip, token: `eg1~${token}` });
            break;
        case 'access':
            global.accessTokens.push({ accountId: payload.sub, token: `eg1~${token}` });
            break;
        case 'refresh':
            global.refreshTokens.push({ accountId: payload.sub, token: `eg1~${token}` });
            break;
        default:
            throw new Error("Invalid token type");
    }

    return token;
}

function createClient(clientId, grant_type, ip, expiresIn) {
    return createToken({
        "p": Buffer.from(functions.MakeID()).toString("base64"),
        "clsvc": "fortnite",
        "t": "s",
        "mver": false,
        "clid": clientId,
        "ic": true,
        "am": grant_type,
        "ip": ip
    }, global.JWT_SECRET, expiresIn, 'client');
}

function createAccess(user, clientId, grant_type, deviceId, expiresIn) {
    return createToken({
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
        "ic": true
    }, global.JWT_SECRET, expiresIn, 'access');
}

function createRefresh(user, clientId, grant_type, deviceId, expiresIn) {
    return createToken({
        "sub": user.accountId,
        "dvid": deviceId,
        "t": "r",
        "clid": clientId,
        "am": grant_type
    }, global.JWT_SECRET, expiresIn, 'refresh');
}

module.exports = {
    createClient,
    createAccess,
    createRefresh
};
