// Made by Chryssi
// 22 Nov 2016 -- 13 Dec 2016
//
// TODO: add a maximum limit to args length
//
// TODO: Make selecting own filter a toggleable option
//
// TODO: Move database to PostgreSQL and put filters in there
//
// TODO: Make reject() (i.e. log()) function names more sensible

'use strict';

const https = require('https'),
      qs = require('querystring'),
      admins = require('./../../options/admins.json'),
      options = require('./../../options/options.json');

function log(arr) {
    // arr[0]: 'misc', 'warn', or 'error' (colour of text)
    // arr[1]: The function from which log was originally called
    // arr[2]: Log message
    var a, b, c;

    if (arr[0] === 'misc')
        a = miscC('derpibooru:'); // Debug messages
    else if (arr[0] === 'warn')
        a = warningC('derpibooru:'); // Warnings
    else if (arr[0] === 'error')
        a = errorC('derpibooru:'); // Errors
    else {
        console.log(
            warningC('derpibooru:') +
            ' (log) - invalid first argument in line marked *'
        );
        a = warningC('*derpibooru:');
    }

    b = arr[1] ? `(${arr[1]}) ` : '';
    c = arr[2] ? arr[2] : '';

    // If verbose_logging is set to false or is undefined, don't print
    // info/debug messages
    if (a && (options.verbose_logging || arr[0] !== 'misc'))
        console.log(`${a} - ${b}${c}`);
}

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
// text only, youtube caption, youtube, rule 34
//
// `rdd`, `fourhts`, and `fourths` is for fourhts. You’re welcome.
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
};

// Escape tags before inserting into HTTPS request URL.
function escapeTags(tags) {
    // Wildcard * when no tags is because query to Derpibooru
    // cannot be blank (otherwise empty string returned by server)
    log(['misc', 'escapeTags', `escaped tags: ${qs.escape(tags)}`]);
    return (qs.escape(tags) && tags) ? qs.escape(tags) : '*';
}

