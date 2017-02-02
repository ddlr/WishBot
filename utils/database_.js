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

// TODO: log() function at start of database_.js with option to resolve()
//       immediately (for errors) or keep going (for warnings). Concatenate
//       error messages to resolve() and send to user as a message on Discord.

// TODO: 'all' for options 0, 1, 2
// TODO: Honour togglable option in commands
// TODO: Ignore database output if command isn’t togglable anyway

// guildTable and channelTable are the names of the table used in ~serverset
// and ~guildset, respectively. Make sure they don’t have spaces.
// In getRow(), the column to retrieve is checked against guildTable_cols or
// channelTable_cols to check if it’s valid.
//
// maxCommandsPassed sets the maximum number of commands that can be passed at
// once in the ~channelset and ~serverset commands.
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
      guildTable_cols = ['id', 'disabled_commands', 'settings'],
      maxCommandsPassed = 5;

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
    // TODO: Add row if it doesn’t exist

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
                client.release();
                if (err.message ===
                    'Cannot read property \'' + column + '\' of undefined') {
                    addRow(type, column, id).then(
                        () => getRow(type, column, id)
                    ).then(
                        out => resolve(out)
                    ).catch(err => {
                        reject({
                            log: ['getRow (addRow)', `Error: ${err.message}`]
                        });
                    });
                } else {
                    reject({
                        log: ['getRow (client.query)', `Error: ${err.message}`]
                    });
                }
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

    // TODO: DRY this block?
    var table;
    try {
        var table = tableNameAndCheckCol(type, column);
    } catch (e) {
        console.log(
            errorC('addRow (tableNameAndCheckCol):') +
            e.message
        );
        reject({
            log: ['addRow (tableNameAndCheckCol)', e.message]
        });
    }

    return new Promise((resolve, reject) => {
        pool.connect().then(client => {
            client.query(
                'INSERT INTO ' + table + ' VALUES ( $1, \'{}\' )'
              , [id]
            ).then(res => {
                client.release();
                resolve();
            }).catch(err => {
                reject({
                    log: ['addRow (client.query)', `Error: ${err.message}`]
                });
            });
        });
    });
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
                client.release();
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
    let result;
    result =
`**disabled** commands in **channel**: ${obj.channel.disabledCommands.join(', ')}
**enabled** commands in **channel**: ${obj.channel.enabledCommands.join(', ')}
**disabled** commands in **server**: ${obj.guild.disabledCommands.join(', ')}
**enabled** commands in **server**: ${obj.guild.enabledCommands.join(', ')}`;
    return result;
}

