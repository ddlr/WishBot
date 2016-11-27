// Made by Chryssi
// 22 Nov 2016

const https = require('https');
const qs = require('querystring');

module.exports = {
    usage:
      'Returns a **random cute image from Derpibooru**. This works the same way as fourhts’ Cute Horses. (http://wikipedia.sexy/hoers)\n' +
      'For a more flexible version that allows for custom filters and search queries, use ``derpibooru_custom`` or ``dpc``.',
    aliases: ['dp'],
    dm: true,
    delete: false,
    cooldown: 10,
    process: (msg, args, bot) => {
        // Based off fourhts’ cute shipping thing at
        // http://wikipedia.sexy/hoers/
        // and also ES6 promises
        // http://stackoverflow.com/a/14220323

        return new Promise(resolve => {
            // These tags hide nsfw and other unpleasant stuff
            // Note that Derpibooru’s default filter is on automatically
            // https://derpibooru.org/filters/100073

            // Tags that will be used in search
            let tags = 'safe,-inflation,-nazi,-oc:aryanne,-explicit source,-header,-sneezing fetish,-humanized,-anthro,-human,-oc:anon,-impossibly large ass,-base,-blood,-disembodied hands,-morbidly obese,-pregnant,-bean pony,-diamond dog,-nostril flare,-male pregnancy,-g1 to g3.5,-oc:kyrie,-luftwaffe,-aryan pony,-impossibly large everything,-obese,-fat';

            if (args) console.log(
              warningC('derpibooru:') +
              ' arguments used are',
              args
            );

            // Logs warnings in console.log (i.e. terminal)
            function logError(message) {
                console.log(
                  warningC('derpibooru:') + errorC(' Error -') + ' ' + message
                );
            };

            // HTTPS magic here
            //
            // GET
            // 'https://derpibooru.org/search.json?q='+tags+'&page='+page
            //
            // Sorta based on JSON example on
            // https://nodejs.org/api/http.html#http_http_get_options_callback

            function somethingWentWrong(obj) {
                // obj[0]: error message
                // obj[1]: HTTPS request callback, for stopping the HTTPS
                //           request
                logError(obj[0]);

                // Nom on the response data to free up memory
                if (obj[1] !== undefined) obj[1].resume();
                let resolveMessage = 'Error: something went wrong in ' +
                  'fetching images.\n(error message: ' + obj[0] + ')';
                return resolveMessage;
            }

            // Options for getTotalReq
            let getTotalNoOptions = {
                hostname: 'derpibooru.org',
                port: '443',
                path: `/search.json?q=${qs.escape(tags)}&page=1`,
                method: 'GET'
            };

            // Get the total number of search results
            var getTotalNo = new Promise((resolve, reject) => {
                // The actual GET request that retrieves search results
                // (paginated with 15 images per page)
                let getTotalReq = https.get(getTotalNoOptions, (res) => {
                    let error;
                    let contentType = res.headers['content-type'];

                    // Error: Invalid status code
                    if (res.statusCode !== 200) {
                        error = new Error(
                          'getTotalNo: Returned HTTP status ' +
                          `code ${res.statusCode}`
                        );
                    } // Error: Not actually JSON
                    else if ( ! /^application\/json/.test(contentType) ) {
                        error = new Error(
                          'getTotalNo: This is not JSON. This is not JSON at ' +
                          `all. (received ${res.contentType})`
                        );
                    }

                    if (error)
                      reject(somethingWentWrong([ error.message, res ]));

                    res.setEncoding('utf8');
                    let raw = '';

                    res.on('data', (chunk) => raw += chunk);
                    res.on('end', () => {
                        try {
                            // Parsed JSON response
                            let response = JSON.parse(raw);
                            // No. of results
                            resolve(response.total);
                        } catch (e) {
                            logError('getTotalNo: ' + e.message);
                            reject(
                              'Sorry, something went wrong in getting total ' +
                              'number of pages!'
                            );
                        }
                    })

                    res.on('error', (e) => {
                        reject({
                          message: somethingWentWrong([
                            'getTotalNo: ' + e.message
                          ])
                        });
                    });

                    res.on('socket', function (socket) {
                        res.on('timeout', (e) => {
                            reject({
                              message: somethingWentWrong([
                                'getTotalNo: ' + e.message
                              ])
                            });
                            res.abort();
                        });
                    });

                });
            });

            getTotalNo.then(function (resultsTotal) {
                // Getting total number of search results succeeded
                // (this value stored in resultsTotal)

                // Check if resultsTotal is actually a valid number
                if (resultsTotal < 0 || ( ! Number.isInteger(resultsTotal))) {
                  resolve({ message: somethingWentWrong([
                    'Total no. of search results isn’t a number ' +
                    `(got ${resultsTotal})`
                  ])});
                }
                let pagesTotal = Math.ceil(resultsTotal / 15);
                // Search results page to go on (randomised)
                let page = Math.floor(Math.random() * pagesTotal);

                let options = {
                    hostname: 'derpibooru.org',
                    port: '443',
                    path: `/search.json?q=${qs.escape(tags)}&page=${page}`,
                    method: 'GET'
                };

                // The asynchronous request that retrieves an image
                let req = https.get(options, (res) => {
                    let error;
                    let contentType = res.headers['content-type'];

                    // Error: Invalid status code
                    if (res.statusCode !== 200) {
                        error = new Error(` Returned HTTP status code ${res.statusCode}`);
                    } // Error: Not actually JSON
                    else if ( ! /^application\/json/.test(contentType) ) {
                        error = new Error(
                          'This is not JSON. This is not JSON at all.' +
                          ` (received ${res.contentType})`
                        );
                    }

                    if (error)
                      resolve({ message: somethingWentWrong([ error.message, res ]) });

                    res.setEncoding('utf8');
                    let raw = '';

                    res.on('data', (chunk) => raw += chunk);
                    res.on('end', () => {
                        try {
                            // Parse retrieved JSON and select one image
                            let pageIndex = Math.floor(Math.random() * 15);

                            // Parsed JSON response
                            let response = JSON.parse(raw);
                            // Randomly selected image
                            let selection = response.search[pageIndex]
                            // Image URL
                            let image = selection.representations.large;
                            // Image source
                            let source = selection.id;

                            // Message returned
                            let result = '';

                            // Arguments aren't implemented yet
                            if ( args )
                              result += '**NOTE:** Custom tags aren’t implemented yet, but are coming soon.\n';

                            result += 'https:' + image + '\n' +
                              'Source: <https://derpibooru.org/' + source + '>';

                            resolve({ message: result });
                        } catch (e) {
                            logError(e.message);
                            resolve({
                              message: 'Error: Sorry, something went wrong ' +
                                'in parsing images!'
                            });
                        }
                    }); // res.on('end' ... )

                    res.on('error', (e) => {
                        logError(e.message);
                    });

                    res.on('socket', function (socket) {
                        res.on('timeout', (e) => {
                            logError(e.message);
                            res.abort();
                        });
                    });

                }); // let req = https.get
            }, function (reason) {
                // Getting total number of search results failed
                resolve({ message: reason });
            }); // getTotalNo.then()

        }); // return new Promise
    } // process
} // module.exports
