const options = require('./../options/options.json')
  , winston = require('winston') // Used for logging to file
  , loggingLevels = // Used by Winston and in turn utils.fileLog
      { levels:
          { error: 0
          , warn: 1
          , info: 2
          , debug: 3
          }
      , colors:
          { error: 'red'
          , warn: 'orange'
          , info: 'green'
          , debug: 'blue'
          }
      }
  , fileLog = new(winston.Logger)( // Creates log transport to log to error.log file
      { transports:
          [ new (winston.transports.File)( // Log file
              { filename: 'error.log' // The name of the logging file
              , prettyPrint: true
              , json: false
              , level: options.debugging_level
                    ? options.debugging_level
                    : 'warn'
              , colorize: true // Add COLOURS
              }
            )
          , new (winston.transports.Console)(
              { level: options.debugging_level // Minimum error level in order to print
                    ? options.debugging_level
                    : 'warn'
              , colorize: true
              }
            )
          ]
      , levels: loggingLevels.levels
      , colors: loggingLevels.colors
      }
    )
  , fs = require('fs');

exports.loggingLevelsNames = loggingLevels.levels;

//Covert string to having just first character uppercase and the rest lowercase
exports.toTitleCase = str => {
    //Finds words and replaces the word with a title case word, doesn't matter what it was previously(title case is the first letter of each word is uppercase and rest lowercase)
    return str.replace(/\w\S*/g, word => {
        return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
    });
}

//Used to escape regex and prevent errors
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
exports.escapeRegExp = escapeRegExp;

//Thing to sort objects (converts object to array, sorts array then reconverts to object)
exports.sortObj = obj => {
    var temp_array = [],
        temp_obj = {};
    //Converts Object to array
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            temp_array.push(key);
        }
    }
    //Sorts array
    temp_array.sort();
    //Converts array back to object
    for (var i = 0; i < temp_array.length; i++) {
        temp_obj[temp_array[i]] = obj[temp_array[i]];
    }
    return temp_obj;
};

//Splits array into the number size you specify
exports.splitArray = (array, size) => {
    var sets = [],
        chunks = array.length / size,
        i = 0;
    //This code creates an array of arrays and its magic don't question it
    for (var i = 0, j = 0; i < chunks; i++, j += size) {
        sets[i] = array.slice(j, j + size);
    }
    return sets;
}

exports.fileLog = arr => {
    // a arr[0]: file from which log was called
    // b arr[1]: error level (see loggingLevels constant at top of this file)
    // c arr[2]: The function from which log was originally called
    // d arr[3]: Log message
    //   arr[4]: Error stack (optional)
    var a, b, c, d;

    if (arr instanceof Array) {
        a = arr[0] ? arr[0] : 'unknown file';

        c = arr[2] ? arr[2] : 'unknown function';
        d = arr[3] ? arr[3] : 'unknown error';

        // Looks like
        //   aRandomFile - (erroringFunction) error message here
        //   [error stack]
        if (! loggingLevels.levels.hasOwnProperty(arr[1])) {
            // Default to warning if logging level not specified
            b = 'warn';
        } else {
            b = arr[1];
        }
        // If there’s an error stack, print that instead
        fileLog.log(b, `${a} - (${c}) ${d}`);
        if (arr[4])
            fileLog.log('error', arr[4]);
    } else {
        fileLog.log('error', arr);
    }
}

//Try to get a user object from a typed name
exports.getName = (msg, name) => {
    //Creates name regex to search by
    var nameRegex = new RegExp(escapeRegExp(name), "i");
    //If not in a guild make the msg.user the msg.author(msg.user doesn't normally exit but it helps me do some commands easier)
    if (!msg.channel.guild) {
        msg.user = msg.author;
        return msg;
    } else if (!name) return msg.channel.guild.members.get(msg.author.id); //If no name passed return the member object of the user
    //Check to see if you're able to find the user by nickname or username and return the object if found, if not return the author's member object
    else return msg.channel.guild.members.find(member => (member.nick || member.user.username).match(nameRegex)) ? msg.channel.guild.members.find(member => (member.nick || member.user.username).match(nameRegex)) : msg.channel.guild.members.get(msg.author.id);
}

//Deletes the passed message after 5000ms
exports.messageDelete = msg => {
    setTimeout(() => {
        msg.delete();
    }, 5000)
}

exports.saveFile = (file, data) => {
    var ext = /(?:\.([^.]+))?$/.exec(file);
    fs.writeFile(`${file}-temp${ext}`, data, error => {
        if (error) {
            console.log(errorC(err))
        } else {
            fs.stat(`${file}-temp${ext}`, (err, stats) => {
                if (err || stats["size"] < 5) {
                    console.log(errorC(`Did not save ${file} due to error.`))
                } else {
                    fs.renameSync(`${__dirname}/${file}-temp${ext}`, `${__dirname}/${file}${ext}`)
                }
            });
        }
    });
}
