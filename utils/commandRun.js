// Run command, basically. Having this in its own file allows commands to run
// other commands, and recursion as well.
// index.js --> utils/messageCreate.js --> utils/commandRun.js -->
//   (database.js) --> utils/commandHandler.js

// TODO: Check if database.js is reloaded
// TODO: Make commandHandler.js reloadable
// TODO: Use fileLog instead of console.log

const database = require('./database.js'),
      processCmd = require('./commandHandler.js'),
      utils = require('./utils.js');

// obj = {
//     msg: msg, args: args, cmdTxt: cmdTxt, bot: bot, i: i, content: content
// }
module.exports = (obj) => {
    // For convenience purposes
    // Defining cmdTxt is important because if the command is an alias then
    // cmdTxt will be changed to the command obj.cmdTxt is an alias of
    var msg = obj.msg,
        args = obj.args,
        cmdTxt = obj.cmdTxt;
    return new Promise(resolve => {
        // If message doesn’t exist or no command passed
        if (!obj.msg || !obj.cmdTxt) {
            console.log(
                errorC('commandRun:') +
                'msg or cmdTxt doesn’t exist.'
            );
            msg.channel.createMessage(
                'Error: no command passed to the bot. This is a bug in the ' +
                'bot itself; please let the developer know.'
            ).then(message => utils.messageDelete(message));
        }
        // i checks how many layers deep commandRun has been run (zero-indexed)
        // Maximum is two commands deep
        else if (! Number.isInteger(obj.i) || obj.i > 1) {
            console.log(
                errorC('commandRun:') +
                ' Command recursion too deep.'
            );
            msg.channel.createMessage(
                'Error: command recursion too deep. This is a bug in the bot ' +
                'itself; please let the developer know.'
            ).then(message => utils.messageDelete(message));
        }
        else {
            // If cmdTxt (command passed by user) is an alias of another command
            if (commandAliases.hasOwnProperty(cmdTxt))
                cmdTxt = commandAliases[cmdTxt];

            // Override channelCheck if cmd is channelmute to unmute a muted
            // channel
            if (cmdTxt === 'channelmute')
                processCmd({
                    msg: obj.msg,
                    args: obj.args ? obj.args : '',
                    cmd: commands[cmdTxt],
                    bot: obj.bot,
                    i: obj.i,
                    content: obj.content
                });
            // Check if a command was used and runs the corresponding code
            // depending on if it was used in a guild or not, if in guild checks
            // for muted channel and disabled command
            else if (commands.hasOwnProperty(cmdTxt))
                database.checkChannel(msg.channel.id).then(
                    () => database.checkCommand(msg.channel.guild, cmdTxt)
                ).then(
                    () => processCmd({
                        msg: obj.msg,
                        args: obj.args ? obj.args : '',
                        cmd: commands[cmdTxt],
                        bot: obj.bot,
                        i: obj.i,
                        content: obj.content
                    })
                ).then(
                    response => { resolve(response) }
                ).catch(err => console.log(errorC(err)));
        }
    });
};
