// TODO: add a maximum limit to args length
//
// TODO: Make selecting own filter a toggleable option

'use strict';

const qs = require('querystring')
    , request_require = require('request')
    , admins = require('./../../options/admins.json')
    , utils = require('./../../utils/utils.js')
    , filterDefault = 133664
    , request = request_require.defaults(
        { gzip: true
        , baseUrl: 'https://derpibooru.org/'
        , headers:
            { 'User-Agent': 'Changeling Bot (Discord bot) by Chryssi'
            }
        }
      );


// Hardcode the first parameter (i.e. file from which fileLog was called) to
// avoid repetition
function log(arr) {
    arr.unshift('derpibooru');
    return utils.fileLog(arr);
}

// Escape tags before inserting into HTTPS request URL.
function escapeTags(tags) {
    const functionName = 'escapeTags';
    // Wildcard * when no tags is because query to Derpibooru
    // cannot be blank (otherwise empty string returned by server)
    log(['debug', functionName, `escaped tags: ${qs.escape(tags)}`]);
    return (qs.escape(tags) && tags) ? qs.escape(tags) : '*';
}

function getFilterAndTags(obj) {
    return new Promise((resolve, reject) => {
        const functionName = 'getFilterAndTags';
        var args = obj.args
          , authorId = obj.authorId
          , filterId
          , tags;

        // Set tags that will be used in search
        if (args) {
            // Use-case #1, e.g. ~derpibooru `133664
            // With custom filters

            if (args.charAt(0) === '`') {
                log(
                  [ 'debug'
                  , functionName
                  , 'command - ' + JSON.stringify(args.split(/ (.+)/))
                  ]
                );

                // first word is the name of the filter (e.g. `raridash)
                // the backtick is removed before the first word is
                // assigned to the filterId variable
                filterId = args.split(/ (.+)/)[0].slice(1);

                // second word onwards is list of tags
                tags = args.split(/ (.+)/)[1];

                // filterId_int is the filter ID as an integer
                let filterId_int = parseInt(filterId, 10);
                if (Number.isInteger(filterId_int) &&
                    filterId_int > 0 &&
                    filterId_int < 999999) {
                    // Check if user is admin
                    // TODO: Make this available to mods as well, and make it
                    // toggleable (also see the checkIfFilter function)
                    if (! (admins.indexOf(authorId) > -1)) {
                        reject(
                          { level: 'warn'
                          , log:
                              [ functionName
                              , 'User doesn’t have permission to select own ' +
                                'filter'
                              ]
                          , message:
                                'You do not have permission to select your ' +
                                'own filter (via the ` format).'
                          }
                        );
                    }
                }
                // Filter stated by user is not in valid format
                else {
                    reject(
                      { level: 'info'
                      , log:
                          [ functionName
                          , `Derpibooru filter ${filterId} not in valid format`
                          ]
                      , message:
                          `filter ${filterId} isn’t in a valid format (e.g. ` +
                          `\`\` \`100073\`\` for ` +
                          `<https://derpibooru.org/filters/100073>)`
                      }
                    );
                }
            }
            // Use-case #2, e.g. ~derpibooru rarity
            // Lack of custom filters - just tags
            else {
                filterId = filterDefault;
                tags = args;
                log(
                  [
                    'debug'
                    , functionName
                    , 'no custom filters specified (just tags)'
                  ]
                );
            }

            log(
              [ 'debug'
              , functionName
              , `using filterId ${filterId}; using tags ${tags}`
              ]
            );

            log(
              [ 'debug'
              , functionName
              , `Arguments used are ${args}`
              ]
            );
        } else {
            // No arguments passed
            log(
              [ 'debug'
              , functionName
              , 'No arguments passed'
              ]
            );

            // Use case #1, e.g. derpibooru
            // Just the command by itself
            filterId = filterDefault;
            tags = '';
        }

        resolve({ filterId: filterId, tags: tags });
    });
}

