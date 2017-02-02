var jokes = require('./../../lists/jokes.json');

module.exports = {
    usage: 'Returns a **random joke**.',
    process: () => {
        return Promise.resolve({
            message: jokes[~~(Math.random() * (jokes.length))]
        })
    }
}
