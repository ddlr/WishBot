var Database = require('./../../utils/database_.js');

// TODO: Import changes from channelset

module.exports = {
    usage:
`This is a command that I’m currently working on. Until I actually finish \
this command, here’s how it’s supposed to work:

\`\`\`
~serverset enable command-one command-two command-three
~serverset disable command-one command-two command-three
~serverset toggle command-one command-two command-three
~serverset check command-one command-two command-three
\`\`\`

Examples:
\`\`\`
~serverset toggle derpibooru
~serverset disable ping clean
~serverset enable lenny whois
~serverset check clean derpibooru
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
