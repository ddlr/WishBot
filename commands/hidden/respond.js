// For simple replies to particular messages. Examples:
// @Changeling Bot :heart:
// [in PM] thank you

module.exports = {
    usage:
      'You shouldn’t see this message.',
    delete: false,
    cooldown: 1,
    process: (msg, args) => {
        return new Promise(resolve => {
            switch (args) {
                case 'heart':
                    resolve({ message: '💚' });
                    break;
                case 'blue heart':
                    resolve({ message: 'delish.' });
                    break;
                case 'green heart':
                    resolve({ message: 'nom nom nom' });
                    break;
                case 'yellow heart':
                    resolve({ message: 'yum!' });
                    break;
                case 'purple heart':
                    resolve({
                        message: 'congrats! you have just fed 1⃣ changeling.'
                    });
                    break;
                case 'thank you':
                    resolve({ message: 'you’re welcome 💚' });
                    break;
                case 'blehp':
                    resolve({ message: 'no\nblehp *you*.' });
                    break;
                case 'gimme fwaf':
                case 'gimme mwap':
                    resolve({ message: 'no u' });
                    break;
                default:
                    console.log(
                        `${warningC('respond:')} unknown argument ` +
                        `${args} passed`
                    );
            }
        });
    }
};
