var serverUptime = require('os').uptime(),
    toTitleCase = require('./../../utils/utils.js').toTitleCase;

module.exports = {
    usage: "Returns **stats** for the bot. Includes **bot/process/server** uptime, **memory usage**, **# of shards**, **channels/privateChannels/guilds/users** available, & **command usage**. **Basic shard stats** can also be viewed with `stats shards`. **Command usage stats** may be view with `stats usage`.",
    cooldown: 30,
    permissions: {
        'manageGuild': true
    },
    process: obj => {
        var args = obj.args,
            bot = obj.bot;
        return new Promise(resolve => {
            //Print shard info
            if (args === 'shards') {
                resolve({
                    message: `\`\`\`markdown
### Shard Info ###
${bot.shards.map(shard => '[' + shard.id + ']: ' + toTitleCase(shard.status) + ' (' + shard.guildCount + ')').join('\n')}\`\`\`
            `
                })
            } else if (args === 'usage') {
                //Return Command Usage stats
                var usage = [];
                for (command in commands) {
                    if (commands[command].execTimes !== 0) {
                        usage.push({
                            name: command,
                            usage: commands[command].execTimes
                        })
                    }
                }
                resolve({
                    message: `\`\`\`markdown
### Command Usage ###
${usage.sort((a,b) => b.usage - a.usage).map(value => "[" + value.name + "]" + "(" + value.usage + ")").join('\n')}\`\`\`
`
                })
            } else {
                //Get the current command usage total by looping through the command object and getting the executeTimes for each command and adding to the commandUsage variable
                var commandUsage = 0;
                for (command in commands) {
                    if (commands[command].execTimes !== 0) commandUsage += commands[command].execTimes;
                }
                //Bot uptime is done in ms so 1000x more than s like Process and Server uptimes
                resolve({
                    message: `
\`\`\`markdown
# ${bot.user.username} Statistics:
[Bot Uptime](${~~(bot.uptime / 86400000)}d : ${~~((bot.uptime / 3600000) % 24)}h : ${~~((bot.uptime / 60000) % 60)}m : ${~~((bot.uptime / 1000) % 60)}s)
[Process Uptime](${~~(process.uptime() / 86400)}d : ${~~((process.uptime() / 3600) % 24)}h : ${~~((process.uptime() / 60) % 60)}m : ${~~((process.uptime()) % 60)}s)
[Server Uptime](${~~(serverUptime / 86400)}d : ${~~((serverUptime / 3600) % 24)}h : ${~~((serverUptime / 60) % 60)}m : ${~~((serverUptime) % 60)}s)
[Memory Usage](RSS: ${(process.memoryUsage().rss / 1024 / 1000).toFixed(2)}MB | Heap Used: ${(process.memoryUsage().heapUsed / 1024 / 1000).toFixed(2)}MB)
[Shards](${bot.shards.size})

# Available To:
[Channels](${Object.keys(bot.channelGuildMap).length})
[Private Channels](${bot.privateChannels.size})
[Guilds](${bot.guilds.size})
[Users](${bot.users.size})
[Average](${(bot.users.size/bot.guilds.size).toFixed(2)})

# Command Usage:
[Total | Commands | Cleverbot](${commandUsage} | ${commandUsage - commands['chat'].execTimes} | ${commands['chat'].execTimes})
[Average](${(commandUsage/(process.uptime() / 60)).toFixed(2)}/min)
\`\`\`
`
                })
            }
        });
    }
}
