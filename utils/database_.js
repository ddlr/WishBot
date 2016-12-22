// Refer to these links for guides to how this actually works
// https://github.com/brianc/node-postgres#client-pooling
// https://github.com/brianc/node-pg-pool#acquire-clients-with-a-promise
//
// There’s no command list for pg.Pool(), so refer to this:
// https://github.com/brianc/node-pg-pool/blob/master/index.js
//
// Also read this for help on query()
// https://github.com/brianc/node-postgres/wiki/Parameterized-queries-and-Prepared-Statements

// TODO: client.release() upon bot shutdown

// channel_settings columns:
// - id (string, up to and including 20 chars long)
//       channel ID which these settings are for (Discord guarantees
//       that this will be an unsigned 64-bit integer - see
//       https://github.com/twitter/snowflake/tree/snowflake-2010)
//
//       Since PostgreSQL doesn’t support the unsigned 64-bit integer
//       type and the Discord API won’t return anything other than
//       numbers in this format, I can get away with using varchar(20)
//       instead (2^64 is 20 digits long).
//
// - disabled_commands (string array)
//       { "command1": true, "command2": true } (in JSON)
//       { "command1" "command2" } (in database)
//       https://www.postgresql.org/docs/9.1/static/arrays.html
//
// guild_settings columns:
// - id
//       guild ID which these settings are for
//       (unsigned bigint / uint64)
// - settings
//       "welcome_message": "welcome message",
//       "welcome_channel": "channel ID to post this message in"
//       "leave_message": "leave message",
//       "leave_channel": "channel ID to post this message in"
// - disabled_commands
//       { "command1": true, "command2": true } (in JSON)
//       { "command1" "command2" } (in database)

// guildTable and channelTable are the names of the table used in ~serverset
// and ~guildset, respectively. Make sure they don’t have spaces.
// In getRow(), the column to retrieve is checked against guildTable_cols or
// channelTable_cols to check if it’s valid.
const util = require('util'),
      pg = require('pg'),
      options = require('./../options/options.json'),
      config = {
          user: options.database_.user,
          database: options.database_.database,
          password: options.database_.password,
          host: options.database_.host,
          port: options.database_.port,
          max: 20
      },
      channelTable = 'channel_settings',
      guildTable = 'guild_settings',
      channelTable_cols = ['id', 'disabled_commands'],
      guildTable_cols = ['id', 'disabled_commands', 'settings'];

var pool = new pg.Pool(config);

function tableNameAndCheckCol(type, column) {
    // Return table name (based on the type parameter) and check column name if
    // it’s a column that actually exists in said table (to mitigate SQL
    // injections)
    var table;
    if (type === 'guild') {
        table = guildTable;
        if (guildTable_cols.includes(column)) {
            // If column is in the guild_settings table
            return table;
        } else {
            throw new Error(`column name ${column} isn’t valid in guild table`);
        }
    } else if (type === 'channel') {
        table = channelTable;
        if (channelTable_cols.includes(column)) {
            // If column is in the channel_settings table
            return table;
        } else {
            throw new Error(`column name ${column} isn’t valid in guild table`);
        }
    } else {
        // If type isn’t either 'guild' or 'channel', i.e. if type is invalid
        throw new Error(`type ${type} isn’t one of the following: guild, channel`);
    }
}

function getRow(type, column, id) {
    // Arguments:
    // type   - name of table to change (guild or channel)
    // column - column to retrieve
    // id     - Discord guild or channel ID
    //
    // SELECT [column] FROM [table] WHERE id = [id];
    return new Promise((resolve, reject) => {
        // Retrieve disabled_commands or settings column from either guild_settings
        // or channel_settings table.

        // Replace 'guild' and 'channel' with actual names of tables via the
        // tableNameAndCheckCol() function. This also checks the column if it
        // actually exists in the respective table.
        var table;
        try {
            var table = tableNameAndCheckCol(type, column);
        } catch (e) {
            console.log(
                errorC('getRow (tableNameAndCheckCol):') +
                e.message
            );
            // Object in reject() is in a similar format as in the reject() function
            // of the ~derpibooru command (commands/fun/derpibooru.js)
            // https://git.io/v1h32
            //
            // However, the message key is omitted because this will be set by the
            // bot command that runs this (hopefully).
            //
            // TODO: Ensure that the above is true (also check in updateTable)
            reject({
                log: ['getRow (tableNameAndCheckCol)', e.message]
            });
        }

        // Retrieve the row
        pool.connect().then(client => {
            client.query(
                'SELECT ' + column + ' FROM ' + table + ' WHERE id = $1',
                [id]
            ).then(res => {
                client.release();
                var response = res.rows[0][column];
                resolve(response);
            }).catch(err => {
                reject({
                    log: ['getRow (client.query)', `Error: ${err.message}`]
                });
            });
        }).catch(err => {
            reject({
                log: ['getRow (pool.connect)', `Error: ${err.message}`]
            });
        });
    }); // return new Promise
}

