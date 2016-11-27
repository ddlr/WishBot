// Made by Chryssi
// 22 Nov 2016, 23 Nov 2016, 24 Nov 2016
//
// TODO: Use embed for image
// refer to commands/bot/whois.js for example
// https://discordapp.com/developers/docs/resources/channel#embed-object
//
// TODO: add a maximum limit to args length
//
// TODO: Add https caching
//
// TODO: consolidate console.log() into one wrapper function that automatically
//       prints "derpibooru:" at the front of the command as infoC() or
//       miscC() depending on parameters
//
// TODO: Make an option in options/options.json called debugging that enables or
//       disables excessive use of console.log()

'use strict';

// TODO: See if I can merge this into one const statement
const https = require('https');
const qs = require('querystring');
const admins = require('./../../options/admins.json');

function bacon(args, blehp, authorID) {
    // Custom filters.
    //
    // `include` is the Derpibooru filter this filter includes. This is
    // passed along to Derpibooru as the `filter_id` parameter. The
    // number is from derpibooru.org/filters/[basedOn number], e.g.
    // https://derpibooru.org/filters/100073. Be careful when changing
    // this, because if you muck this up and type in something like the
    // Maximum Spoilers filter, you will end up getting images of
    // things too evil for this world.
    //
    // `default` filter hides a lot of unpleasant stuff. You can see
    // what tags it blocks here:
    // https://derpibooru.org/filters/133664
    //
    // or below - hides the below filters:
    // 1000 hours in ms paint, anthro, aryan pony,
    // background pony strikes again, base, bean pony, blood,
    // content-aware scale, deviantart stamp, diamond dog,
    // disembodied hands, drama, explicit, explicit source,
    // exploitable meme, fat, fluffy pony, fluffy pony grimdark,
    // foalcon, forced meme, g1 to g3.5, greentext, grimdark,
    // grotesque, header, human, image macro, impossibly large ass,
    // impossibly large everything, inflation, luftwaffe,
    // male pregnancy, morbidly obese, nazi, nostril flare,
    // not pony related, obese, obligatory pony, oc:anon, oc:aryanne,
    // oc:kyrie, op is a duck, pony creator, pregnant, questionable,
    // seizure warning, semi-grimdark, sneezing fetish, suggestive,
    // text only, youtube caption
    //
    // `raridash`, `fourhts`, and `fourths` is for fourhts. You’re welcome.
    //
    // TODO: Make this into the form of a database, like the setguildprefix
    // command
    const filters = {
        default: {
            include: 133664
        }, rdd: {
            include: 133664,
            tags: 'cute,-comic,raridash,artist:raridashdoodles'
        }, fourths: {
            aliasOf: 'fourhts'
        }, fourhts: {
            tags: '(raridash OR sciset OR taviscratch OR raripie OR appleshy ' +
              'OR hoodies OR twinkie OR rarilight OR thoraxspike) AND cute ' +
              'AND NOT comic'
        }
    }

    // Whether to continue making requests to Derpibooru
    // Set to false when somethingWentWrong() is called
    let makeRequest = true;

    // Error-handling function used in this command
    function somethingWentWrong(obj) {
        makeRequest = false;
        // obj[0]: error message
        // obj[1]: HTTPS request callback, for stopping the HTTPS
        //           request
        logError(obj[0]);

        // Nom on the response data to free up memory
        if (obj[1] !== undefined) obj[1].resume();
        let resolveMessage = 'Error: something went wrong in ' +
          'fetching images.\n(error message: ' + obj[0] + ')';
        // blehp() is the equivalent of the resolve() function in promises
        // i.e. blehp() is what helps output resolveMessage to Discord
        blehp(resolveMessage);
    }

    let filter, tags;

    // Set tags that will be used in search
    if (args) {
        // Use-case #1, e.g. derpibooru `fourths or derpibooru `133664
        // With custom filters

        if (args.charAt(0) === '`') {
            let filterTags;
            console.log(
              miscC('derpibooru:') +
              ' command - ' +
              JSON.stringify(args.split(/ (.+)/))
            );

            // first word is the name of the filter (e.g. `raridash)
            // the backtick is removed before the first word is
            // assigned to the filter variable
            filter = args.split(/ (.+)/)[0].slice(1);

            // second word onwards is list of tags
            let customTags = args.split(/ (.+)/)[1];

            if (Number.isInteger(parseInt(filter)) && parseInt(filter) > 0) {
                // Check if user is admin
                // TODO: Make this available to mods as well, and make it
                // toggleable (also see the checkIfFilter function)
                if (! (admins.indexOf(authorID) > -1)) {
                    somethingWentWrong([
                      'You do not have permission to select your own filter ' +
                      '(via the ` format).'
                    ]);
                }
                filterTags = '';
            }
            // Setting filterTags, i.e. retrieving the tags key in the
            // filter in the filters object. The comments are the only
            // reason this section is so long, so they better be useful
            // to somebody. I hope.
            // Filter stated by user (first parameter which is prefixed
            // by a backtick ` ) exists in the filters object
            else if (filters.hasOwnProperty(filter)) {
                function blohp(filter, i) {
                    // Check if filter is an alias of another filter
                    // Also prevent recursion (i is max number of times to run)
                    //
                    // This is the maximum level you can nest aliases (3):
                    // a { aliasOf: 'b' },
                    // b { aliasOf: 'c' },
                    // c { aliasOf: 'd' },
                    // d { tags: 'cute,-comic,raridash' }

                    function blihp() {
                        // Check if filter has tags
                        if (
                          filters.hasOwnProperty(filter) &&
                          filters[filter].hasOwnProperty('tags')
                        ) {
                            return filters[filter].tags;
                        } else {
                            somethingWentWrong([
                              `filter ${filter} doesn’t exist!`
                            ]);
                            return ''; // TODO: Redundant?
                        }
                    }

                    // Check if filter is an alias
                    if (
                      filters.hasOwnProperty(filter) &&
                      filters[filter].hasOwnProperty('aliasOf')
                    ) {
                        if (i < 3) {
                            return blohp(filters[filter].aliasOf, i + 1);
                        } else {
                            console.log(
                              errorC('derpibooru:') +
                              ' filter aliases in filters database nested ' +
                              'too deep!'
                            );
                        }
                    } else {
                        return blihp();
                    }
                }
                filterTags = blohp(filter, 0);
            }
            // Filter stated by user does not actually exist in the
            // filters object
            else {
                // Check if filters object has a default filter to fall
                // back to
                if (filters.hasOwnProperty('default')) {
                  // Set the filter to default to not trip up
                  // checkIfFilter down below… or something like that.
                  //
                  // TODO: Find out if changing the filter variable
                  // actually matters
                  filter = 'default';
                  filterTags =
                    filters[filter].hasOwnProperty(tags)
                      ? filters[filter].tags
                      : '';
                }
                // Default filter doesn't exist -- what the fuck?
                // Since there's nothing to fall back to, leave filter
                // and filterTags blank
                else {
                  filter = '';
                  filterTags = '';
                }
            }
            console.log(
              miscC('derpibooru: ') +
              '(filterTags) ' +
              filterTags
            );

            // Set tags based on if filter tags exist (in the
            // form of filters[name of filter].tags) and if there are
            // custom tags passed by the command parameters
            //
            // Note that filter tags are different from Derpibooru
            // filters -- Derpibooru filters are passed by the
            // &filter_id query, are positive integers, and can be seen
            // on the Derpibooru website. Filter tags are only in the
            // filters object, above. Examples of filter tags are the
            // tags key in filters['changeling'] and
            // filters['raridash'].
            if (filterTags && customTags) {
                // Both filterTags and customTags exist
                console.log(
                  miscC('derpibooru:') +
                  ' tags specified by both filter and custom tags'
                );
                tags = filterTags + ',' + customTags;
            } else if (filterTags && (! customTags)) {
                // Only filterTags exist
                console.log(
                  miscC('derpibooru:') +
                  ' tags specified by filter, no custom tags specified'
                );
                tags = filterTags;
            } else if ((! filterTags) && customTags) {
                // Only customTags exist
                console.log(
                  warningC('derpibooru:') +
                  ' no filter tags, custom tags specified'
                );
                tags = customTags;
            } else {
              // If the filter name stated by user doesn’t actually exist. This
              // should only happen if filter is set as an integer (e.g.
              // derpibooru_custom `133664), as if the filter is not an integer
              // and doesn’t exist, filterTags should already have been set to
              // those of the default, above.
              console.log(
                warningC('derpibooru:') +
                ' no filter tags, no custom tags specified'
              );
              tags = '';
            }
        }
        // Use-case #2, e.g. derpibooru rarity
        // Lack of custom filters - just tags
        else {
            filter = 'default';
            tags =
              filters[filter].tags
                ? filters[filter].tags + ',' + args
                : args;
            console.log('else - ' + tags);
        }

        console.log(
          miscC('derpibooru:') +
          ' filter - ' + filter + ', tags - ' + tags
        );

        console.log(
          miscC('derpibooru:') +
          ' arguments used are',
          args
        );
    } else {
        console.log(
          miscC('derpibooru: ') +
          'No arguments passed'
        );

        // Use case #1, e.g. derpibooru
        // Just the command by itself
        filter = 'default';
        tags =
          filters.default.tags ? filters.default.tags : '';
    }

    // Logs warnings in console.log (i.e. terminal)
    function logError(message) {
        console.log(
          errorC('derpibooru:') + ' Error - ' + message
        );
    };

    // HTTPS magic here
    //
    // GET
    // 'https://derpibooru.org/search.json?q='+tags+'&page='+page
    //
    // Sorta based on JSON example on
    // https://nodejs.org/api/http.html#http_http_get_options_callback

    function checkIfTags(tags) {
        // Wildcard * when no tags is because query to Derpibooru
        // cannot be blank (otherwise empty string returned by server)
        console.log(
          miscC('derpibooru:') +
          ' (checkIfTags) escaped tags: ' + qs.escape(tags)
        );
        return (qs.escape(tags) && tags) ? qs.escape(tags) : '*';
    }

    // Checks if filter entry in filters object is used with a
    // Derpibooru filter as well. If so, return the &filter_id param,
    // which is used in the path of the Derpibooru requests.
    function checkIfFilter(f, filter) {
        let include;
        // TODO: Add support for aliasOf
        if (Number.isInteger(parseInt(filter)) && parseInt(filter) > 0) {
            // Check if user is admin
            // TODO: Make this available to mods as well, and make it toggleable
            if (admins.indexOf(authorID) > -1) include = parseInt(filter);
            else {
                // If user does not have permission to use `[custom filter]
                // This part still runs because JS is silly
                //
                // This sets the filter_id to the default, safe filter
                include = 133664;
            }
        }
        // Derpibooru filter numbers (or IDs) must be positive integers
        // Also, someone please tell me how to properly separate this long else
        // if statment into separate lines
        else if (
          f[filter].hasOwnProperty('include') &&
          Number.isInteger(f[filter].include) &&
          f[filter].include > 0
        ) {
            include = parseInt(f[filter].include);
        } else {
            include = 133664;
        }
        return `&filter_id=${include}`;
    }

    console.log(
      miscC('derpibooru:') +
      ' Connecting to Derpibooru using this URL: ' +
      miscC(
        `/search.json?q=${checkIfTags(tags)}&page=1` +
        `${checkIfFilter(filters, filter)}`
      )
    );
    // Options for getTotalReq
    let getTotalNoOptions = {
        hostname: 'derpibooru.org',
        port: '443',
        path: `/search.json?q=${checkIfTags(tags)}&page=1` +
          `${checkIfFilter(filters, filter)}`,
        method: 'GET'
    };

    if (makeRequest) {
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
                        console.log(
                          miscC('derpibooru:') +
                          ' (getTotalNo) total no. of results - ' +
                          response.total
                        );
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
                blehp(somethingWentWrong([
                  'Total no. of search results isn’t a number ' +
                  `(got ${resultsTotal})`
                ]));
            }
            let pagesTotal = Math.ceil(resultsTotal / 15);
            // Search results page to go on (randomised)
            let page = Math.ceil(Math.random() * pagesTotal);

            console.log(
              miscC('derpibooru:') +
              ' (getTotalNo.then) Connecting to Derpibooru using this URL: ' +
              miscC(
                `/search.json?q=${checkIfTags(tags)}&page=${page}` +
                `${checkIfFilter(filters, filter)}`
              )
            );

            let options = {
                hostname: 'derpibooru.org',
                port: '443',
                path: `/search.json?q=${checkIfTags(tags)}&page=${page}` +
                  `${checkIfFilter(filters, filter)}`,
                method: 'GET'
            };

            // The asynchronous request that retrieves an image
            let req = https.get(options, (res) => {
                let error;
                let contentType = res.headers['content-type'];

                // Error: Invalid status code
                if (res.statusCode !== 200) {
                    error = new Error(
                      `Returned HTTP status code ${res.statusCode}`
                    );
                } // Error: Not actually JSON
                else if ( ! /^application\/json/.test(contentType) ) {
                    error = new Error(
                      'This is not JSON. This is not JSON at all.' +
                      ` (received ${res.contentType})`
                    );
                }

                if (error)
                  blehp(somethingWentWrong([ error.message, res ]));

                res.setEncoding('utf8');
                let raw = '';

                res.on('data', (chunk) => raw += chunk);
                res.on('end', () => {
                    try {
                        // Parsed JSON response
                        let response = JSON.parse(raw);
                        // No of results on this page (e.g. in case there’s
                        // only two or three results instead of the default
                        // fifteen on a full page)
                        let pageResultsNo = response.search.length;

                        // Parse retrieved JSON and select one image
                        let pageIndex =
                          Math.floor(Math.random() * pageResultsNo);
                        // Randomly selected image
                        let selection = response.search[pageIndex]
                        // Image URL
                        let image = selection.representations.large;
                        // Image source
                        let source = selection.id;

                        // Message returned
                        let result = '';

                        result += 'https:' + image + ' ' +
                          '(Source: <https://derpibooru.org/' + source +
                          '>)';

                        blehp(result);
                    } catch (e) {
                        logError(e.message);
                        blehp(
                          'Error: Sorry, there was a problem in parsing the ' +
                          'search results! (likely due to no results ' +
                          ':frowning:)'
                        );
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
        }).catch(reason => {
            // Getting total number of search results failed
            blehp(reason);
        }); // getTotalNo.catch()
    } // if (makeRequest)
}

module.exports = {
    usage:
      'Returns a **randomly-selected image from Derpibooru**. This version ' +
      'of the command allows for custom Derpibooru filters and filtering by ' +
      'search queries. Inspired by fourhts’ Cute Horses and based on this ' +
      'bot’s ``derpibooru`` command. (http://wikipedia.sexy/hoers)\n' +
      '\n' +
      '**Usage:**\n' +
      '```' +
      'Random image: dpc\n' +
      'Use a predefined filter (fourths, default, raridash, fourhts) by ' +
      'using a backtick (`): dpc `fourths\n' +
      'Use custom tags (like Derpibooru’s search function): dpc changeling, ' +
      'raripie\n' +
      'Why not both: dpc `fourths artist:raridashdoodles' +
      '```' +
      '\n' +
      '**List of filters:**\n' +
      '`` `rdd``: employs tags cute,-comic,raridash,artist:raridashdoodles\n' +
      '`` `fourths``, `` `fourhts``: uses filter 133664, ' +
      'and employs tags (raridash OR sciset OR taviscratch OR raripie OR ' +
      'appleshy OR hoodies OR twinkie OR rarilight OR thoraxspike) AND cute ' +
      'AND NOT comic\n' +
      '`` `default``: uses filter 133664 (sensible filter, hides unpleasant ' +
      'stuff)\n' +
      'Or alternatively, use a Derpibooru filter in the format `filter, e.g. ' +
      '`` `133664`` for https://derpibooru.org/filters/133664.'
      ,
    aliases: ['dpc'],
    dm: true,
    delete: false,
    cooldown: 5,
    process: (msg, args) => {
        // Based off fourhts’ cute shipping thing at
        // http://wikipedia.sexy/hoers/
        // and also ES6 promises
        // http://stackoverflow.com/a/14220323

        return Promise.resolve({
            message: "Retrieving Derpibooru image…",
            edit_async: new Promise(resolve => {
                let output;
                let a = new Promise(resolve => {
                    bacon(
                      args,
                      (message) => {
                        output = message;
                        console.log(
                          miscC('derpibooru:') +
                          ' resolving promise: ' +
                          message
                        );
                        resolve(output);
                      },
                      msg.author.id
                    );
                });
                // Once a is done, return output
                a.then(() => {
                    console.log(
                      miscC('derpibooru:') +
                      ' returning output of derpibooru'
                    );
                    resolve(output);
                }).catch(e => {
                    console.log(
                      warningC('derpibooru:') +
                      ' unknown error (printed below)'
                    );
                    console.log(e);
                });
            })

        });

    } // process
} // module.exports