// Checks if filter entry in filters object is used with a
// Derpibooru filter as well. If so, return the &filter_id param,
// which is used in the path of the Derpibooru requests.
function checkIfFilter(f, filter, authorID) {
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

// Main function
function bacon(args, blehp, authorID) {

    var getFilterAndTags = new Promise((resolve, reject) => {

        var filter, tags;

        // Set tags that will be used in search
        if (args) {
            // Use-case #1, e.g. derpibooru `fourths or derpibooru `133664
            // With custom filters

            if (args.charAt(0) === '`') {
                let filterTags;
                log(['misc', 'command - ', JSON.stringify(args.split(/ (.+)/))]);

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
                        reject({
                            log: [
                                '',
                                'User doesn’t have permission to select own ' +
                                'filter'
                            ],
                            message:
                                'You do not have permission to select your ' +
                                'own filter (via the ` format).'
                        });
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
                        // Also prevent recursion (i is max number of times to
                        // run)
                        //
                        // This is the maximum level you can nest aliases (3):
                        // a { aliasOf: 'b' },
                        // b { aliasOf: 'c' },
                        // c { aliasOf: 'd' },
                        // d { tags: 'cute,-comic,raridash' }

                        function checkIfFilterTags() {
                            // Check if filter has tags
                            if (
                              filters.hasOwnProperty(filter) &&
                              filters[filter].hasOwnProperty('tags')
                            ) {
                                return filters[filter].tags;
                            } else {
                                reject({
                                    log: [
                                        'checkIfFilterTags',
                                        `filter ${filter} doesn’t exist!`
                                    ],
                                    message: `Filter ${filter} doesn’t exist!`
                                });
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
                                reject({
                                    log: [
                                        'blohp',
                                        'filter aliases in filters database' +
                                        'nested too deep!'
                                    ],
                                    message:
                                        'There’s something wrong with the ' +
                                        'custom filter database. This is a ' +
                                        'problem with the command; please ' +
                                        'let the developer know.'
                                });
                            }
                        } else {
                            return [filter, checkIfFilterTags()];
                        }
                    }
                    [filter, filterTags] = blohp(filter, 0);
                }
                // Filter stated by user does not actually exist in the
                // filters object
                else {
                    // Return error
                    reject({
                        log: [
                            'getFilterAndTags',
                            `filter ${filter} doesn’t exist!`
                        ],
                        message: `filter ${filter} doesn’t exist!`
                    });
                }
                log(['misc', 'filterTags', filterTags]);

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
                    log([
                        'misc',
                        '',
                        'tags specified by both filter and custom tags'
                    ]);
                    tags = filterTags + ' ' + customTags;
                } else if (filterTags && (! customTags)) {
                    // Only filterTags exist
                    log([
                        'misc',
                        '',
                        'tags specified by filter; no custom tags specified'
                    ]);
                    tags = filterTags;
                } else if ((! filterTags) && customTags) {
                    // Only customTags exist
                    log([
                        'warn',
                        '',
                        'no filter tags; custom tags specified'
                    ]);
                    tags = customTags;
                } else {
                    // If the filter name stated by user doesn’t actually exist.
                    // This should only happen if filter is set as an integer
                    // (e.g. derpibooru_custom `133664), as if the filter is not
                    // an integer and doesn’t exist, filterTags should already
                    // have been set to those of the default, above.
                    log([
                        'warn',
                        '',
                        'no filter tags; no custom tags specified'
                    ]);
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
                log(['misc', '', 'no custom filters specified (just tags)']);
            }

            log(['misc', '', `using filter ${filter}; using tags ${tags}`]);
            log(['misc', '', `Arguments used are ${args}`]);
        } else {
            log(['misc', 'derpibooru', 'No arguments passed']);

            // Use case #1, e.g. derpibooru
            // Just the command by itself
            filter = 'default';
            tags =
              filters.default.tags ? filters.default.tags : '';
        }

        resolve({ filter: filter, tags: tags });

    });

    getFilterAndTags.then(function (obj) {
        var filter = obj.filter,
            tags = obj.tags;
        // Get the total number of search results
        return new Promise((resolve, reject) => {

            log([
                'misc',
                '',
                'Connecting to Derpibooru using this URL (1st time):\n' +
                `/search.json?q=${escapeTags(tags)}&page=1` +
                `${checkIfFilter(filters, filter, authorID)}`
            ]);

            // HTTPS requests from here on in
            //
            // GET
            // 'https://derpibooru.org/search.json?q='+tags+'&page='+page
            //
            // Sorta based on JSON example on
            // https://nodejs.org/api/http.html#http_http_get_options_callback

            // Options for getTotalNo
            let getTotalNoOptions = {
                hostname: 'derpibooru.org',
                port: '443',
                path: `/search.json?q=${escapeTags(tags)}&page=1` +
                  `${checkIfFilter(filters, filter, authorID)}`,
                method: 'GET'
            };

            // The actual GET request that retrieves search results
            // (paginated with 15 images per page)
            let getTotalReq = https.get(getTotalNoOptions, (res) => {
                let contentType = res.headers['content-type'];

                // Error: Invalid status code
                if (res.statusCode !== 200) {
                    reject({
                        log: [
                            'getTotalNo',
                            `Returned HTTP status code ${res.statusCode}`
                        ],
                        message:
                            `Derpibooru returned error code ${res.statusCode}.`,
                        request: res
                    });
                }
                // Error: Not actually JSON
                else if (! /^application\/json/.test(contentType) ) {
                    reject({
                        log: [
                            'getTotalNo',
                            'Derpibooru did not return JSON. ' +
                            `(received ${res.contentType}`
                        ],
                        message:
                            'Derpibooru’s API didn’t return JSON. ' +
                            'Perhaps the API is offline or has moved? ' +
                            'Please let Chryssi know.',
                        request: res
                    });
                }

                res.setEncoding('utf8');
                let raw = '';

                res.on('data', (chunk) => raw += chunk);
                res.on('end', () => {
                    try {
                        // Parsed JSON response
                        let response = JSON.parse(raw);
                        log([
                            'misc',
                            'getTotalNo',
                            `total no. of results - ${response.total}`
                        ]);
                        // No. of results
                        resolve({
                            total: response.total,
                            filter: filter,
                            tags: tags
                        });
                    } catch (e) {
                        reject({
                            log: ['getTotalNo', e.message],
                            message: 'Sorry, something went wrong in parsing' +
                              'total number of pages!'
                        });
                    }
                });

                res.on('error', e => {
                    reject({
                        log: ['getTotalNo', e.message],
                        message: 'Sorry, something went wrong in getting' +
                          'total number of pages!'
                    });
                });

                res.on('socket', function (socket) {
                    res.on('timeout', e => {
                        reject({
                            log: ['getTotalNo', e.message],
                            message: 'Sorry, something went wrong with ' +
                              'connecting to Derpibooru. Please let Chryssi ' +
                              'know.'
                        });
                        res.abort();
                    });
                });

            }); // letTotalReq
        }); // return new Promise()

    }).then(function (obj) {
        return new Promise((resolve, reject) => {
            var resultsTotal = obj.total,
                filter = obj.filter,
                tags = obj.tags;
            // Getting total number of search results succeeded
            // (this value stored in resultsTotal)

            // Check if resultsTotal is actually a valid number
            if (resultsTotal < 0 || ( ! Number.isInteger(resultsTotal))) {
                reject({
                    log: [
                        'getTotalNo.then',
                        'Total no. of search results isn’t a number' +
                        `(got ${resultsTotal})`
                    ],
                    message: 'Sorry, Derpibooru returned something weird that' +
                      'I couldn’t handle. Please let Chryssi know.'
                });
            }
            let pagesTotal = Math.ceil(resultsTotal / 15);
            // Search results page to go on (randomised)
            let page = Math.ceil(Math.random() * pagesTotal);

            log([
                'misc',
                'getTotalNo.then',
                'Connecting to Derpibooru using this URL (2nd time):\n' +
                `/search.json?q=${escapeTags(tags)}&page=${page}` +
                `${checkIfFilter(filters, filter, authorID)}`
            ]);

            let options = {
                hostname: 'derpibooru.org',
                port: '443',
                path: `/search.json?q=${escapeTags(tags)}&page=${page}` +
                  `${checkIfFilter(filters, filter, authorID)}`,
                method: 'GET'
            };

            // The asynchronous request that retrieves an image
            let req = https.get(options, (res) => {
                let error;
                let contentType = res.headers['content-type'];

                // Error: Invalid status code
                if (res.statusCode !== 200) {
                    reject({
                        log: [
                            'https.get',
                            `Returned HTTP status code ${res.statusCode}`
                        ],
                        message:
                            `Can’t access Derpibooru API`,
                        request: res
                    });
                } // Error: Not actually JSON
                else if ( ! /^application\/json/.test(contentType) ) {
                    reject({
                        log: [
                            'https.get',
                            `Received ${res.contentType} instead of JSON.`
                        ],
                        message: `Derpibooru returned something weird.`,
                        request: res
                    });
                }

                res.setEncoding('utf8');
                let raw = '';

                res.on('data', chunk => raw += chunk);
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
                        let selection = response.search[pageIndex];
                        // Image URL
                        let image = selection.representations.large;
                        // Image source
                        let source = selection.id;

                        // Message (or rather, embed) returned
                        //
                        // color is in format 0xFFFFFF, i.e. any integer from
                        //     0 to 2**24.
                        // In this case, set a random colour by doing this:
                        //    1 << 24 shifts the 1 24 positions to the left,
                        //        giving what is equal to 2**24
                        //    Math.random() - turns into random number from
                        //        zero to 2**24, of course
                        //    | 0 - bitwise OR operator (for integers). In
                        //        this case, this takes advantage of the
                        //        fact that bitwise operators remove
                        //        anything after decimal point
                        //    Output is a random integer from 0 to 2**24.
                        let result = {
                            embed: {
                                title: 'Derpibooru page →',
                                url: 'https://derpibooru.org/' + source,
                                description:
                                    tags === ''
                                        ? ''
                                        : tags.length <= 120
                                            ? `**Tags:** ${tags}`
                                            : '**Tags:** *(too long to list)*'
                                        ,
                                color: ((1 << 24) * Math.random() | 0),
                                image: {
                                    url: 'https:' + image
                                }
                            }
                        };

                        resolve(result);
                    } catch (e) {
                        // The most common reason this will happen is when there
                        // are no results (thus JSON cannot be parsed).
                        reject({
                            log: ['getTotalNo.then', e.message],
                            message: 'Derpibooru didn’t return any results.',
                        });
                    }
                }); // res.on('end' ... )

                res.on('error', e => {
                    reject({
                        log: ['getTotalNo.then', e.message],
                        message: 'Derpibooru returned an error.'
                    });
                });

                res.on('socket', function (socket) {
                    res.on('timeout', e => {
                        reject({
                            log: ['getTotalNo.then', e.message],
                            message: 'Connecting to Derpibooru timed out.'
                        });
                        res.abort();
                    });
                });

            }); // let req = https.get
        });
    }).then(function (message) {
        // Success! Return message (or in this case, embed)
        blehp(message);
    }).catch(err => {
        // If catch() caught an Error object, return error.message
        if (err instanceof Error) blehp('Error: ' + reason.message);
        // If error was the result of a promise reject()
        else if (typeof err === 'object') {
            // err.log[0]: Function from which this function was called
            // err.log[1]: Log message
            // err.message: Message to return to user running Discord command
            // err.request: request callback, for stopping the HTTPS request
            log(['error', err.log[0], err.log[1]]);

            // Nom on the response data to free up memory
            if (err.request !== undefined) err.request.resume();
            var resolveMessage = 'Error:\n' + err.message;
            // blehp() is the equivalent of the resolve() function in promises
            // i.e. blehp() is what helps output resolveMessage to Discord
            blehp(resolveMessage);
        }
        else if (typeof err === 'string') blehp(reason);
        else {
            // This really shouldn’t happen
            console.log(errorC('derpibooru:'), err);
            blehp(
                'Some weird error occurred. This is a bug in the command; ' +
                'Please let the developer know.'
            );
        }
    }); // getTotalNo.catch()

}

