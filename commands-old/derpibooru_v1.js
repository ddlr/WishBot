// Made by Chryssi
// 20 Nov 2016
//
// TODO:
// Replace XMLHttpRequest with native npm http package
// (this has been added in the derpibooru and derpibooru_custom commands)
// Add ability to customise tags (e.g. changelings)
// (this has been added in the derpibooru command)
//
// This command requires the xmlhttprequest package installed
// I had version ^1.8.0 installed when I was writing this, go figure

const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

module.exports = {
    usage: 'Returns a cute derpibooru image.',
    delete: false,
    cooldown: 10,
    process: (msg, args, bot) => {
        // Based off fourhts’ cute shipping thing at
        // http://wikipedia.sexy/hoers/
        // and also ES6 promises
        // http://stackoverflow.com/a/14220323

        return new Promise(resolve => {
            // Initialise the message sent to the user

            // Magical AJAX part
            let xhr = new Promise((resolve, reject) => {
                // Set up variables
                let tags = 'safe,cute,-shipping,-comic,-inflation,-nazi,' +
                  '-oc:aryanne,-explicit source,-header,-sneezing fetish,' +
                  '-humanized,-anthro,-human,-equestria girls,-oc:anon,' +
                  '-impossibly large ass,-base,-blood,-disembodied hands,' +
                  '-morbidly obese,-pregnant,-bean pony,-diamond dog,' +
                  '-nostril flare,-male pregnancy,-g1 to g3.5,-oc:kyrie,' +
                  '-luftwaffe,-aryan pony,-impossibly large everything,' +
                  '-obese,-fat';
                let page = Math.floor(Math.random() * 2000);

                // Retrieve JSON from Derpibooru
                let request = new XMLHttpRequest();
                request.onload = function () {
                    if (this.status >= 200 && this.status < 400) {
                        resolve(this.responseText);
                    } else {
                        reject('Error in status code ' + this.status +
                          ' returned by Derpibooru.');
                    }
                };
                request.open(
                    'GET',
                    'https://derpibooru.org/search.json?q=' + tags + '&page=' +
                      page
                );
                request.send();
            });

            xhr.then(function (res) {
              // Parse retrieved JSON and select one image
              let pageIndex = Math.floor(Math.random() * 15);

              let response = JSON.parse(res);
              let image = response.search[pageIndex]['representations']['large'];
              let result = 'https:' + image;
              resolve({ message: result });
            }, function (rej) {
              // Failed; return error message
              let result = rej;
              resolve({ message: result });
            });

        });
    }
}
