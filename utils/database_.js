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

function getRow(type, column, id) {
    // Arguments:
    // type   - name of table to change (guild or channel)
    // column - column to retrieve
    // id     - Discord guild or channel ID
    return new Promise((resolve, reject) => {
        // Retrieve disabled_commands or settings column from either guild_settings
        // or channel_settings table.

        // Replace 'guild' and 'channel' with actual names of tables
        var table;
        if (type === 'guild') {
            table = guildTable;
            if (! guildTable_cols.includes(column))
                reject({
                    log: [
                        'getRow',
                        `column name ${column} is invalid (not in ` +
                        'guildTable columns list)'
                    ]
                });
        } else if (type === 'channel') {
            table = channelTable;
            if (! channelTable_cols.includes(column))
                reject({
                    log: [
                        'getRow',
                        `column name ${column} is invalid (not in ` +
                        'channelTable columns list)'
                    ]

                });
        }
        // Object in reject() is in a similar format as in the reject() function
        // of the ~derpibooru command (commands/fun/derpibooru.js)
        // https://github.com/ddlr/WishBot/blob/chryssi/commands/fun/derpibooru.js#L607
        //
        // However, the message key is omitted because this will be set by the
        // bot command that runs this (hopefully).
        //
        // TODO: Ensure that the above is true
        else {
            reject({
                log: ['getRow', `type is invalid (got ${type})`]
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
                    log: ['getRow (pool.connect)', `Error: ${err.message}`]
                });
            });
        }).catch(err => {
            // TODO: Make this more informative
            console.log('blehpp');
        });
    });
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
    // UPDATE [if type = 'guild' then guildTable
    //         else if type = 'channel' then channelTable
    //         else ERROR]
    //     SET [column] = [value]
    //     WHERE id = [id]
    //     RETURNING [comma separated columns]; // This line is optional
    return new Promise((resolve, reject) => {
        resolve();
    });
}

// Test function
// This is an example of how to retrieve data
/*
pool.connect().then(client => {
    client.query(
        'SELECT disabled_commands FROM guild_settings WHERE id = $1',
        ['185628587859116033']
    ).then(res => {
        client.release();
        console.log(res.rows[0].disabled_commands);
    }).catch(err => {
        client.release();
        console.log(err.message, err.stack);
    });
});
*/

exports.toggleCommands = (type, option, id, commands) => {
    // Holy mother of fuck is this a huge function compared to everything else
    //
    // Arguments:
    // type     - which table to change (one with the guild IDs or the one with
    //            the channel IDs)
    // option   - enable (0) or disable (1) or toggle (2) or check (3)
    //            command(s)
    // id       - ID to toggle in database (either Discord channel ID or guild
    //            ID)
    // commands - command(s) to enable/disable (array)

    // Retrieve commands
    //
    // SELECT disabled_commands
    //     FROM [if type = 'guild' then guildTable
    //           else if type = 'channel' then channelTable
    //           else ERROR]
    //     WHERE id = [id];
    //
    // Change commands
    //
    // updateTable(type, column, value, id)

    // TODO: Limit commands to three elements

    return new Promise((resolve, reject) => {
        // TODO: Add rows if they don’t exist
        //
        // Retrieve the disabled commands for this guild or channel
        getRow(type, 'disabled_commands', id).then(res_old => {
            return new Promise((resolve, reject) => {
                // This is only for testing purposes and lets us compare the
                // disabled_commands before and after. slice() clones the array
                // so that the changes in the switch () below don’t affect
                // the old array.
                //
                // http://stackoverflow.com/a/7486130
                var res = res_old.slice();

                // disabled_commands is empty, i.e. no disabled commands for
                // this guild or channel
                if (res === null) {
                    res = [];
                }

                switch (option) {
                    case 0:
                        // Enable command(s)
                        for (let i = 0; i < commands.length; i++) {
                            // If command is currently disabled, enable it
                            if (res.includes(commands[i])) {
                                res.splice(res.indexOf(commands[i]), 1);
                            } else {
                                console.log(`Command ${commands[i]} already enabled.`);
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
                                console.log(`Command ${commands[i]} already disabled.`);
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
                    case 3:
                        // Check status of command(s)
                        for (let i = 0; i < commands.length; i++) {
                            // TODO: Finish this
                        }
                        break;
                    default:
                        // TODO: Change to this format:
                        // reject({
                        //     log: [],
                        //     message: ''
                        // });
                        reject(
                            `${option} is not a valid option (expected ` +
                            'integer from 0 to 3 inclusive).'
                        );
                }
                resolve({ res_old: res_old, res: res });
            })
        }).then(obj => {
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
                        console.log('for fuck’s sake why is there an error here', option);
                }

                resolve(
`**${type} id:** ${id}
**option number:** ${option} (${option_inplainenglish})
**commands passed by user:** ${util.inspect(commands)}
**disabled_commands was:** ${obj.res_old}
**disabled_commands is now:** ${obj.res}`
                );
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
            console.log(errorC('getRow:'), err);
            reject('blehp');
        });

    }); // return new Promise
};

// This is for changing the welcome/leave messages
// TODO: Implement this
exports.changeSetting = () => {
};
