const Eris = require('eris'), //The bot's api library
    colour = new(require('chalk')).constructor({ //Used to make the console have pretty colours
        enabled: true //This isn't normally needed but PM2 doesn't work with chalk unless I do this
    }),
    fs = require('fs'), //For reading/writing to a file
    axios = require('axios'), //HTTP client for requests to and from websites
    util = require('util'), // For util.inspect()
    winston = require('winston'), // Used for logging to file
    reload = require('require-reload')(require);

var options = reload('./options/options.json'),
    commandLoader = reload('./utils/commandLoader.js'),
    utils = reload('./utils/utils.js'),
    database = reload('./utils/database.js'),
    database_ = reload('./utils/database_.js'),
    runCmd = reload('./utils/commandRun.js'),
    usageChecker = reload('./utils/usageChecker.js'),
    admins = reload('./options/admins.json'),
    playing = reload('./lists/playing.json'), //List of playing status's for the bot to use
    //Unflipped tables for use with the auto-table-unfipper
    unflippedTables = ["┬─┬﻿ ︵ /(.□. \\\\)", "┬─┬ノ( º _ ºノ)", "┬─┬﻿ ノ( ゜-゜ノ)", "┬─┬ ノ( ^_^ノ)", "┬──┬﻿ ¯\\\\_(ツ)", "(╯°□°）╯︵ /(.□. \\\\)"],
    urls = [''], //Twitch URLS the bot pulls from to link to in the Streaming Status
    //Bot Constructor Creation check https://abal.moe/Eris/docs/Client for more info
    bot = new Eris(options.token, {
        getAllUsers: true,
        messageLimit: 0,
        maxShards: 1, //Set to lower if hosting yourself as 8 is overkill in most cases(its even overkill for Yuki-chan now)
        disableEvents: {
            TYPING_START: true,
            GUILD_EMOJI_UPDATE: true,
            GUILD_INTEGRATIONS_UPDATE: true,
            GUILD_BAN_ADD: true,
            GUILD_BAN_REMOVE: true,
            MESSAGE_UPDATE: true,
            MESSAGE_DELETE: true,
            MESSAGE_DELETE_BULK: true
        }
    });

//Make Promises faster and more efficent by using BlueBirds Implmentation of them
global.Promise = require('bluebird'),
//Console Log Colours
botC = colour.magenta.bold,
userC = colour.cyan.bold,
guildC = colour.black.bold,
channelC = colour.green.bold,
miscC = colour.blue.bold,
warningC = colour.yellow.bold,
errorC = colour.red.bold;

//Ready Event
bot.on("ready", () => {
    //Sets the status's of every shard seperately
    setRandomStatus()
    //This stuff below is sent to the console when the bot is ready
    console.log(`${botC(bot.user.username + ' is now Ready with')} ${errorC(bot.shards.size)} ${botC('Shards.')}`);
    console.log(`Current # of Commands Loaded: ${warningC(Object.keys(commands).length)}`)
    console.log(
        `Users: ${userC(bot.users.size)} | ` +
        `Channels: ${channelC(Object.keys(bot.channelGuildMap).length)} | ` +
        `Guilds: ${guildC(bot.guilds.size)}`
    );
    //Run inactivity checker and output the number of inactive servers
    usageChecker.checkInactivity(bot).then(response => console.log(botC(response))).catch(err => console.log(errorC(err)));
});

// List of command aliases run without guild prefixes when Changeling Bot is
// mentioned. Also run without needing Changeling Bot to be mentioned in direct
// messages (PMs or private messages).
//
// TODO: These have been removed, so reimplement these
/*
var mentionCommands = {
    '❤': 'respond heart',
    '💙': 'respond blue heart',
    '💚': 'respond green heart',
    '💛': 'respond yellow heart',
    '💜': 'respond purple heart',
    'thank you': 'respond thank you',
    'thank you,': 'respond thank you',
    'blehp': 'respond blehp'
};
*/

