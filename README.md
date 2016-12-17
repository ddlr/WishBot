## Changeling Bot, based on

# WishBot Core [![Dependant Status](https://david-dm.org/hsiw/WishBot/status.svg?style=flat-square)](https://david-dm.org/hsiw/WishBot) [![License](https://img.shields.io/github/license/mashape/apistatus.svg?maxAge=2592000&style=flat-square)](./LICENSE) [![GitHub forks](https://img.shields.io/github/forks/hsiw/WishBot.svg?style=flat-square)](https://github.com/hsiw/WishBot/network) [![GitHub stars](https://img.shields.io/github/stars/hsiw/WishBot.svg?style=flat-square)](https://github.com/hsiw/WishBot/stargazers) [![eris](https://img.shields.io/badge/js-eris-blue.svg?style=flat-square)](https://abal.moe/Eris/)

### How the command system works:
```js
//File should be the name of the command (example test.js will make the command 'test')
// The folder name will define the command type, mod and admin commands require additional permissions

// If you’re running another command from this command, include this line
const runCmd = require('./../../utils/commandRun.js');

module.exports = {
    // The command usage info that shows up in 'help [commmand]'
    usage: 'The usage info of the command',
    // Any command aliases
    aliases: ['stuff'],
    // Whether the command can work in DMs (private messages) or not
    dm: false,
    // If the command text should be deleted on use (the text used to invoke the
    // command)
    delete: false,
    // If the command can be toggled on or off with the toggle command
    togglable: false,
    // Array of server IDs which the command is restricted to
    privateGuild: ['81384788765712384'],
    // Additonal permissons that are required
    // Exact naming can be found https://abal.moe/Eris/docs/reference
    permissions: {
        'manageGuild': true
    },
    // Cooldown for the command (in seconds)
    cooldown: 5,
    // Whether command needs to have guild prefix OR mention the bot in order
    // to run (default: true)
    needsPrefix: false,
    // obj is an object containing the following keys:
    //     msg     - the message object
    //     args    - command arguments
    //     bot     - the currently running Eris bot instance
    //     i       - a counter of how many layers deep the command is, for
    //               preventing recursion via resolve(runCmd()) (starts from 1)
    //     content - content of message after index.js removes guild prefix or
    //               bot mention from message (you rarely need this)
    process: obj => {
        return new Promise(resolve => {
            //Whatever function you want here to process the command stuff
            resolve({
                // The message content to send
                message: 'This is a message',
                // Discord embed object, check Discord API docs for info
                embed: {},
                // Used to enable @everyone and @here mentions
                disableEveryone: false,
                upload: {
                    // File to be uploaded (must be a buffer, check wewlad for
                    // an example)
                    file: somefile,
                    name: 'test.txt'
                },
                // Some function that will be used to edit the sent message
                // (check ping for an example)
                edit: (message) => \`Edited message (id: ${message.id})\`,
                // Or return a promise instead (see derpibooru for an example)
                edit: Promise(resolve => {})
                // Whether or not to delete the sent message after 5s
                delete: false
            });
            // Or, alternatively, run another command. This effectively makes
            // this command an alias of another one. Note that i, the counter,
            // is passed on
            //
            // See “obj is an object” section above for more details on each of
            // these variables
            resolve(
                runCmd({
                    msg: obj.msg, // required
                    args: obj.args, // optional
                    // Name of command
                    // (required)
                    cmdTxt: obj.cmdTxt, // Name of command (required)
                    bot: obj.bot, // (optional unless command uses it)
                    i: i, // required
                    // Content of message after index.js removes guild prefix
                    // or bot mention from message.
                    // (optional)
                    content: obj.content
                })
            );
        })
    }
}
```
====
[![forthebadge](http://forthebadge.com/images/badges/built-with-love.svg)](http://forthebadge.com)
====
**Disclaimer**: Like Mei’s Wishbot Core on which this was based, no support will currently be given for this code.