function getResultsTotal(obj) {
    // Get the total number of search results
    return new Promise((resolve, reject) => {
        const functionName = 'getResultsTotal';
        var filterId = obj.filterId
          , tags = obj.tags;

        log(
          [ 'debug'
          , functionName
          , 'Connecting to Derpibooru using this URL (1st time):\n' +
            `/search.json?q=${escapeTags(tags)}&page=1&filter_id=${filterId}`
          ]
        );

        request(
            `/search.json?q=${escapeTags(tags)}&page=1&filter_id=${filterId}`
          , (err, res, body) => {
                if (err) {
                    reject(
                      { log: [functionName, err.message]
                      , message:
                            'Something went wrong in connecting to ' +
                            'Derpibooru to get total number of search results.'
                      }
                    );
                } else {
                    let contentType = res.headers['content-type']
                      , statusCode = res.statusCode;
                    if (statusCode !== 200) {
                        reject(
                          { log:
                              [ functionName
                              , `Returned status code ${statusCode}`
                              ]
                          , message:
                                `Derpibooru returned error code ` +
                                `${statusCode}.`
                          }
                        );
                    } else if (! /^application\/json/.test(contentType)) {
                        // If filter doesn’t exist, Derpibooru will return
                        // status code 302 and redirect to front page.
                        reject(
                          { log:
                              [ functionName
                              , `Invalid content type (expected JSON, ` +
                                `got ${contentType}).`
                              ]
                          , message:
                                `Derpibooru’s API returned something ` +
                                `invalid. Maybe it’s offline or has moved?`
                          }
                        );
                    } else {
                        try {
                            // Parsed JSON response
                            let resParsed = JSON.parse(body);
                            log(
                              [ 'debug'
                              , functionName
                              , `total no. of results - ` +
                                `${resParsed.total}`
                              ]
                            );
                            // No. of results
                            resolve(
                              { total: resParsed.total
                              , filterId: filterId
                              , tags: tags
                              }
                            );
                        } catch (e) {
                            reject(
                              { log: [functionName, e.message]
                              , message:
                                    'Sorry, something went wrong in ' +
                                    'parsing total number of pages!'
                              }
                            );
                        } // try {} catch (e) {}
                    } // else
                } // if (err) {} else {}
            } // (err, res, body) => {}
        ); // request()

    }); // return new Promise(resolve, reject) => {}
}

function fetchImage(obj) {
    return new Promise((resolve, reject) => {
        const functionName = 'fetchImage';
        var resultsTotal = obj.total
          , filterId = obj.filterId
          , tags = obj.tags;
        // Getting total number of search results succeeded
        // (this value stored in resultsTotal)

        // Check if resultsTotal is actually a valid number
        if (resultsTotal < 0 || ( ! Number.isInteger(resultsTotal))) {
            reject(
              { log:
                  [ functionName
                  , `Total no. of search results isn’t a number` +
                    `(got ${resultsTotal})`
                  ]
              , message:
                  'Sorry, Derpibooru returned something weird that I ' +
                  'couldn’t handle. Please let the developer know.'
              }
            );
        } else if (resultsTotal === 0) {
            // Derpibooru didn’t return any results
            reject(
              { level: 'info'
              , log:
                  [ functionName
                  , 'no results were returned by derpibooru'
                  ]
              , message:
                  'Derpibooru didn’t return any results. Check that the ' +
                  'tag(s) you used weren’t blocked by the current filter, ' +
                  'that the tags you used were spelled correctly, and that ' +
                  'there are in fact images that match the tags you were ' +
                  'looking for.'
              }
            );

        }
        let pagesTotal = Math.ceil(resultsTotal / 15);
        // Search results page to go on (randomised)
        let page = Math.ceil(Math.random() * pagesTotal);

        log(
          [ 'debug'
          , functionName
          , 'Connecting to Derpibooru using this URL (2nd time):\n' +
            `/search.json?q=${escapeTags(tags)}&page=${page}` +
            `&filter_id=${filterId}`
          ]
        );

        request(
            `/search.json?q=${escapeTags(tags)}&page=${page}` +
            `&filter_id=${filterId}`
          , (err, res, body) => {
                if (err) {
                    reject(
                      { log: [functionName, err.message]
                      , message:
                            'Something went wrong in connecting to ' +
                            'Derpibooru to get search results.'
                      }
                    );
                } else {
                    let contentType = res.headers['content-type']
                      , statusCode = res.statusCode;
                    if (statusCode !== 200) {
                        reject(
                          { log:
                              [ functionName
                              , `Returned status code ${statusCode}`
                              ]
                          , message:
                                `Derpibooru returned error code ` +
                                `${statusCode}.`
                          }
                        );
                    } else if (! /^application\/json/.test(contentType)) {
                        // If filter doesn’t exist, Derpibooru will return
                        // status code 302 and redirect to front page.
                        reject(
                          { log:
                              [ functionName
                              , `Invalid content type (expected JSON, ` +
                                `got ${contentType}).`
                              ]
                          , message:
                                `Derpibooru’s API returned something ` +
                                `invalid. Maybe it’s offline or has moved?`
                          }
                        );
                    } else {
                        try {
                            // Parsed JSON response
                            let resParsed = JSON.parse(body);

                            // No of results on this page (e.g. in case there’s
                            // only two or three results instead of the default
                            // fifteen on a full page)
                            let pageResultsNo = resParsed.search.length;

                            // Parse retrieved JSON and select one image
                            let pageIndex =
                              Math.floor(Math.random() * pageResultsNo);
                            // Randomly selected image
                            let image = resParsed.search[pageIndex];
                            // Image URL
                            let imageUrl = image.representations.large;
                            // Image source
                            let imageSource = image.id;

                            let description = '';
                            let filterUsed =
                                parseInt(filterId, 10);
                            if (filterUsed !== filterDefault)
                                description += `**Filter ID:** ${filterUsed}`;
                            if (tags !== '') {
                                if (description !== '') description += '\n';
                                if (tags.length <= 120) {
                                    description += `**Tags:** ${tags}`;
                                } else {
                                    description +=
                                        `**Tags:** *(too long to list)*`;
                                }
                            }

                            // Message (or rather, embed) returned
                            //
                            // color is in format 0xFFFFFF, i.e. any integer
                            //     from 0 to 2**24.
                            // In this case, set a random colour by doing this:
                            //    1 << 24 shifts the 1 24 positions to the
                            //    left, giving what is equal to 2**24
                            //    Math.random() - turns into random number from
                            //        zero to 2**24, of course
                            //    | 0 - bitwise OR operator (for integers). In
                            //        this case, this takes advantage of the
                            //        fact that bitwise operators remove
                            //        anything after decimal point
                            //    Output is a random integer from 0 to 2**24.
                            let result =
                              { embed:
                                  { title: 'Derpibooru page →'
                                  , url: 'https://derpibooru.org/' +
                                    imageSource
                                  , description: description
                                  , color: ((1 << 24) * Math.random() | 0)
                                  , image:
                                      { url: 'https:' + imageUrl
                                      }
                                  }
                              };

                            resolve(result);

                        } catch (e) {
                            reject(
                              { log: [functionName, e.message]
                              , message:
                                  'Changeling Bot couldn’t read what ' +
                                  'Derpibooru returned.'
                              }
                            );
                        }
                    } // else
                } // if (err) {} else {}
            } // (err, res, body) => {}
        ); // request()
    }); // return new Promise((resolve, reject) => {}
}

