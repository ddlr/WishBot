var libVersion = require('./../../node_modules/eris/package.json').version, //The current version of the eris lib gotten from the package.json
    botVersion = require('./../../package.json').version, //The bots version gotten from the package.json
    prefix = require('./../../options/options.json').prefix; //Default bot prefix

module.exports = {
    usage: "Returns **info** about the bot, including a link to the **support server**, a link to the bots **source code** & a link to the bots **documentation**.",
    process: (msg, args, bot) => {
        //returns basic info about the bot
        return Promise.resolve({
            message: `\`\`\`markdown
[WishBot Info](${bot.user.username}) 

Changeling Bot is built on top of Mei’s WishBot.

# About this Bot
[Developer of WishBot](Mei#5429)
[Developer of Changeling Bot](Chrys#1856)
[Default Prefix](${prefix})
[Bot Version](v${botVersion})
[Discord Library](Eris - v${libVersion})

# Use ${prefix}help for a list of the current bot commands.
[WishBot source code](https://github.com/hsiw/Wishbot)
[Changeling Bot source code](https://github.com/ddlr/WishBot)
[Support server for Changeling Bot](https://discord.gg/hNYstHJ)
[Docs for WishBot](https://github.com/hsiW/WishBot/wiki)

WARNING: This bot can explode from time to time. Handle with caution.
\`\`\`
`
        })
    }
}