function addRow(type, column, id) {
    // Add the channel ID or guild ID to a table. This is so updateChannel or
    // updateGuild can be used (with the UPDATE SQL command) can be used later
    // on.
    //
    // INSERT INTO [if type = 'guild' then guildTable,
    //              else if type = 'channel' then channelTable
    //              else ERROR] VALUES (
    //     id [id]
    // );
}

function updateTable(type, column, value, id) {
    // TODO: Remove res_old once out of prod
    //
    // UPDATE [table]
    //     SET [column] = [value]
    //     WHERE id = [id]
    //     RETURNING [comma separated columns]; // This line is optional
    return new Promise((resolve, reject) => {
        // Replace 'guild' and 'channel' with actual names of tables via the
        // tableNameAndCheckCol() function. This also checks the column if it
        // actually exists in the respective table.

        var table;
        try {
            var table = tableNameAndCheckCol(type, column);
        } catch (e) {
            console.log(
                errorC('updateTable (tableNameAndCheckCol):') +
                e.message
            );
            reject({
                log: ['updateTable (tableNameAndCheckCol)', e.message]
            });
        }

        // Update the row
        pool.connect().then(client => {
            client.query(
                'UPDATE ' + table + ' SET ' + column + ' = $1 WHERE id = $2 ' +
                'RETURNING ' + column,
                [value, id]
            ).then(res => {
                client.release();
                var response = res.rows[0][column];
                resolve(response);
            }).catch(err => {
                reject({
                    log: ['updateTable (client.query)', `Error: ${err.message}`]
                });
            });
        }).catch(err => {
            reject({
                log: ['updateTable (pool.connect)', `Error: ${err.message}`]
            });
        });
    }); // return new Promise
}

// TODO: Test if promise.then(function() { return genericFunctionName() }) works
function formatTable(obj) {
    return `**disabled commands**: ${util.inspect(obj)}`;
}

