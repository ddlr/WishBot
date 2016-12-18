module.exports = {
    usage:
        'Send a **feature request** to the Bot Developer, or in other words, ' +
        'sends a message to a secret channel somewhere in the abyss. ' +
        'Requests can have a max length of **1950 characters**.' +
        '\n\n' +
        '`featurerequest [feature to request]`',
    aliases: ['suggest'],
    dm: false,
    cooldown: 60,
    process: obj => {
        var msg = obj.msg,
            args = obj.args,
            bot = obj.bot;
        return new Promise(resolve => {
            //If nothing is requested yell at the user for not doing so
            if (!args) resolve({
                    message:
                        'You must enter something to be requested, ' +
                        `**${msg.author.username}**.`,
                    delete: true
                })
                //If the request is potentially to large tell the user so
            else if (args.length > 1950) resolve({
                message:
                    'Requests cannot be over 1950 characters, ' +
                    `**${msg.author.username}**.`,
                delete: true
            })
            else {
                // Create a embed message to a channel at the user’s request
                // Note that Chryssi has changed this to a channel in his own
                // server
                //
                // To whoever wants to run their own instance of this bot:
                // Please change this integer to a channel on your own server;
                // this command won’t work unless your instance of this bot has
                // access to this channel, which it doesn’t.
                bot.createMessage('251581749136588802', {
                    embed: {
                        author: {
                            name:
                                `${msg.author.username} ` +
                                `(${msg.channel.guild.name})`,
                            icon_url: msg.author.avatarURL
                        },
                        color: 0x743FBF,
                        description: args,
                        footer: {
                            text:
                                `UserID: ${msg.author.id} GuildID: ` +
                                `${msg.channel.guild.id}`
                        }
                    }
                }).then(() => resolve({
                    // Tell the user that their request was successfully sent to
                    // the request channel on promise resolve
                    message:
                        'Your request was successfully sent, ' +
                        `**${msg.author.username}**.`
                }))
            }
        });
    }
}
