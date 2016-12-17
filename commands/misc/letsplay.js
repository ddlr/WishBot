module.exports = {
    usage: "Tell **everyone** you'd like to **play a game**. May **specify a game** if desired. Uses an **@everyone mention** if the user has permission to do so.\n\n`letsplay [game] or [none]`",
    dm: false,
    delete: true,
    cooldown: 30,
    process: obj => {
        var msg = obj.msg,
            args = obj.args;
        return new Promise(resolve => {
            //If args sent use those as the game otherwise just have it be 'a game'
            args = args ? args : "a game";
            if (msg.channel.permissionsOf(msg.author.id).has('mentionEveryone')) resolve({
                message: `🎮 @everyone, **${msg.author.username}** would like to play ${args}! 🎮`,
                disableEveryone: false
            })
            else resolve({
                message: `🎮 Everyone, **${msg.author.username}** would like to play ${args}! 🎮`
            })
        });
    }
}