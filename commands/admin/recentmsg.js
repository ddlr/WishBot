const util = require('util')
    , moment = require('moment')
    , utils = require('../../utils/utils.js')
    , MESSAGES_DEFAULT = 5
    , MESSAGES_MAX = 10
    , FILE_NAME = 'recent_msg';
module.exports =
  { usage:
`Get **recent messages of a channel** or **information on a server**.

If passed with both server ID and channel ID, return latest \
${MESSAGES_DEFAULT} messages or number of messages set by \`[number of |
messages]\`. The remaining options (before/after/around this message ID) are \
optional, and setting them to \`null\` will cause that option to be ignored.

If passed with server ID but not channel ID, return various bits of \
information about the server.

**Usage:**
\`\`\`[guild prefix]recent_msg [server ID] [channel ID] [number of messages] \
[before this message ID] [after this message ID] [around this message ID]\`\`\`

Also see <https://abal.moe/Eris/docs/Channel#function-getMessages>.`
  , delete: false
  , togglable: true
  , cooldown: 5
  , process: obj => {
        const msg = obj.msg
            , args = obj.args
            , bot = obj.bot;
        return new Promise(resolve => {
            // a - 1st arg  - guild ID to create new message in
            // b - 2nd arg  - channel ID to create new message in
            // c - 3rd arg  - no of messages to return
            // d -    "     - before this message ID
            // e -    "     - after this message ID
            // f -    "     - around this message ID

            const argsSplit = args.split(' ');
            const a = argsSplit[0];
            const b = argsSplit[1];
            const c = argsSplit[2] || MESSAGES_DEFAULT;

            if (c > MESSAGES_MAX) {
                resolve(
                  { message:
                        'Please don’t spam. Number of messages to retrieve ' +
                        'is limited to ten.'
                  }
                );
            }

            const d = argsSplit[3] === 'null' ? null : argsSplit[3] || null;
            const e = argsSplit[4] === 'null' ? null : argsSplit[4] || null;
            const f = argsSplit[5] === 'null' ? null : argsSplit[5] || null;

            const getStuff = new Promise((resolve, reject) => {
                const guild = bot.guilds.get(a);
                const chan = guild.channels.get(b) || {};
                resolve({ guild: guild, chan: chan });
            });
            let printStuff;

            if (a && b) {
                printStuff = getStuff.then(obj => {
                    return new Promise((resolve, reject) => {
                        const guild = obj.guild
                            , chan = obj.chan;
                        utils.fileLog(
                          [ FILE_NAME
                          , 'info'
                          , ''
                          , `bot.guilds.get(${a}).channels.get(${b}).` +
                            `getMessages(${c}, ${d}, ${e}, ${f})`
                          ]
                        );
                        chan.getMessages(c, d, e, f).then(out => {
                            for (let i = out.length - 1; i >= 0; i--) {
                                let message = {};
                                message.id = out[i].id;
                                if (out[i].embed)
                                    message.embed = out[i].embed;
                                if (Object.keys(out[i].reactions).length > 0)
                                    message.reactions = out[i].reactions;
                                message.content = out[i].content;
                                message.author =
                                    `${out[i].author.username}#` +
                                    `${out[i].author.discriminator} ` +
                                    `(<@${out[i].author.id}>)`;
                                message.timestamp =
                                    `${moment(out[i].timestamp).utc().format('ddd MMM DD YYYY | HH:mm:ss')}`;
                                // Return entire message object
                                // msg.channel.createMessage(
                                //     `\`\`\`${ util.inspect(out[i], { depth: 2 }) }\`\`\``
                                // );
                                msg.channel.createMessage(
                                    `\`\`\`${ util.inspect(message) }\`\`\``
                                );
                            }
                        let result =
`**Misc info:**
*Server name:* ${guild.name}
*Channel name:* ${chan.name || '*(none)*'}
*Topic:* ${chan.topic || '*(none)*'}`;

                            resolve(result);
                        }).catch(e => {
                            reject(e);
                        });
                    });
                });
            } else if (!a) {
                resolve({ message: 'You need to type in a server ID, silly!' });
            } else {
                printStuff = getStuff.then(obj => {
                    return new Promise((resolve, reject) => {
                        const guild = obj.guild
                            , chan = obj.chan;
                        function channelType(i) {
                            if (i === 2) {
                                return 'voice';
                            } else if (i === 0) {
                                return 'text';
                            } else {
                                return i;
                            }
                        }

                        let result =
`**Server info:**
*Server name:* ${guild.name}
*Owned by:* <@${guild.ownerID}>
*Server created at:* ${moment(guild.createdAt).utc().format('ddd MMM DD YYYY | HH:mm:ss')}
*Joined on:* ${moment(guild.joinedAt).utc().format('ddd MMM DD YYYY | HH:mm:ss')}

*Other channels:*
`;
                        result += guild.channels.map(c => {
                            return `- ${c.name} (${c.id}, ${channelType(c.type)})`;
                        }).join('\n');

                        resolve(result);
                    });
                });
            }

            printStuff.then(obj => {
                resolve({ message: obj });
            }).catch(e => {
                console.log(
                  [ FILE_NAME
                  , 'error'
                  , 'catch'
                  , e.message
                  , e.stack
                  ]
                );
                resolve({ message: `Something went wrong:\n\`\`\`${e.message}\`\`\`` });
            });
        });
    }
  };