//On Message Creation Event
bot.on("messageCreate", msg => {

    // If message author is a bot, don’t do anything
    if (msg.author.bot) return;
    // Disable bot for everyone but bot admins for testing purposes
    // else if ( !admins.includes(msg.author.id) ) return;
    // If bot isn’t ready, tell the user so
    else if (! bot.ready) // TODO: Test if utils actually loads by this point
        msg.channel.createMessage(
            'Error: Changling Bot not ready yet. Please wait a bit first. ' +
            'Beep boop.'
        ).then(
            message => utils.messageDelete(message)
        ).catch(err => utils.fileLog(err));
    // Use eval on the message if it starts with sudo and by an admin
    else if (
        msg.content.split(' ')[0] === 'sudo' &&
        admins.includes(msg.author.id)
    ) {
        evalInput(msg, msg.content.split(" ").slice(1).join(' '));
        return;
    }
    // Hot reload all possible files if by an admin
    else if (
        (
            msg.content.startsWith(options.prefix + 'reload') ||
            msg.content.startsWith(bot.user.mention + ' reload')
        ) &&
        admins.includes(msg.author.id)
    ) {
        reloadModules(msg);
    }
    else {
        // If used in guild and the guild has a custom prefix set the msgPrefix
        // as such otherwise grab the default prefix
        let msgPrefix =
            msg.channel.guild &&
            database.getPrefix(msg.channel.guild.id) !== undefined
                ? database.getPrefix(msg.channel.guild.id)
                : options.prefix;

        // Make msg.content a separate variable so that even when message
        // content is changed to turn into a runnable command, the original
        // message content is still accessible.
        let content = msg.content;

        // There are two types of commands in Changeling Bot.
        //
        // FIRST TYPE:
        //
        // Commands that require mentioning the bot at the beginning of the
        // message OR a prefix
        // e.g. @Changeling Bot dpc raridash
        //      ~dpc raridash
        //
        // When the bot is mentioned twice, the first instance is treated as the
        // bot mention while the second instance is treated as part of command
        // arguments
        //      @Changeling Bot whois @Changeling Bot
        // is equivalent to
        //      ~whois @Changeling Bot (assuming that guild prefix is ~)
        //
        // And so, according to the above rules:
        //      whois @Changeling Bot
        //
        // will not work because (a) Changeling Bot is not mentioned at the
        // start, and (b) there is no prefix at the beginning.
        //
        // SECOND TYPE:
        //
        // Commands that don’t require mentioning the bot nor a prefix
        // e.g. gimme cute
        //
        // which can also be run as
        //      @Changeling Bot gimme cute
        //      ~gimme cute

        // cmdTxt: the command itself
        // args: the arguments of the command
        let cmdTxt, args;

        // If bot cannot send messages in the current channel
        if (
            msg.channel.guild &&
            ! msg.channel.permissionsOf(bot.user.id).has('sendMessages')
        ) {
            return;
        }

        // Prefix included in message
        if (msg.content.startsWith(msgPrefix)) {
            // No need to do anything special

            // Format message to remove command prefix
            content = msg.content.substring(
                msgPrefix.length,
                msg.content.length
            );
        }
        // Bot mention included in message
        else if (msg.content.startsWith(bot.user.mention + ' ')) {
            content =
                msg.content.replace(bot.user.mention + ' ', '');
        }
        // setprefix and checkprefix
        // Prefix command override so that prefix can be used with the
        // default command prefix to prevent forgotten prefixes
        else if (
            (
                msg.content.startsWith(options.prefix + 'setprefix') ||
                msg.content.startsWith(options.prefix + 'checkprefix')
            ) &&
            msgPrefix !== options.prefix
        ) {
            content = msg.content.replace(options.prefix, '');
        }
        // No bot mention or prefix
        else {
            // If Message is a tableFlip and the Guild has
            // tableflip(tableunflip) on return an unflipped table
            // TODO: Test this
            if (msg.channel.guild && msg.content === '(╯°□°）╯︵ ┻━┻') {
                database.checkSetting(msg.channel.guild.id, 'tableflip').then(
                    () => bot.createMessage(
                        msg.channel.id,
                        unflippedTables[
                            ~~(Math.random() * (unflippedTables.length))
                        ]
                    )
                ).catch(err => utils.fileLog(err));
                return;
            }

            content = content;
            cmdTxt = msg.content.split(' ')[0].toLowerCase();

            // needsPrefix defines whether or not a command can be run without
            // a prefix OR by mentioning the bot
            //
            // If no bot mention or prefix supplied and needsPrefix is false,
            // don’t run command. Also don’t run command if command doesn’t
            // actually exist.
            if (
                ! commands.hasOwnProperty(cmdTxt) ||
                ! commands[cmdTxt].needsPrefix === false
            ) {
                return;
            }
        }

        cmdTxt = content.split(' ')[0].toLowerCase();
        args = content.split(' ').slice(1).join(' ');

        // Like, actually run the command

        runCmd({
            msg: msg, args: args, cmdTxt: cmdTxt, bot: bot, i: 0,
            content: content
        }).then(response => {
            // If command needs embed permissions and bot doesn't have it
            if (
                response.embed !== undefined &&
                msg.channel.guild &&
                !(msg.channel.permissionsOf(bot.user.id).has('embedLinks'))
            ) {
                return;
            }
            // Main Processing of Command (uses Promises)
            //
            // Commands return a Promise which can contain a 'message, 'upload',
            // 'embed' or 'disableEveryone' to send message being the message
            // content, upload being whatever file you'd like to, embed being a
            // Discord embed object or allow the message to mention everyone
            // with @everyone
            //
            // Commands also can return a edit function which allows you to edit
            // messages while also taking the inital sent message object
            //
            // They can also return a delete after 5s boolean which deletes the
            // sent message after 5s
            msg.channel.createMessage({
                // Message content
                content: response.message ? response.message : '',
                // Message embed
                embed: response.embed ? response.embed : undefined,
                // Allow/deny use of everyone or @here in messages
                disableEveryone: response.disableEveryone != null
                    ? response.disableEveryone
                    : undefined
            }, response.upload).then(message => {
                // Edit sent message
                // response.edit can either return a string or a promise
                if (response.edit) {
                    // If response.edit retrurns a promise
                    if (Promise.resolve(response.edit) === response.edit) {
                        response.edit.then((resolve_message) => {
                            message.edit(resolve_message)
                        }).catch(err => utils.fileLog(err));
                    }
                    // If response.edit returns a string
                    else {
                        message.edit(response.edit(message))
                    }
                }

                // Check for delete sent message
                if (response.delete) utils.messageDelete(message);
            }).catch(
                // Log to console and file if error
                err => utils.fileLog(err)
            );
        });

    }

});

