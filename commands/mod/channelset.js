var Database = require('./../../utils/database_.js');

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
            // TODO: Keep in mind that you need to check whether or not option
            //       and commands actually exist
            var option, toggleCmds;

            // TODO: Wrap in promise
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
                toggleCmds = args.toLowerCase().split(/ (.+)/)[1].split(' ');
            } else {
                console.log(
                    errorC('channelset:') +
                    ' second argument doesn’t exist'
                );
                resolve({
                    message: 'Error: You need to type in what command(s), silly!'
                });
            }

            // TODO: Wrap in promise.then()
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

            // Checks if command is an alias of another command
            toggleCmds = toggleCmds.map(cmd => {
                if (commandAliases.hasOwnProperty(cmd))
                    return commandAliases[cmd];
                else
                    return cmd;
            });

            // Clone toggleCmds so I can remove elements from the array without
            // fucking up the for loop
            var toggleCmds_new = toggleCmds.slice();

            // Do some checks before toggling commands
            for (let i = 0; i < toggleCmds.length; i++) {
                // Check if commands passed actually exist. If not, remove
                // command from argument list.
                if (! commands.hasOwnProperty(toggleCmds[i])) {
                    // TODO: Add `Warning: ${toggleCmds[i]} doesn’t exist` to
                    //       resolve() output
                    console.log(
                        errorC('channelset:') +
                        ` ${toggleCmds[i]} doesn’t exist`
                    );
                    toggleCmds_new.splice(
                        toggleCmds_new.indexOf(toggleCmds[i]), 1
                    );
                }
                // Check if commands passed are togglable. If not, remove
                // command from argument list.
                //
                // TODO: Move this to utils/database_.js, right after getRow(),
                // and check whether this command is in disabled_commands. If
                // so, enable and toggle will work, and disable won’t. If not,
                // enable won’t do anything (tell user this), and toggle and
                // disable won’t work.
                else if (commands[toggleCmds[i]].togglable !== true) {
                    console.log(
                        errorC('channelset:') +
                        ` ${toggleCmds[i]} cannot be changed because it ` +
                        'cannot be toggled'
                    );
                    toggleCmds_new.splice(
                        toggleCmds_new.indexOf(toggleCmds[i]), 1
                    );
                    // TODO: Add `Warning: ${toggleCmds[i]} isn’t togglable` to
                    //       resolve() output
                }
            }

            // TODO: Wrap in promise.then()

            // Actually enable/disable/toggle/check the status of the command
            // in the current channel.
            //
            // See utils/database_.js for more details
            Database.toggleCommands(
                'channel', option, msg.channel.guild.id, toggleCmds_new
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
                        'Error: something went wrong in channeltoggle ' +
                        'command. This is a bug in the bot (pun ' +
                        'unintended); please let the developer know.',
                    delete: true
                });
            }); // catch
        }); // return new Promise

    } // process
}; // module.exports
