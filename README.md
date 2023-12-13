# LawinServerV2
### LawinServer V2 is a fortnite backend written in Node.js that features an account system and xmpp.

## Features
### LawinServer V2
* CloudStorage and ClientSettings (Settings Saving).
* Locker:
    + Changing items.
    + Changing banner icon and banner color.
    + Changing item edit styles.
    + Favoriting items.
    + Marking items as seen.
* Friends:
    + Adding friends.
    + Accepting friend requests.
    + Removing friends.
    + Blocking friends.
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
### NOTE: LawinServerV2 does not support Save the World.

## Discord Bot Commands

### Commands:
- `/create {email} {username} {password}` - Creates an account on the backend (Each user can only create 1 account).
- `/details` - Retrieves your account info.
- `/lookup {username}` - Retrieves someones account info.
- `/otp-code` - Generates a One Time Password (OTP) for login. (One time use for each code and if not used it expires after 5 mins).
- `/change-username {newUsername}` - You can change your username using this command.
- `/change-password {newPassword}` - You can change your password using this command.
- `/sign-out-of-all-sessions` - Signs you out if you have an active session.
- `/delete` - Deletes your account from the Backend.
- `/clear-shop-items` - Removes any items in your profile that is from the item shop.

### Moderation Commands:
- You can only use the moderation commands if you are a moderator.
- `/ban {targetUsername}` - Ban a user from the backend by their username.
- `/unban {targetUsername}` - Unban a user from the backend by their username.
- `/kick {targetUsername}` - Kick someone out of their current game session by their username.

### How do I set up Discord moderators?
1) Go to Config/config.json in the directory you extracted LawinServerV2 into.
2) Open it, you should see a "moderators" section in the file.
3) You have to get your discord id and replace discordId with it.
4) You can set multiple moderators like this `["discordId","discordId2"]`.

## Using LawinServerV2 for a project
You are allowed to host for others, however please credit [me](https://github.com/Lawin0129) and don't remove my credits from `responses/contentpages.json`.

## How to host LawinServerV2
1) Install [NodeJS](https://nodejs.org/en/) and [MongoDB Community (with Compass)](https://www.mongodb.com/try/download/community).
2) Download and Extract LawinServerV2 to a safe location. (eg. a folder on an external drive or on your hard drive)
3) Run "install_packages.bat" to install all the required modules.
4) Go to Config/config.json in the directory you extracted LawinServerV2 into.
5) Open it, set your discord bot token (DO **NOT** SHARE THIS TOKEN) and save it. The discord bot will be used for creating accounts and managing your account.
6) Run "start.bat", if there is no errors, it should work.
7) Use something to redirect the Fortnite servers to `localhost:8080` (working fiddler script below)
8) When Fortnite launches and is connected to the backend, enter your email and password (or launch with an exchange code) then press login. It should let you in and everything should be working fine.

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
