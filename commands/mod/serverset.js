var Database = require('./../../utils/database_.js');

// TODO: Import changes from channelset

module.exports = {
    usage:
`This is a command that I’m currently working on. Until I actually finish \
this command, here’s how it’s supposed to work:

\`\`\`
# Enable one/two/three command(s) for the current server
~serverset enable command-one command-two command-three
# Enable all commands
~serverset
# Disable one/two/three command(s)
~serverset disable command-one command-two command-three
# Toggle one/two/three command(s). If the command is enabled, disable it. If \
the command is disabled, enable it. This is done on each command separately.
~serverset toggle command-one command-two command-three
# Check whether or not the following commands are enabled.
~serverset check command-one command-two command-three

\`\`\`

Examples:
\`\`\`
~serverset toggle derpibooru
~serverset disable ping clean derpibooru
~serverset enable lenny whois
~serverset check info
\`\`\``
        ,
    aliases: ['sset'],
    dm: false,
    togglable: false,
    delete: true,
    permissions: {
        'manageGuild': true
    },
    cooldown: 5,
    process: obj => {
        var msg = obj.msg,
            args = obj.args;
        return new Promise(resolve => {
            resolve({
                message: 'This command is currently in development!',
                delete: true
            });
        });
    }
};
