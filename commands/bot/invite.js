module.exports = {
    usage: 'Returns the bots invite link to **invite the bot** to your server.',
    aliases: ['inv'],
    cooldown: 30,
    process: obj => {
    	//Returns the link to invite the bot to your server
        return Promise.resolve({
            message: `__**The following link may be used to invite Changeling Bot to your server:**__
**<https://discordapp.com/oauth2/authorize?client_id=249725990232653826&scope=bot&permissions=67365888>**`
        });
    }
}