// Log the output of sudo commands in a separate file so they don’t clog up the
// main one
//
// e.g. sudo util.inspect(bot.guilds.get('[guild ID]').channels) would be
// printed to evalLog file
const evalLog = new(winston.Logger)(
   { transports:
      [ new (winston.transports.File)( // Log file
          { filename: 'eval.log' // Path to logging file.
          , prettyPrint: true
          , json: false
          , level: 'info'
          , colorize: true // Add COLOURS
          }
        )
      , new (winston.transports.Console)(
          { level: 'info' // Minimum error level in order to print
          , colorize: true
          }
        )
      ]
  , levels: { info: 0 }
  , colors: { info: 'yellow' }
  }
);


function evalInput(msg, args) {
    // Literally evaluates a string. Very dangerous. But also very cool.
    function parseResult(result) {
        try {
            // If result isn't undefined and it isn't an object return to
            // channel
            if (result && typeof result !== 'object')
                msg.channel.createMessage(result);
            evalLog.log('info', 'output is of type ' + typeof result);
            if (typeof result === 'object') {
                evalLog.log('info', util.inspect(result, { depth: 1 }));
            } else {
                evalLog.log('info', result);
            }
        } catch (e) {
            console.log(e);
        }
    }

    // Tries to run eval on the text and output either an error or the result
    // if applicable
    if (typeof eval(args).then === 'function') {
        // Object is promise
        console.log('sudo: is a promise');
        eval(args).then(result => { return parseResult(result) }).catch(err => {
            console.log(err);
            msg.channel.createMessage(`\`\`\`${err}\`\`\``);
        });
    } else {
        try {
            console.log('sudo: not a promise');
            parseResult(eval(args));
        } catch (err) {
            console.log(err);
            msg.channel.createMessage(`\`\`\`${err}\`\`\``);
        }
    }
}

