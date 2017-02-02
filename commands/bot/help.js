var utils = require('./../../utils/utils.js'),
    admins = require('./../../options/admins.json'),
    options = require('./../../options/options.json');

module.exports = {
    aliases: ['commands'],
    needsPrefix: true,
    process: obj => {
        var msg = obj.msg,
            args = obj.args,
            bot = obj.bot;
        return new Promise(resolve => {
            //Check is args are an alias and if so replace args with correct command text
            commandAliases.hasOwnProperty(args)
                ? args = commandAliases[args]
                : args;
            // First part:
            // If the args are a command and the command isn't help return the
            // commands usage info
            //
            // Second part:
            // Don’t reveal what admin and hidden commands do
            if ( commands.hasOwnProperty(args) && args !== 'help' &&
                ( ( commands[args].type !== 'admin' ||
                    admins.includes(msg.author.id)
                  ) && commands[args].type !== 'hidden'
                ) ) {
                resolve({ message: commands[args].help });
            }
            else {
                // Help object for sorting by type before sending
                let help = {};
                // Start of help message by default
                let helpMsg =
`**__${bot.user.username}'s Commands:__**

Note that most commands require a **command prefix** or **mentioning the \
bot** at the start of the command to run. For example, the \`ping\` command \
is run as \`[command prefix]ping\` or \`@Changeling Bot ping\`. See \
**Requires prefix or bot mention** in \`[command prefix]help (name of command \
of alias)\` to check.

Also note that the command prefix for the current server can be changed using \
\`${options.prefix}setprefix\`. You can always check the **current command \
prefix** set by running \`${options.prefix}checkprefix\`.\n`;

                // Check if command should be included in output of help command
                // Prints true if yes, false if no
                //
                // Note that most of these check if the command can be run by
                // the user
                function checkIfPrintCommand(list, cmd, msg) {
                    // Skip help command in help message
                    if (list[cmd].name === 'help')
                        return false;
                    // Skip help command in help message
                    if (list[cmd].name === 'help')
                        return false;
                    // Skip command if cannot be used in DM's
                    if (list[cmd].dm === false && !msg.channel.guild)
                        return false;
                    // Skip command if it’s an admin command and the user isn’t
                    // an admin
                    if (
                        list[cmd].type === 'admin' &&
                        !admins.includes(msg.author.id)
                    ) {
                        return false;
                    }
                    // Skip hidden commands
                    if (list[cmd].type === 'hidden')
                        return false;
                    // Skip mod command if user isn't a mod (has manageGuild
                    // permission)
                    if (
                        !list[cmd].permissionsCheck(msg) &&
                        !admins.includes(msg.author.id)
                    ) {
                        return false;
                    }

                    if (! list[cmd].privateCheck(msg))
                        return true;
                    else
                        return false;
                }
                for (let command in commands) {
                    // If the help object doesn't have the command type property
                    // already add it
                    if (!help.hasOwnProperty(commands[command].type))
                        help[commands[command].type] = [];

                    // If the command passes command check, add to help object
                    if (checkIfPrintCommand(commands, command, msg))
                        help[commands[command].type].push(command);
                }
                // Sort help message alphabetically by type
                help = utils.sortObj(help);
                // Loop for each type in the help message
                for (let type in help) {
                    // Create each help type category and sort the commands for
                    // that type alphabetically
                    helpMsg += help[type].length > 0
                                 ? `\n**${utils.toTitleCase(type)}:** ` +
                                   help[type].sort().map(cmd => '`' + cmd + '`').join(', ')
                                 : '';
                }

                // List of command aliases to output in help
                let aliases = [];
                for (let alias in commandAliases) {
                    if (commandAliases.hasOwnProperty(alias)) {
                        // If the command to which this is an alias passes
                        // command check, add to aliases object
                        if (checkIfPrintCommand(
                            commands, commandAliases[alias], msg)
                        ) {
                            aliases.push(alias);
                        }
                    }
                }
                helpMsg += '\n';
                // Add aliases list to help output
                helpMsg += aliases.length > 0
                             ? '\n**Command aliases:** ' +
                               aliases.sort().map(cmd => '`' + cmd + '`').join(', ')
                             : '';
                //Return help message
                resolve({
                    message:
                        helpMsg +
                        '\n\nFor additional info on a specific command or ' +
                        'alias, including whether a command or alias works ' +
                        'without a prefix or bot mention, use `[command prefix]help ' +
                        '(name of command or alias)`, e.g. `[command prefix]help dp`.'
                });
            }
        });
    }
}
