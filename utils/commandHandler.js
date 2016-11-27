const admins = require('./../options/admins.json'), //List of Admin ID's which override the mod permissions check as well as allow use of admin commands
    usageChecker = require('./../utils/usageChecker.js'),
    options = require('./../options/options.json');

module.exports = (msg, args, cmd, bot) => {
    //Checks for Admin command types
    if (cmd.type === "admin" && admins.indexOf(msg.author.id) === -1) {
        //Command Logging in Guilds
        if (msg.channel.guild) {
            console.log(
              guildC("@" + msg.channel.guild.name + ":") +
              channelC(" #" + msg.channel.name) + ": " + warningC(cmd.name) +
              " was attempted by " + userC(msg.author.username + '#' + msg.author.discriminator) +
              warningC(" (user is not an admin)")
            );
        } //Comand Logging in PM's
        else {
            console.log(
              guildC("@Private Message: ") + warningC(cmd.name) +
              " was attempted by " + userC(msg.author.username + '#' + msg.author.discriminator) +
              warningC(" (user is not an admin)")
            );
        }
        return;
    } else {
        //Check if the used location passes the private check or if it passes the DM check to prevent some commands from being used in unintended locations
        if (
          cmd.privateCheck(msg) ||
          (!msg.channel.guild && !cmd.dm) ||
          (
            msg.channel.guild &&
            !cmd.permissionsCheck(msg) &&
            !admins.includes(msg.author.id)
          )
        ) {
            //Command Logging in Guilds
            if (msg.channel.guild) {
                console.log(
                  guildC("@" + msg.channel.guild.name + ":") +
                  channelC(" #" + msg.channel.name) + ": " +
                  warningC(cmd.name) + " was attempted by " +
                  userC(msg.author.username + '#' + msg.author.discriminator) +
                  warningC(" (failed private check or DM check)")
                );
            }
            //Comand Logging in PM's
            else {
                console.log(
                  guildC("@Private Message: ") +
                  warningC(cmd.name) + " was attempted by " +
                  userC(msg.author.username + '#' + msg.author.discriminator) +
                  warningC(" (failed private check or DM check)")
                );
            }
            return;
        }
        //Cooldown check, admins ignore cooldowns
        else if (!(admins.indexOf(msg.author.id) > -1) && cmd.cooldownCheck(msg.author.id)) {
            bot.createMessage(msg.channel.id, `\`${cmd.name}\` is currently on cooldown for ${cmd.cooldownTime(msg.author.id).toFixed(1)}s`);
        }
        //Process the command
        else {
            //Execute the command
            cmd.exec(msg, args, bot)
            // Whether or not arguments of commands are revealed in console.log
            // Set this in options/options.json
            if (options.show_args_in_console === true)
              var showArgs = " (args: " + args + ")";
            else
              var showArgs = "";
            if (msg.channel.guild) {
                //Command Logging in Guilds
                console.log(
                  guildC('@' + msg.channel.guild.name + ':') +
                  channelC(' #' + msg.channel.name) + ': ' +
                  warningC(cmd.name) + ' was used by ' +
                  userC(msg.author.username + '#' + msg.author.discriminator) +
                  showArgs
                );
                //Updates the timestamp for the guild to mark it as active
                usageChecker.updateTimestamp(msg.channel.guild);
            }
            //Comand Logging in PM's
            else {
                console.log(
                  guildC("@Private Message: ") + warningC(cmd.name) +
                  " was used by " +
                  userC(msg.author.username + '#' + msg.author.discriminator)
                );
            }
        }
    }
}