//New Guild Member Event
bot.on("guildMemberAdd", (guild, member) => {
    //Checks to make sure guild and a member was sent
    if (guild && member) {
        //Checks to see if the guild has a welcome set
        database.checkSetting(guild.id, 'welcome').then(response => {
            sendGuildMessage(response, guild, member);
        }).catch(err => console.log(errorC(err)));
    }
})

//Guild Member Left Event
bot.on("guildMemberRemove", (guild, member) => {
    //Checks to make sure guild and a member was sent
    if (guild && member) {
        //Checks to see if the guild has a leave set
        database.checkSetting(guild.id, 'leave').then(response => {
            sendGuildMessage(response, guild, member);
        }).catch(err => console.log(errorC(err)))
    }
})

//Replaces the correct strings with the correct variables then sends the message to the channel
function sendGuildMessage(response, guild, member) {
    if (response.channel === '' || (response.channel !== '' && !bot.guilds.get(guild.id).channels.get(response.channel).permissionsOf(bot.user.id).has('sendMessages'))) return;
    else {
        usageChecker.updateTimestamp(guild);
        bot.createMessage(response.channel, response.response.replace(/\[GuildName]/g, guild.name).replace(/\[ChannelName]/g, guild.channels.get(response.channel).name).replace(/\[ChannelMention]/g, guild.channels.get(response.channel).mention).replace(/\[UserName]/g, member.user.username).replace(/\[UserMention]/g, member.user.mention)).catch(err => console.log(errorC('err')));
    }
}

//Guild Joined Event
bot.on('guildCreate', guild => {
    //Post Guild Count
    postGuildCount()
    //Add guild to usageChecker database
    usageChecker.addToUsageCheck(guild.id);
})

//Guild Left Event
bot.on('guildDelete', guild => {
    //Post Guild Count
    postGuildCount()
    //Remove Guild from database and log if error
    database.removeGuild(guild.id).catch(err => utils.fileLog(err))
    //Remove guild from guildPrefix array if it exists in it
    database.removeGuildfromJson(guild.id)
    //Remove from usageChecker database
    usageChecker.removeFromUsageCheck(guild.id);
})

//Load Commands then Connect(Logs any errors to console and file)
commandLoader.load().then(() => {
    bot.connect().then(console.log(warningC('Connecting with Token')))
}).catch(err => utils.fileLog(err));

//Posts Guild Count to Discord Bots and Carbonitex
function postGuildCount() {
    //Check that the bot is ready so premature guild creates won't cause a crash as well as checking if theres a bot/carbon key
    if (bot.ready && options.bot_key !== '' && options.carbon_key !== '') {
        //Post Guild Count to Discord Bots and if error log to file and console
        axios({
            method: 'post',
            url: `https://bots.discord.pw/api/bots/${bot.user.id}/stats`,
            headers: {
                "Authorization": options.bot_key,
                "content-type": "application/json"
            },
            data: {
                "server_count": bot.guilds.size
            }
        }).catch(err => console.log(errorC(err)))
        //Post Guild Count to Carbonitex and if error log to file and console
        axios({
            method: 'post',
            url: "https://www.carbonitex.net/discord/data/botdata.php",
            headers: {
                "content-type": "application/json"
            },
            data: {
                "key": options.carbon_key,
                "servercount": bot.guilds.size
            }
        }).catch(err => console.log(errorC(err)));
    }
}