module.exports = {
    usage:
`Returns an image from **Derpibooru**, filtered by **tags**. If \
there is more than one result, the image returned will be randomly selected. \
Note that this command uses a custom filter that doesn’t show images that \
aren’t art and/or aren’t safe for work. You can see a list of the tags \
blocked here: <https://derpibooru.org/filters/133664>

Inspired by fourhts’ Cute Horses. (http://wikipedia.sexy/hoers)

**Usage:**
Return any image, randomly selected, from Derpibooru.
\`\`[command prefix]derpibooru\`\`

Return random image, filtering by a search query. This works in the same \
format as you would in Derpibooru’s search box. In this case, this is \
equivalent to searching \`changeling OR raripie\` on Derpibooru and selecting \
one of the results at random.
\`\`[guild prefix]derpibooru changeling OR raripie\`\``
  , aliases: ['dp', 'dpc']
  , dm: true
  , delete: false
  , cooldown: 10
  , process: obj => {
        var msg = obj.msg,
            args = obj.args;
        // Based off fourhts’ cute shipping thing at
        // http://wikipedia.sexy/hoers/
        // and also ES6 promises
        // http://stackoverflow.com/a/14220323

        return Promise.resolve({
            message: "Retrieving Derpibooru image…",
            edit: new Promise(resolve => {
                getFilterAndTags({ args: args, authorId: msg.author.id }).then(
                    obj => getResultsTotal(obj)
                ).then(
                    obj => fetchImage(obj)
                ).then(message => {
                    log(
                      [ 'debug'
                      , 'then'
                      , 'returning output: ' +
                        JSON.stringify(message)
                      ]
                    );
                    resolve(message);
                }).catch(err => {
                    // If catch() caught an Error object, return error.message
                    if (err instanceof Error) {
                        log(['error', 'catch', err.message, err.stack]);
                        resolve('**Error:** ' + err.message);
                    }
                    // If error was the result of a promise reject()
                    else if (typeof err === 'object') {
                        // If err in reject(err) was an object:
                        //     err.level:   requested logging level (e.g.
                        //                  ‘debug’) – default is ‘error’
                        //     err.log[0]:  Function from which this
                        //                  function was called
                        //     err.log[1]:  Log message
                        //     err.message: Message to return to user running
                        //                  Discord command
                        //     err.request: request callback, for stopping the
                        //                  HTTPS request
                        let levels = utils.loggingLevelsNames;
                        if (levels.hasOwnProperty(err.level))
                            log([err.level, err.log[0], err.log[1]]);
                        else
                            log(['error', err.log[0], err.log[1]]);

                        var resolveMessage = '**Error:**\n' + err.message;
                        resolve(resolveMessage);
                    }
                    else if (typeof err === 'string') resolve(err);
                    else {
                        // This really shouldn’t happen
                        log(
                          [ 'error'
                          , 'catch'
                          , `Error in unexpected format (${typeof err})`
                          , err
                          ]
                        );
                        resolve(
                            '**Error:** Something really weird happened. ' +
                            'This is a bug in the command; please let the ' +
                            'developer know.'
                        );
                    }
                }); // catch(err => {}
            }) // edit_async: new Promise({})
        });

    } // process
}; // module.exports
