var libVersion = require('./../../node_modules/eris/package.json').version, //The current version of the eris lib gotten from the package.json
    botVersion = require('./../../package.json').version, //The bots version gotten from the package.json
    prefix = require('./../../options/options.json').prefix; //Default bot prefix

module.exports = {
    usage: "Returns **info** about the bot, including a link to the **test server**.",
    process: obj => {
        var bot = obj.bot;
        //returns basic info about the bot
        return Promise.resolve({
            message:
`__**About Changeling #6006, a.k.a. ${bot.user.mention}**__

Changeling Bot (by Chrys#1856) is built on top of Mei’s WishBot.

**Developer of WishBot:** Mei#5429
**Developer of Changeling Bot:** Chrys#1856
**Default Prefix:** \`${prefix}\`
**Bot version:** v${botVersion}
**Discord library:** Eris - v${libVersion}

Use \`[command prefix]help\` for a list of the current bot commands.

**WishBot source code:** <https://github.com/hsiw/Wishbot>
**Changeling Bot source code:** <https://github.com/ddlr/WishBot>

**Official testing server** for Changeling Bot: https://discord.gg/hNYstHJ
(ask for access to the #testing channel)

WARNING: This bot can explode from time to time. Handle with caution.`
        });
    }
};
