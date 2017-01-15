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
//
// TODO: request -> cachedrequest
//       Add some sort of caching function for the default filter (133664)
//
// TODO: Support duplicates
//       e.g. https://derpibooru.org/341492.json

'use strict';

const admins = require('./../../options/admins.json')
    , utils = require('./../../utils/utils.js')
    , filterDefault = 133664
    , request_require = require('request')
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
    arr.unshift('derpibooru_id');
    return utils.fileLog(arr);
}

function getFilterAndId(obj) {
    return new Promise((resolve, reject) => {
        var args = obj.args
          , authorId = obj.authorId
          , filterId
          , imageId;

        // Set filter ID and image ID that will be used in image retrieval
        if (args) {
            // Use-case #1, e.g. ~derpibooru_id `133664
            // With custom filters

            if (args.charAt(0) === '`') {
                log(['debug', 'command - ', JSON.stringify(args.split(/ (.+)/))]);

                // first word is the the Derpibooru filter ID (e.g. `133664)
                // the backtick is removed before the first word is
                // assigned to the filter variable
                filterId = args.split(/ (.+)/)[0].slice(1);

                // second word onwards is the image ID to retrieve
                imageId = args.split(/ (.+)/)[1];

                // Check if the filter ID is valid (i.e. positive integer)
                // filter_int is the image ID as an integer
                let filter_int = parseInt(filterId, 10);
                if (! isNaN(filter_int) &&
                    filter_int > 0 &&
                    filter_int < 999999) {
                    // Check if user is admin
                    // TODO: Make this available to mods as well, and make it
                    // toggleable
                    if (! (admins.indexOf(authorId) > -1)) {
                        reject(
                            { log:
                                [ ''
                                , 'User doesn’t have permission to select ' +
                                  'own filter'
                                ]
                            , message:
                                'You do not have permission to select your ' +
                                'own filter (via the ` format).'
                            }
                        );
                    } else {
                        log(['debug', '', `using filter ID ${filterId}`]);
                    }
                }
                // Filter ID is not valid, so return error to user
                else {
                    reject(
                        { log:
                            [ 'getFilterAndId'
                            , `Derpibooru filter ${filterId} not in valid ` +
                              `format`
                            ]
                        , message:
                            `filter ${filterId} isn’t in a valid format ` +
                            `(e.g. \`\` \`100073\`\` for ` +
                            `<https://derpibooru.org/filters/100073>)`
                        }
                    );
                }
            }
            // Use-case #2, e.g. ~derpibooru_id 1063514
            // Lack of filters - just the image ID
            else {
                filterId = filterDefault;
                imageId = args;
                log(['info', '', 'no filter ID specified']);
            }

            // Check if image ID is valid
            // id_int is the image ID as an integer
            let id_int = parseInt(imageId, 10);
            // Number.isNaN isn’t used instead of Number.isInteger because the
            // former assumes that parseInt(id, 10) returns either a valid
            // integer or NaN. If parseInt returns undefined, Number.isNaN will
            // return false, which is the opposite of what we want here.
            if (! Number.isInteger(id_int) || id_int < 0 || id_int > 9999999) {
                reject(
                    { log:
                        [ `getFilterAndId`
                        , `Image ID ${imageId} not in valid format`
                        ]
                    , message:
                        `Image ID ${imageId} isn’t in a valid format (e.g. ` +
                        `508531 for <https://derpibooru.org/508531>).`
                    }
                );
            }

            log(
              [ 'debug'
              , ''
              , `using filter ${filterId}; using image id ${imageId}`
              ]
            );
            log(['debug', '', `Arguments used are ${args}`]);
        } else {
            reject(
                { log:
                    [ 'getFilterAndId'
                    , 'No arguments passed'
                    ]
                , message: `You need to type in the image ID, silly!`
                }
            );
        }

        resolve({ filterId: filterId, imageId: imageId });
    });
}


