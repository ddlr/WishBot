// For simple replies to particular messages. Examples:
// @Changeling Bot :heart:
// [in PM] thank you

module.exports = {
    usage:
      'You shouldn’t see this message.',
    delete: false,
    cooldown: 1,
    process: obj => {
        var args = obj.args;
        return new Promise(resolve => {
            switch (args) {
                case 'heart':
                case 'blue heart':
                case 'green heart':
                case 'yellow heart':
                case 'purple heart':
                    resolve({
                        message: 'congrats! you have just fed 1⃣ changeling.'
                    });
                    break;
                default:
                    resolve({ message: 'wha' });
                    break;
            }
        });
    }
};