exports.toggleCommands = (type, option, id, commands) => {
    // Holy mother of fuck is this a huge function compared to everything else
    //
    // This function enables/disables/toggles/checks the status of commands for
    // either the channel or the entire guild (i.e. server).
    //
    // Arguments:
    // type     - which table to change (one with the guild IDs or the one with
    //            the channel IDs)
    // option   - enable (0) or disable (1) or toggle (2) or check (3)
    //            command(s)
    // id       - ID to toggle in database (either Discord channel ID or guild
    //            ID)
    // commands - command(s) to enable/disable (array)

    // TODO: Limit commands to three elements

    var res_old;

    return new Promise((resolve, reject) => {
        // TODO: Add rows if they don’t exist
        //
        // Retrieve the disabled commands for this guild or channel
        if ([0, 1, 2].includes(option)) {
            var toggleCommandsMain = getRow(type, 'disabled_commands', id).then(res => {
                return new Promise((resolve, reject) => {
                    // This is only for testing purposes and lets us compare
                    // the disabled_commands before and after. slice() clones
                    // the array so that the switch () statements below don’t
                    // inadvertently affect both arrays instead of just one.
                    //
                    // http://stackoverflow.com/a/7486130
                    res_old = res.slice();

                    // disabled_commands is empty, i.e. no disabled commands
                    // for this guild or channel
                    if (res === null) res = [];

                    switch (option) {
                        case 0:
                            // Enable command(s)
                            for (let i = 0; i < commands.length; i++) {
                                // If command is currently disabled, enable it
                                if (res.includes(commands[i])) {
                                    res.splice(res.indexOf(commands[i]), 1);
                                } else {
                                    console.log(
                                        `Command ${commands[i]} already ` +
                                        'enabled.'
                                    );
                                    // TODO: Alert the user in some way
                                }
                            }
                            break;
                        case 1:
                            // Disable command(s)
                            for (let i = 0; i < commands.length; i++) {
                                // If command is currently enabled, disable it
                                if (! res.includes(commands[i])) {
                                    res.push(commands[i]);
                                } else {
                                    console.log(
                                        `Command ${commands[i]} already ` +
                                        'disabled.'
                                    );
                                    // TODO: Alert the user in some way
                                }
                            }
                            break;
                        case 2:
                            // Toggle command(s)
                            for (let i = 0; i < commands.length; i++) {
                                // Command is disabled, so enable it
                                if (res.includes(commands[i]))
                                    res.splice(res.indexOf(commands[i]), 1);
                                // Command is enabled, so disable it
                                else
                                    res.push(commands[i]);
                            }
                            break;
                    }
                    resolve(res);
                }).then(res => {
                    return updateTable(type, 'disabled_commands', res, id);
                });
            }); // var toggleCommandsMain
        } else if (option === 3) {
            // ‘check’ option passed

            // Commands passed by the user that have been categorised into
            // either ‘disabled’ or ‘enabled’ from the channel settings
            // (~channelset) and the guild/server settings (~serverset)
            var checkedCommands = {
                channel: {
                    disabledCommands: [],
                    enabledCommands: []
                },
                guild: {
                    disabledCommands: [],
                    enabledCommands: []
                }
            };

            // Retrieve disabled commands for both channel and entire
            // guild/server, respectively
            var toggleCommandsMain = getRow('channel', 'disabled_commands', id).then(res => {
                return new Promise((resolve) => {
                    // Check status of command(s)
                    for (let i = 0; i < commands.length; i++) {
                        // If command is currently disabled, insert into
                        // the list of disabled commands for the channel
                        if (res.includes(commands[i]))
                            checkedCommands.channel.disabledCommands.push(commands[i]);
                        // If command is currently enabled, insert into the
                        // list of enabled commands for the channel
                        else
                            checkedCommands.channel.enabledCommands.push(commands[i]);
                    }
                    resolve();
                });
            }).then(() => {
                return getRow('guild', 'disabled_commands', id);
            }).then(res => {
                // Check status of command(s)
                for (let i = 0; i < commands.length; i++) {
                    // If command is currently disabled, insert into
                    // the list of disabled commands for the guild
                    if (res.includes(commands[i]))
                        checkedCommands.guild.disabledCommands.push(commands[i]);
                    // If command is currently enabled, insert into the
                    // list of enabled commands for the guild
                    else
                        checkedCommands.guild.enabledCommands.push(commands[i]);
                }
                return true;
            }).then(() => {
                return formatTable(checkedCommands);
            });
        } else {
            // TODO: Change to this format:
            // reject({
            //     log: [],
            //     message: ''
            // });
            reject(
                `${option} is not a valid option (expected ` +
                'integer from 1 to 3 inclusive).'
            );
        }

        toggleCommandsMain.then(res => {
            return new Promise((resolve) => {
                // Print all the variables to the user.
                // This is just for testing purposes until I actually implement the
                // part where the database is updated (that’s in updateTable)
                var option_inplainenglish;
                switch (option) {
                    case 0:
                        option_inplainenglish = 'enable';
                        break;
                    case 1:
                        option_inplainenglish = 'disable';
                        break;
                    case 2:
                        option_inplainenglish = 'toggle';
                        break;
                    case 3:
                        option_inplainenglish = 'check';
                        break;
                    default:
                        console.log(
                            'for fuck’s sake why is there an error here', option
                        );
                }

                var output_part1 = `**${type} id:** ${id}
**option number:** ${option} (${option_inplainenglish})
**commands passed by user:** ${util.inspect(commands)}`;

                if ([0, 1, 2].includes(option))
                    var output_part2 = `**disabled_commands was:** ${res_old}
**disabled_commands is now:** ${util.inspect(res)}`;
                else
                    var output_part2 = res;


                resolve(output_part1 + '\n' + output_part2);
            });
        }).then(msg => {
            // This finally returns the message to the channelset or serverset
            // command
            resolve(msg);
        }).catch(err => {
            // Do something here, keeping in mind that reject() is in format:
            // reject({
            //     log: ['function name', 'message'],
            //     message: '(optional and may not be supplied already)'
            // });
            console.log(errorC('toggleCommandsMain:'), err);
            reject('toggleCommandsMain');
        });

    }); // return new Promise
};

// This is for changing the welcome/leave messages
// TODO: Implement this
exports.changeSetting = () => {
};
