// TODO: How to make this reloadable?
const runCmd = require('./../../utils/commandRun.js');

module.exports = {
    usage: 'A fun way to run a particular preset of commands.\n' +
        '**Usage:**\n' +
        '``gimme fluff`` or ``gimme cute``: runs ``dpc cute,-oc,-screencap``\n' +
        '``gimme fwaf`` and ``gimme mwap``: find out yourself ;)'
        ,
    dm: true,
    delete: false,
    cooldown: 5,
    needsPrefix: false,
    process: obj => {
        var msg = obj.msg,
            args = obj.args,
            i = obj.i;
        return new Promise(resolve => {
            switch (args) {
                // gimme fluff OR gimme cute
                // becomes
                // ~dpc cute,-oc,-screencap
                case 'fluff':
                case 'cute':
                    resolve(
                        runCmd({
                            msg: msg,
                            args: 'cute,-oc,-screencap',
                            cmdTxt: 'derpibooru',
                            i: i
                        })
                    );
                    break;
                // gimme fwaf OR gimme mwap
                case 'fwaf':
                case 'mwap':
                    resolve({
                        message: 'no u'
                    });
                    break;
            }
        });
    }
};
