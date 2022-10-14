const fs = require("fs");
const Profile = require("../model/profiles.js");

function createProfiles(accountId) {
    var profiles = {};

    fs.readdirSync("./Config/DefaultProfiles").forEach(fileName => {
        const profile = require(`../Config/DefaultProfiles/${fileName}`);

        profile.accountId = accountId;
        profile.created = new Date().toISOString();

        profiles[profile.profileId] = profile;
    })

    return profiles;
}

async function validateProfile(accountId, profileId) {
    try {
        var profiles = await Profile.findOne({ accountId: accountId }).lean();
        var profile = profiles.profiles[profileId];

        if (!profile || !profileId) throw new Error("Invalid profile/profileId");
    } catch (err) {
        return false;
    }

    return true;
}

module.exports = {
    createProfiles,
    validateProfile
}