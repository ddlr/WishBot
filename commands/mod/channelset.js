var Database = require('./../../utils/database_.js'),
    util = require('util');

module.exports = {
    usage:
`This is a command that I’m currently working on. Until I actually finish \
this command, here’s how it’s supposed to work.

You can either enable/disable/toggle/check one, two, or three commands. Note \
that if a command is disabled for the entire server via the \`serverset\` \
command, whether the command is enabled or disabled in \`channelset\` is \
ignored.

\`\`\`markdown
# Enable one/two/three command(s) for the current channel
~channelset enable command-one command-two command-three
# Enable all commands
~channelset
# Disable one/two/three command(s)
~channelset disable command-one command-two command-three
# Toggle one/two/three command(s). If the command is enabled, disable it. If \
the command is disabled, enable it. This is done on each command separately.
~channelset toggle command-one command-two command-three
# Check whether or not the following commands are enabled.
~channelset check command-one command-two command-three
# Toggle all commands
~channelset toggle all
# Check all commands
~channelset check all
\`\`\`

A collection of examples:
\`\`\`
~channelset toggle derpibooru
~channelset disable ping clean derpibooru
~channelset enable lenny whois
~channelset check info
\`\`\``
        ,
    aliases: ['cset'],
    dm: false,
    togglable: false,
    delete: false, // TODO: Change to true once on prod (and check if this actually affects the resolve() functions below)
    permissions: {
        'manageGuild': true
    },
    cooldown: 5,
    process: obj => {
        var msg = obj.msg,
            args = obj.args;
        return new Promise(resolve => {
            // Convert arguments to lowercase for easier use
            var option, cmdArgs;

            // ~channelset toggle ping clean derpibooru
            // is converted to
            //   option = toggle
            //   args = ['ping', 'clean', 'derpibooru']

            if (args) {
                option = args.toLowerCase().split(/ (.+)/)[0];
            } else {
                console.log(
                    errorC('channelset:') +
                    ' args is blank or not a string'
                );
                resolve({
                    message: 'Error: You need to type something in, silly!'
                });
            }

            if (args.toLowerCase().split(/ (.+)/)[1]) {
                cmdArgs = args.toLowerCase().split(/ (.+)/)[1].split(' ');
            } else {
                console.log(
                    errorC('channelset:') +
                    ' second argument doesn’t exist'
                );
                resolve({
                    message: 'Error: You need to type in what command(s), silly!'
                });
            }

            switch (option) {
                case 'enable':
                    option = 0;
                    break;
                case 'disable':
                    option = 1;
                    break;
                case 'toggle':
                    option = 2;
                    break;
                case 'check':
                    option = 3;
                    break;
                default:
                    console.log(
                        errorC('channelset:') +
                        ` ${option} is not a valid option (expected one of ` +
                        'the following: \`enable\`, \`disable\`, ' +
                        '\`toggle\`, \`check\`)'
                    );
                    resolve({
                        message:
                            `Error: ${option} is not a valid option ` +
                            '(expected enable, disable, toggle, check)'
                    });
            }

            // all keyword passed, e.g. ~channelset enable all
            // This only works with enable, disable, and check.
            if (cmdArgs.includes('all')) {
                if (! [0, 1, 3].includes(option)) {
                    console.log(
                        errorC('channelset:') +
                        ` ‘all’ cannot be used with ‘toggle’ option. ` +
                        `(args: ${util.inspect(cmdArgs)})`
                    );
                    resolve({
                        message:
                            'Error: `all` can’t be used with `toggle` ' +
                            'option. See `[command prefix]help channelset` ' +
                            'for examples.'
                    });

                }
                if (cmdArgs.length > 1) {
                    console.log(
                        errorC('channelset:') +
                        ' ‘all’ cannot be used in list ' +
                        `(args: ${util.inspect(cmdArgs)})`
                    );
                    resolve({
                        message:
                            'Error: You can’t enable/disable/toggle/check ' +
                            '`all` with other commands.'
                    });
                }

                // Alias cmdArgs_new to cmdArgs out of laziness to change
                // Database.toggleCommands(), below
                var cmdArgs_new = cmdArgs;
            } else {
                // Checks if command is an alias of another command
                cmdArgs = cmdArgs.map(cmd => {
                    if (commandAliases.hasOwnProperty(cmd))
                        return commandAliases[cmd];
                    else
                        return cmd;
                });

                // Clone cmdArgs so I can remove elements from the array without
                // fucking up the for loop
                var cmdArgs_new = cmdArgs.slice();

                // Do some checks before toggling commands
                for (let i = 0; i < cmdArgs.length; i++) {
                    // Check if commands passed actually exist. If not, remove
                    // command from argument list.
                    if (! commands.hasOwnProperty(cmdArgs[i])) {
                        // TODO: Add `Warning: ${cmdArgs[i]} doesn’t exist` to
                        //       resolve() output
                        console.log(
                            warningC('channelset:') +
                            ` ${cmdArgs[i]} doesn’t exist`
                        );
                        cmdArgs_new.splice(
                            cmdArgs_new.indexOf(cmdArgs[i]), 1
                        );
                    }
                }
            }

            // TODO: Wrap in promise.then()

            // Actually enable/disable/toggle/check the status of the command
            // in the current channel.
            //
            // See utils/database_.js for more details
            Database.toggleCommands(
                'channel', option, msg.channel.guild.id, cmdArgs_new, msg
            ).then(response => {
                // Doing above was successful - tell user so
                resolve({
                    message: `${response}`
                });
            }).catch(err => {
                // Doing above failed - tell user this
                console.log(
                    errorC('channeltoggle:') +
                    ' returned error',
                    err
                );
                resolve({
                    message:
                        'Error: something went wrong in channelset ' +
                        'command. This is a bug in the bot (pun ' +
                        'unintended); please let the developer know.'
                });
            }); // catch
        }); // return new Promise

    } // process
}; // module.exports