function fetchFilter(obj) {
    // Fetches filter from Derpibooru.
    // obj = { filterId, imageId }
    // where filterId is the filter ID to retrieve in this function
    //       imageId is the image ID to retrieve (in the fetchImage function)
    return new Promise((resolve, reject) => {
        var filterName
          , filterTags
          , filterId = obj.filterId
          , imageId = obj.imageId
          , functionName = 'fetchFilter';
        request(
            `/filters/${filterId}.json`
          , (err, res, body) => {
                if (err) {
                    reject(
                      { log: [functionName, err.message]
                      , message: 'Derpibooru returned an error.'
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
                          , message: 'Derpibooru returned an error.'
                          }
                        );
                    } else if (! /^application\/json/.test(contentType)) {
                        // If filter doesn’t exist, Derpibooru will return
                        // status code 302 and redirect to front page.
                        reject(
                          { log:
                              [ functionName
                              , `Invalid content type (expected JSON, ` +
                                `got ${contentType}). This is likely ` +
                                `because filter ${filterId} cannot be ` +
                                `accessed.`
                              ]
                          , message:
                                `Retrieving the Derpibooru filter ` +
                                `failed. Are you sure that the filter ` +
                                `at https://derpibooru.org/filter/` +
                                `${filterId} exists and is a public ` +
                                `filter?`
                          }
                        );
                    } else {
                        try {
                            let res_parsed = JSON.parse(body);

                            // Name of Derpibooru filter
                            filterName = res_parsed.name;

                            // Tags that filter hides. This will be
                            // compared to the tags of the image requested
                            // by user.
                            filterTags = res_parsed.hidden_tags.split(', ');

                            resolve(
                              { filterId: filterId
                              , filterName: filterName
                              , filterTags: filterTags
                              , imageId: imageId
                              }
                            );
                        } catch (e) {
                            reject(
                              { log: [functionName, e.message]
                              , message:
                                    'Changeling Bot couldn’t read what ' +
                                    'Derpibooru returned.'
                              }
                            );
                        } // try {} catch (e) {}
                    } // else
                } // if (err) {} else {}
            } // (err, res, body) => { }
        ); // request()
    }); // return new Promise((resolve, reject) => { }
}

function fetchImage(obj) {
    // Fetches image from Derpibooru.
    // obj = { filterId, filterName, filterTags, imageId }
    // where filterId is the filter ID to retrieve in this function
    //       filterName is the name of the filter
    //       filterTags is the tags hidden in the filter
    //       imageId is the image ID to retrieve (in the fetchImage function)
    //       recurse (default: true) is whether to repeat this function
    return new Promise((resolve, reject) => {
        var filterId = obj.filterId
          , filterName = obj.filterName
          , filterTags = obj.filterTags
          , imageId = obj.imageId
          , recurse = obj.recurse
          , functionName = 'fetchImage';

        log(
            [ 'debug'
            , functionName
            , `Connecting to Derpibooru using this URL: /${imageId}.json`
            ]
        );

        // The request that retrieves an image
        request(
            `/${imageId}.json`
          , (err, res, body) => {
                let contentType = res.headers['content-type']
                  , statusCode = res.statusCode;
                if (err) {
                    reject(
                      { log: [functionName, e.message]
                      , message:
                            `There was an error in retrieving the image.`
                      }
                    );
                } else if (statusCode === 404) {
                    reject(
                      { log:
                        [ functionName
                        , 'Returned 404 error'
                        ]
                      , message:
                            `Image at https://derpibooru.org/${imageId} ` +
                            `doesn’t exist.`
                      }
                    );
                } else if (statusCode !== 200) {
                    reject(
                      { log:
                          [ functionName
                          , `Returned status code ${statusCode}`
                          ]
                      , message:
                            'Retrieving image failed because Derpibooru ' +
                            'returned something weird.'
                      }
                    );
                } else if (! /^application\/json/.test(contentType)) {
                    reject(
                      { log:
                          [ functionName
                          , `Received ${res.contentType} instead of JSON.`
                          ]
                      , message:
                            'Retrieving image failed because Derpibooru ' +
                            'returned something weird.'
                      }
                    );

                } else {
                    try {
                        let imageParsed = JSON.parse(body);
                        // Checks if duplicate_of is an integer (used with
                        // isNaN())
                        let duplicateOf_int =
                            parseInt(imageParsed.duplicate_of, 10);
                        // If this image is a duplicate of another, fetch that
                        // instead (after checking if duplicate_of is a valid
                        // derpibooru ID)
                        if (! isNaN(duplicateOf_int) &&
                            duplicateOf_int > 0 &&
                            duplicateOf_int < 9999999 &&
                            recurse !== false ) {
                            log(
                              [ 'info'
                              , functionName
                              , `Image ${imageId} is duplicate of ` +
                                `${duplicateOf_int}, going another layer in.`
                              ]
                            );
                            resolve(
                                fetchImage(
                                  { filterId: filterId
                                  , filterName: filterName
                                  , filterTags: filterTags
                                  , imageId: duplicateOf_int
                                  , recurse: false
                                  }
                                )
                            );
                        } else {
                            resolve(
                              { filterId: filterId
                              , filterName: filterName
                              , filterTags: filterTags
                              , imageId: imageId
                              , imageParsed: imageParsed
                              }
                            );
                        }
                    } catch (e) {
                        reject(
                          { log: [functionName, e.message]
                          , message:
                                'Changeling Bot can’t read what ' +
                                'Derpibooru returned.'
                          }
                        );
                    }
                } // else
            } // (err, res, body) => { }
        ); // request()
    }); // return new Promise((resolve, reject) => { }
}

