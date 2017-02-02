const util = require('util')
    , utils = require('../../utils/utils.js');

function log(arr) {
    arr.unshift('removemsg');
    return utils.fileLog(arr);
}

module.exports = {
    usage:
`**Deletes messages** from the current channel, **regardless of author**. \
Defaults to **zero messages**. A more dangerous version of the \`clean\` \
command. Requires the **Manage Messages** permission for obvious reasons.

Note that due to limitations in the Discord API, this command will not delete
messages older than 2 weeks. This command also doesn’t work 50% of the time. I
dunno why.

\`[command prefix]removemsg [number]\``,
    delete: false,
    cooldown: 10,
    process: obj => {
        var msg = obj.msg,
            args = obj.args,
            bot = obj.bot;
        return new Promise(resolve => {
            log(
              [ 'info'
              , ''
              , `will purge ${args} message(s) from channel ${msg.channel.id} from ${msg.id}`
              ]
            );
            // Checks if args is a number (as well as it existing) and if so
            // sets args to that number otherwise defaults to 0, just for
            // safety
            /^\d+$/.test(args) ? args = parseInt(args) : args = 0;
            // Check to make sure the bot has access to the bulk delete
            // endpoint which requires mangeMessages
            if (msg.channel.guild &&
                msg.channel.permissionsOf(bot.user.id).has('manageMessages')) {
                log(
                  [ 'info'
                  , ''
                  , 'Has manageMessages permission'
                  ]
                );
                // Purges the number of messages the user requested
                // TODO: Figure out why the fuck this keeps returning 400 BAD
                // REQUEST by Discord
                msg.channel.purge(
                    args, () => true, msg.id
                ).then(deleted => {
                  resolve(
                    { // When purge is finished return the relevant message
                      message:
                          `Finished deleting **${deleted}** messages in ` +
                          `last **${args}** message(s) of ` +
                          `${msg.channel.mention}, Changeling Emperor ` +
                          `**${msg.author.username}**.`
                    , delete: true
                  })
                }).catch(err => {
                    log(
                      [ 'error'
                      , 'msg.channel.purge'
                      , err.message
                      , err.stack
                      ]
                    );
                    resolve(
                      { message:
                            `There was an error. \`\`\`${err.message}\`\`\``
                      , delete: false
                      }
                    );
                });
            } else {
                log(
                  [ 'info'
                  , ''
                  , 'Bot does not have manageMessages permission'
                  ]
                );
                resolve(
                  { message:
                        'Bot requires the Manage Messages permission to ' +
                        'delete others’ messages. You can set this in ' +
                        'Server Settings. Alternatively, use the [command ' +
                        'prefix]clean command to (only) remove messages by ' +
                        'this bot.'
                  , delete: false
                  }
                );
            }
        })
    }
};