exports.toggleCommands = (type, option, id, cmdArgs, authorId) => {
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
    // cmdArgs  - command(s) to enable/disable (array) OR ‘all’ to
    //            enable/disable all commands (the latter only works with
    //            option 0 and 1)
    // msg      - message object

    var res_old;

    return new Promise((resolve, reject) => {
        // This const statement cannot run at the beginning of the file or else
        // commandLoader.js (which initialises commands object) will not have
        // loaded yet
        // TODO: Remove this
        // const commandsList = Object.keys(commands);

        // Check for too many commands passed at once
        if (cmdArgs.length > maxCommandsPassed) {
            console.log(
                errorC('toggleCommands:') +
                ` too many commands passed (${cmdArgs.length} passed, max ` +
                `is ${maxCommandsPassed})`
            );
            reject(
                `Error: too many commands passed (${cmdArgs.length} ` +
                `passed, max is ${maxCommandsPassed})`
            );
        }

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
                            for (let i = 0; i < cmdArgs.length; i++) {
                                // If command is currently disabled, enable it
                                if (res.includes(cmdArgs[i])) {
                                    res.splice(res.indexOf(cmdArgs[i]), 1);
                                } else {
                                    console.log(
                                        `Command ${cmdArgs[i]} already ` +
                                        'enabled.'
                                    );
                                    // TODO: Alert the user in some way
                                }
                            }
                            break;
                        case 1:
                            // Disable command(s)
                            for (let i = 0; i < cmdArgs.length; i++) {
                                // Check if command is togglable, and if so,
                                // don’t disable it
                                //
                                // Note that this if statement only runs when
                                // disabling a command and when toggling a
                                // command results in disabling it.
                                //
                                // This is to ensure that if a command was
                                // previously togglable and now isn’t, the user
                                // can still enable the command.
                                if (commands[cmdArgs[i]].togglable !== true) {
                                    console.log(
                                        warningC('toggleCommandsMain.then: (disable)') +
                                        ' Cannot disable command ' +
                                        `${cmdArgs[i]} because it is not ` +
                                        'togglable'
                                    );
                                    continue;
                                }

                                // If command is currently enabled, disable it
                                if (! res.includes(cmdArgs[i])) {
                                    res.push(cmdArgs[i]);
                                } else {
                                    console.log(
                                        `Command ${cmdArgs[i]} already ` +
                                        'disabled.'
                                    );
                                    // TODO: Alert the user in some way
                                }
                            }
                            break;
                        case 2:
                            // Toggle command(s)
                            for (let i = 0; i < cmdArgs.length; i++) {
                                // Command is disabled, so enable it
                                if (res.includes(cmdArgs[i])) {
                                    res.splice(res.indexOf(cmdArgs[i]), 1);
                                }
                                // Command is enabled, so disable it
                                else {
                                    // Check if command is togglable, and if
                                    // so, don’t disable it
                                    if (commands[cmdArgs[i]].togglable !== true) {
                                        console.log(
                                            warningC('toggleCommandsMain.then (toggle):') +
                                            ' Cannot disable command ' +
                                            `${cmdArgs[i]} because it is not ` +
                                            'togglable'
                                        );
                                        // TODO: add reject()
                                    }

                                    res.push(cmdArgs[i]);
                                }
                            }
                            break;
                    }
                    resolve(res);
                }).then(res => {
                    return updateTable(type, 'disabled_commands', res, id);
                }).catch(res => {
                    // TODO: Error handling
                });
            }).catch(err => {
                // TODO: Error handling
            });
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
                    // Check status of ALL commands
                    // Realistically, the only command that will trigger this
                    // is `~channelset check all` or `~serverset check all` as
                    // commands that pass multiple parameters like
                    // `~channelset check all derpibooru` will be rejected by
                    // frontend (i.e. ~channelset or ~serverset)
                    if (cmdArgs.includes('all')) {
                        // Filter out admin, hidden commands from check output
                        cmdArgs = Object.keys(commands).filter(cmd => {
                            if (commands[cmd].type === 'admin' &&
                                !admins.includes(msg.author.id)) {
                                return false;
                            } else if (commands[cmd].type === 'hidden') {
                                return false;
                            } else {
                                return true;
                            }
                        });
                    }
                    // Check status of command(s)
                    for (let i = 0; i < cmdArgs.length; i++) {
                        // If command is currently disabled, insert into
                        // the list of disabled commands for the channel
                        if (res.includes(cmdArgs[i]))
                            checkedCommands.channel.disabledCommands.push(cmdArgs[i]);
                        // If command is currently enabled, insert into the
                        // list of enabled commands for the channel
                        else
                            checkedCommands.channel.enabledCommands.push(cmdArgs[i]);
                    }
                    resolve();
                });
            }).then(() => {
                return getRow('guild', 'disabled_commands', id);
            }).then(res => {
                // Check status of command(s)
                for (let i = 0; i < cmdArgs.length; i++) {
                    // If command is currently disabled, insert into
                    // the list of disabled commands for the guild
                    if (res.includes(cmdArgs[i]))
                        checkedCommands.guild.disabledCommands.push(cmdArgs[i]);
                    // If command is currently enabled, insert into the
                    // list of enabled commands for the guild
                    else
                        checkedCommands.guild.enabledCommands.push(cmdArgs[i]);
                }
                return true;
            }).then(() => {
                return formatTable(checkedCommands);
            }).catch(res => {
                // TODO: Error handling
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
**commands passed by user:** ${util.inspect(cmdArgs)}`;

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
