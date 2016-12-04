// This is actually unnecessary due to the sudo command
// -- Chryssi
const util = require('util');

module.exports = {
    usage: 'A secret command. Only admins can use it.',
    delete: false,
    togglable: true,
    cooldown: 1,
    process: (msg, args) => {
        return new Promise(resolve => {
            let result = '\n';
            console.log('\n' + warningC('eval:') + miscC(' ' + args));
            let a = eval(args);
            if (args) {
                // check if eval(args) actually returns something
                if (a) {
                    if (typeof a.then === 'function') {
                      // eval(args) is a promise
                      a.then(a => console.log(util.inspect(a, { colors: true })));
                    } else if (typeof a === 'object') {
                        // Node.js equivalent of JSON.stringify()
                        console.log('\n' + util.inspect(a, { colors: true }) + '\n');
                    } else {
                        console.log('\n' + a + '\n');
                    }
                }
                // Outputs to terminal because output may be too long to send
                // to Discord (due to max length for HTTP requests and such)
                result = 'See terminal.';
            }
            else result = 'You gotta type something in, silly!';
            resolve({ message: result, delete: true });
        });
    }
};