//Set random bot status(includes random game as well as random streaming url)
// Modified by Chryssi
function setRandomStatus() {
    bot.shards.forEach(shard => {
        shard.editStatus({
            name: playing[~~(Math.random() * (playing.length))],
            // 0: default, 1: Twitch streaming
            type: 0,
            url: urls[~~(Math.random() * (urls.length))]
        });
    })
}

//Hot Reload ALl Modules
function reloadModules(msg) {
    try {
        utils = reload('./utils/utils.js');
        database = reload('./utils/database.js');
        options = reload('./options/options.json');
        runCmd = reload('./utils/commandRun.js');
        usageChecker = reload('./utils/usageChecker.js');
        commandHandler = reload('./utils/commandHandler.js');
        admins = reload('./options/admins.json');
        playing = reload('./lists/playing.json');
        commandLoader.load().then(() => {
            console.log(botC('@' + bot.user.username + ': ') + miscC('Successfully Reloaded All Modules'));
            msg.channel.createMessage('Successfully reloaded all modules').then(message => utils.messageDelete(message))
        });
    } catch (e) {
        console.log(errorC('Error Reloading Modules: ' + e))
    }
}

//Changes the bots status every 10mins
setInterval(() => setRandomStatus(), 6e+5);

// Changes the bot’s avatar in Christmas season
// Check the date every 3 hrs
// If December OR before Jan 15, randomly pick from Christmas avatars
// (avatars/xmas/ as opposed to avatars/regular/)
// The following code block is heavily based on the commented code above.
setInterval(() => {
    try {
        // Change avatar to one from arr (an array of avatar file paths).
        function changeAvatar(arr, subdir) {
            var avatar = arr[~~(Math.random() * (arr.length))];
            // Assume that subdirectory is regular/ if undefined
            subdir = subdir ? subdir + '/' : 'regular/';
            //Reads the avatar image file and changes the bots avatar to it
            fs.readFile(`${__dirname}/avatars/${subdir}${avatar}`, (err, image) => {
                if (err) utils.fileLog(err)
                else {
                    bot.editSelf({
                        avatar:
                            `data:image/jpg;base64,${image.toString('base64')}`
                    }).then(() => {
                        console.log(botC('Changed avatar to ' + avatar));
                    }).catch(err => utils.fileLog(err));
                }
            });
        }
        let currentDate = new Date();
        // Note that getMonth and getUTCMonth are zero-indexed
        let currentMonth = currentDate.getUTCMonth();
        // Note that getDate and getUTCDate are one-indexed
        let currentDay = currentDate.getUTCDate();
        if (
            Number.isInteger(currentMonth) &&
            currentMonth > -1 &&
            (currentMonth === 11 || currentMonth === 0 && currentDay < 15)
        ) {
            fs.readdir(`${__dirname}/avatars/xmas`, (err, files) => {
                changeAvatar(files, 'xmas');
            });
        } else {
            fs.readdir(`${__dirname}/avatars/regular`, (err, files) => {
                changeAvatar(files, 'regular');
            });
        }
    } catch (err) {
        utils.fileLog(err);
    }
}, 10.8e+6);

//Bot Error Event
bot.on("error", err => utils.fileLog(err)) //Logs error to file and console

//Bot Warn Event(Outputs issues that aren't major)
/*bot.on("warn", (warn, id) => {
    console.log(warningC(warn, id));
})*/

//Debug event only used to find errors and usually disabled
//bot.on("debug", console.log)

//Shard Resume Event
bot.on('shardResume', id => {
    console.log(`${botC("@" + bot.user.username)} - ${warningC("SHARD #" + id + "RECONNECTED")}`);
})

//Shard Disconnect Event
bot.on("shardDisconnect", (err, id) => {
    console.log(`${botC("@" + bot.user.username)} - ${warningC("SHARD #" + id + "DISCONNECTED")}`);
    utils.fileLog(err); //Logs reason/error to file and console
})

//Whole Bot Disconnect Event
bot.on("disconnect", err => {
    console.log(`${botC("@" + bot.user.username)} - ${errorC("DISCONNECTED")}`);
    utils.fileLog(err); //Logs Disconnect reason/error to file and console
    throw 'Bot Disconnected'
})