function parseImage(obj) {
    // Parses image from Derpibooru and turns it into returnable result.
    // obj = { filterId, filterName, filterTags, imageId, imageParsed }
    // where filterId is the filter ID to retrieve in this function
    //       filterName is the name of the filter
    //       filterTags is the tags hidden in the filter
    //       imageId is the image ID to retrieve (in the fetchImage function)
    //       imageParsed is the JSON output of the image ID, parsed.
    return new Promise((resolve, reject) => {
        var filterId = obj.filterId
          , filterName = obj.filterName
          , filterTags = obj.filterTags
          , imageId = obj.imageId
          , imageParsed = obj.imageParsed
          , functionName = 'parseImage';
        try {
            // Image URL
            let imageUrl = imageParsed.representations.large;
            // Image source
            let imageSource = imageParsed.id;
            // Image tags
            let imageTags = imageParsed.tags;

            // Find intersection of filterTags and imageTags,
            // i.e. the tags of the filter and the tags of the
            // image to retrieve.
            let tagsIntersection = filterTags.filter(
                tag => imageTags.includes(tag)
            );

            let imageDescription =
                filterId === filterDefault
                    ? ''
                    : `**Filter used:** ${filterId} ` +
                      `- ${filterName}`;

            // Message (or rather, embed) returned
            //
            // color is in format 0xFFFFFF, i.e. any integer
            // from 0 to 2**24.
            //
            // In this case, set a random colour by doing this:
            //    1 << 24 shifts the 1 24 positions to the
            //        left, giving what is equal to 2**24
            //    Math.random() - turns into random number from
            //        zero to 2**24, of course
            //    | 0 - bitwise OR operator (for integers). In
            //        this case, this takes advantage of the
            //        fact that bitwise operators remove
            //        anything after decimal point
            //    Output is a random integer from 0 to 2**24.
            let result = {
                embed:
                  { title: 'Derpibooru page →'
                  , url: 'https://derpibooru.org/' +
                         imageSource
                  , description: imageDescription
                  , color: ((1 << 24) * Math.random() | 0)
                  , image: { url: 'https:' + imageUrl }
                  }
            };
            if (tagsIntersection.length === 0) {
                // If filter tags and image tags do not have
                // any elements in common, i.e. image does not
                // contain any tags blocked by filter, resolve
                resolve(result);
            } else {
                // Image contains hidden tags—tell user this
                // and fail
                reject(
                  { log:
                      [ functionName
                      , `Image ${imageId} contains tags ` +
                        `blocked by filter ${filterId}.`
                      ]
                  , message:
                      `Image at ` +
                      `<https://derpibooru.org/${imageId}> ` +
                      `contains tags blocked by the current ` +
                      `filter. ` +
                      `(blocking ` +
                      `**${tagsIntersection.join(', ')}**)`
                  }
                );
            }
        } catch (e) {
            reject(
              { log: [functionName, e.message]
              , message:
                    'Changeling Bot can’t read what ' +
                    'Derpibooru returned.'
              }
            );
        }
    });
}



