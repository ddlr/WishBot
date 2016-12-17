module.exports = class Command {
    constructor(name, type, settings) {
        //Command Name
        this.name = name;
        //Comand Type
        this.type = type;
        //Command Usage for in the help message
        this.usage = settings.usage || 'No Usage Currently Set.';
        //currentlyOnCooldown time for use in coolDown Check
        this.currentCooldown = {};
        //# of Execution times since startup
        this.execTimes = 0;
        //The Function of the command
        this.run = settings.process;
        //Setting to delete command on use(true by default)
        this.delete = settings.delete || false;
        //Setting for command to work in DM's(Private messages)(true by default)
        this.dm = !(settings.dm === false);
        //The cooldown for the command
        this.cooldown = settings.cooldown || 5;
        // Whether the command is toggable or not with the toggle command (true
        // by default)
        this.togglable = !(settings.togglable === false);
        // Array of aliases the commmand has(none by default)
        this.aliases = settings.aliases || null;
        // Array of guilds the command is resticted to (no restriction by
        // default)
        this.privateGuild = settings.privateGuild || null;
        // Used to define permissions the command requires (none by default)
        this.permissions = settings.permissions || null;
        // Whether this command needs to have guild prefix OR mention the bot in
        // order to run.
        this.needsPrefix = ! ( settings.needsPrefix === false );
    }
    //The template help message which is used in `help [cmdName]`
    get help() {
        return `
__**Command Info for:**__ \`${this.name}\`

${this.usage}

${this.aliases !== null ? '**Aliases:** ' + this.aliases.map(a => "\`"+a+"\`").join(', ') +'\n' : ''}${this.permissions !== null ? '**Permissions:** ' + Object.keys(this.permissions).map(p => "\`"+p+"\`").join(', ') +'\n' : ''}**Cooldown:** \`${this.cooldown}s\` | **Delete on Use:** \`${this.delete}\` | **DM:** \`${this.dm}\` | **Uses:** \`${this.execTimes}\` | **Requires prefix or bot mention:** \`${this.needsPrefix === false ? 'no' : 'yes'}\``;
    }

    //Command Processing
    // obj = {
    //     msg: msg, args: args, bot: bot, i: i, content: obj.content
    // }
    exec(obj) {
        var msg = obj.msg,
            args = obj.args,
            bot = obj.bot,
            i = obj.i;
        // Commands can take and manipulate the msg object, the command
        // arguments and the bot object
        return new Promise(resolve => {
            // Checks if the command deletes on use as well as if the bot has delete permissions before running the msg deletion
            if (
                this.delete && msg.channel.guild &&
                msg.channel.permissionsOf(bot.user.id).has('manageMessages')
            )
                msg.delete().catch(err => console.log(errorC(err)));
            // Adds 1 to the current number of execution times (uses)
            this.execTimes++;
            // Run the command
            // Note the i + 1, which is very important in counting the number
            // of layers deep this command is (to prevent recursion).
            this.run({
                msg: msg, args: args, bot: bot, i: i + 1, content: obj.content
            }).then(
                response => { resolve(response); }
            ).catch(err => console.log(errorC(err)));
        });
    }

    //Cooldown Check(returns true if the command shouldn't be processed)
    cooldownCheck(user) {
        //If the user has a currentCooldown
        if (this.currentCooldown.hasOwnProperty(user))
            return true;
        //Set the currentCooldown to now and remove from object when cooldown period is over
        else {
            this.currentCooldown[user] = Date.now();
            setTimeout(() => {
                delete this.currentCooldown[user];
            }, this.cooldown * 1000);
            return false;
        }
    }

    //Function to get the current cooldown time for the user(is used when a command is on cooldown to show the time left til off cooldown)
    cooldownTime(user) {
        return ((this.currentCooldown[user] + (this.cooldown * 1000)) - Date.now()) / 1000;
    }

    //Private Server Command Check(returns true if command shouldn't be processed)
    privateCheck(msg) {
        if (this.privateGuild === null) //If the command doesn't have a private server array return false
            return false;
        else if (!msg.channel.guild) //Prevents private server commands from working in DM's by returning true if not used in a guild
            return true;
        else if (this.privateGuild.indexOf(msg.channel.guild.id) > -1) //Guild is in the array of privateServers so return false
            return false;
        else //If all else fails return true
            return true;
    }

    //Used to check if the user has the correct permissions for the command if it has any additonal permissions
    permissionsCheck(msg) {
        var hasPermssion = true;
        if (this.permissions != null && msg.channel.guild) {
            var permissionKeys = Object.keys(this.permissions),
                userPermissions = msg.channel.permissionsOf(msg.author.id).json;
            for (var key of permissionKeys) {
                if (this.permissions[key] !== userPermissions[key]) {
                    hasPermssion = false;
                    break;
                }
            }
        }
        return hasPermssion;
    }
};