module.exports = {
    usage:
`Returns a **randomly-selected image from Derpibooru**. This version of the \
command allows for custom Derpibooru filters and filtering by search queries. \
Inspired by fourhts’ Cute Horses. (http://wikipedia.sexy/hoers)

Note that this command uses a filter to not show anything that isn’t art \
and/or isn’t SFW. You can see a list of the tags blocked here: \
<https://derpibooru.org/filters/133664>

**Usage:**
\`\`\`markdown
# Return random image from Derpibooru
~dp
# Use a predefined filter (fourths, raridash, fourhts) by using a backtick \
(\`):
~dp \`fourths
# Return random image with the following tags (in the same format as you \
would in Derpibooru’s search box):
~dp changeling OR raripie
# Why not both
~dp \`fourths AND artist:raridashdoodles
## which is equivalent to (notice the space)
~dp \`fourths , artist:raridashdoodles
# Search for images that match the tags in the fourths filter OR (changeling \
and cute)
~dp \`fourths OR (changeling, cute)
\`\`\`

**List of filters:**
\`\`\`markdown
# \`rdd
employs tags \`cute, -comic, raridash, \
artist:raridashdoodles\`
# \`fourths, \`fourhts
employs tags \`(raridash OR sciset OR taviscratch OR \
raripie OR appleshy OR hoodies OR twinkie OR rarilight OR thoraxspike) AND \
cute AND NOT comic\`

Or alternatively, use a Derpibooru filter in the format \`filter, e.g. \
\`133664 for the filter at https://derpibooru.org/filters/133664. This is
admin-only \
at the moment.
\`\`\``
        ,
    aliases: ['dp', 'dpc'],
    dm: true,
    delete: false,
    cooldown: 10,
    process: obj => {
        var msg = obj.msg,
            args = obj.args;
        // Based off fourhts’ cute shipping thing at
        // http://wikipedia.sexy/hoers/
        // and also ES6 promises
        // http://stackoverflow.com/a/14220323

        return Promise.resolve({
            message: "Retrieving Derpibooru image…",
            edit: new Promise(resolve => {
                let output;
                let a = new Promise(resolve => {
                    bacon(
                        args,
                        (message) => {
                            output = message;
                            log([
                                'misc',
                                '',
                                'resolving message: ' + JSON.stringify(message)
                            ]);
                            resolve(output);
                        },
                        msg.author.id
                    );
                }).then(message => {
                    log([
                        'misc',
                        '',
                        'returning output of derpibooru: ' +
                        JSON.stringify(message)
                    ]);
                    resolve(message);
                }).catch(e => {
                    log([
                        'error',
                        '',
                        'unknown error (printed below)'
                    ]);
                    console.log(e);
                });
            }) // edit_async: new Promise({})
        });

    } // process
} // module.exports