// This filter is used by default:
// https://derpibooru.org/filters/133664
//
// or below - hides the below filters:
// 1000 hours in ms paint, aryan pony, background pony strikes again,
// barely pony related, base, blood, content-aware scale, deviantart stamp,
// diamond dog, disembodied hands, drama, explicit, explicit source,
// exploitable meme, fat, fluffy pony, fluffy pony grimdark, foalcon,
// forced meme, g1 to g3.5, greentext, grimdark, grotesque, header,
// image macro, impossibly large ass, impossibly large everything, inflation,
// luftwaffe, male pregnancy, morbidly obese, nazi, nostril flare,
// not pony related, obese, obligatory pony, oc:anon, oc:aryanne,
// oc:kyrie, op is a duck, pony creator, pregnant, questionable, rule 34,
// seizure warning, semi-grimdark, suggestive, text only, youtube,
// youtube caption

// Main function
function bacon(args, blehp, authorId) {
    getFilterAndId({ args: args, authorId: authorId }).then(
        obj => fetchFilter(obj)
    ).then(
        obj => fetchImage(obj)
    ).then(
        obj => parseImage(obj)
    ).then(function (message) {
        // Success! Return message (or in this case, embed)
        blehp(message);
    }).catch(err => {
        // If catch() caught an Error object, return error.message
        if (err instanceof Error) blehp('**Error:** ' + err.message);
        // If error was the result of a promise reject()
        else if (typeof err === 'object') {
            // If err in reject(err) was an object:
            //     err.log[0]:  Function from which this function was called
            //     err.log[1]:  Log message
            //     err.message: Message to return to user running Discord
            //                  command
            //     err.request: request callback, for stopping the HTTPS
            //                  request
            log(['error', err.log[0], err.log[1]]);

            // Nom on the response data to free up memory
            if (err.request !== undefined) err.request.resume();
            var resolveMessage = '**Error:**\n' + err.message;
            // blehp() is the equivalent of the resolve() function in promises
            // i.e. blehp() is what helps output resolveMessage to Discord
            blehp(resolveMessage);
        }
        else if (typeof err === 'string') blehp(err);
        else {
            // This really shouldn’t happen
            console.log(errorC('derpibooru:'), err);
            log(
              [ 'error'
              , 'catch'
              , `Error in unexpected format (${typeof err})`
              , err
              ]
            );
            blehp(
                '**Error:** Something really weird happened. This is a bug ' +
                'in the command; please let the developer know.'
            );
        }
    }); // getTotalNo.catch()
}

module.exports = {
    usage:
`Returns an image from **Derpibooru** via an **image’s ID**. Compare this to \
the \`derpibooru\` command, which returns an image based on tags. \
Note that this command uses a custom filter that doesn’t show images that \
aren’t art and/or aren’t safe for work. You can see a list of the tags \
blocked here: <https://derpibooru.org/filters/133664>

**Using a different filter:**
If the current filter is too restrictive for you, you can use a different \
one. This works the same way as on Derpibooru \
(https://derpibooru.org/filters) and uses the filter ID. **Note that this \
feature will only work for bot admins for the time being.** Also note that \
due to the Derpibooru API that this bot uses, only hidden tags will have any \
effect — spoilered tags will still show as normal.

**Usage:**
\`\`\`markdown
# Return the image at https://derpibooru.org/508531
~dpi 508531
# Return the image at https://derpibooru.org/1335237, using a different \
filter. This selects Derpibooru’s default filter.
~dpi \`133664 1335237
\`\`\``
  , aliases: ['dpi']
  , dm: true
  , delete: false
  , cooldown: 10
  , process: obj => {
        var msg = obj.msg
          , args = obj.args;
        // Based off fourhts’ cute shipping thing at
        // http://wikipedia.sexy/hoers/
        // and also ES6 promises
        // http://stackoverflow.com/a/14220323

        return Promise.resolve({
            message: 'Retrieving Derpibooru image…'
          , edit: new Promise(resolve => {
                let output;
                let a = new Promise(resolve => {
                    bacon(
                        args
                      , (message) => {
                            output = message;
                            log(
                              [ 'debug'
                              , 'blehp'
                              , 'resolving message: ' + JSON.stringify(message)
                              ]
                            );
                            resolve(output);
                        }
                      , msg.author.id
                    );
                }).then(message => {
                    log(
                        [ 'debug'
                        , 'blehp.then'
                        , 'returning output of derpibooru: ' +
                          JSON.stringify(message)
                        ]
                    );
                    resolve(message);
                }).catch(err => {
                    log(
                        [ 'error'
                        , 'blehp.catch'
                        , 'unknown error (printed below)'
                        , err
                        ]
                    );
                });
            }) // edit_async: new Promise({})
        });

    } // process
}; // module.exports
