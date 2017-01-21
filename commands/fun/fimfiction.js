// TODO: Block Mature-rated fics

const utils = require('./../../utils/utils.js')
    , request_require = require('request')
    , request = request_require.defaults(
        { gzip: true
        , baseUrl: 'https://fimfiction.net/'
        , headers:
            { 'User-Agent': 'Changeling Bot (Discord bot) by Chryssi'
            }
        }
      );

// Hardcode the first parameter (i.e. file from which fileLog was called) to
// avoid repetition
function log(arr) {
    arr.unshift('fimfiction');
    return utils.fileLog(arr);
}

function getStoryInfo(obj) {
    return new Promise((resolve, reject) => {
        const storyId = obj.args
            , functionName = 'getStoryInfo';
        // Check if story ID is valid
        // id_int is the image ID as an integer
        var storyIdInt = parseInt(storyId, 10)

        request(
            `/api/story.php?story=${storyId}`
          , (err, res, body) => {
                if (err) {
                    reject(
                      { log: [functionName, err.message]
                      , message:
                            'Something went wrong in connecting to ' +
                            'Fimfiction.'
                      }
                    );
                } else {
                    let contentType = res.headers['content-type']
                      , statusCode = res.statusCode;
                    log(
                      [ 'debug'
                      , functionName
                      , 'contentType: ' + contentType
                      ]
                    );
                    if (statusCode !== 200) {
                        reject(
                          { log:
                              [ functionName
                              , `Returned status code ${statusCode}`
                              ]
                          , message:
                                `Fimfiction returned error code ` +
                                `${statusCode}.`
                          }
                        );
                    } else if (! /^application\/json/.test(contentType) &&
                               ! /^text\/javascript/.test(contentType)) {
                        // If filter doesn’t exist, Derpibooru will return
                        // status code 302 and redirect to front page.
                        reject(
                          { log:
                              [ functionName
                              , `Invalid content type (expected JSON, ` +
                                `got ${contentType}).`
                              ]
                          , message:
                                `Fimfiction’s API returned something ` +
                                `invalid. Maybe it’s offline or has moved?`
                          }
                        );
                    } else {
                        resolve(body);
                    } // else
                } // if (err) {} else {}
            } // (err, res, body) {}
        ); // request()
    }); // return new Promise((resolve, reject) => {}
}

function parseStoryInfo(body) {
    return new Promise((resolve, reject) => {
        const functionName = 'parseStoryInfo';
        try {
            let resParsed = JSON.parse(body);
            if (!resParsed.story && resParsed.error) {
                // If there’s an error, Fimfiction will return the error key
                // instead of the story key.

                // This relies on the assumption that the error key will have a
                // value that can be converted to a string.
                reject(
                  { log:
                      [ functionName
                      , `Fimfiction returned error: ${resParsed.error}`
                      ]
                  , message:
                        `Fimfiction’s API returned error: ` +
                        `${resParsed.error}. Check that the story you’re ` +
                        `looking for can be accessed.`
                  }
                );
            } else if (!resParsed.story && !resParsed.error) {
                // This shouldn’t happen
                reject(
                  { log:
                      [ functionName
                      , `Fimfiction returned error: ${resParsed.error}`
                      ]
                  , message:
                        `Fimfiction’s API returned something unexpected. ` +
                        `This is because their API changed and this bot ` +
                        `hasn’t been updated to account for this, or their ` +
                        `API might have moved somewhere else.`
                  }
                );
            }

            let story = resParsed.story;

            let storyCategories = [];

            // story.categories looks like this:
            // { '2nd Person': false
            // , Adventure: false
            // , 'Alternate Universe': false ...
            // }
            // The below converts it to this:
            // [ '2nd Person'
            // , 'Adventure'
            // , 'Alternate Universe' ...
            // ]
            Object.keys(story.categories).forEach(cat => {
                if (story.categories[cat]) {
                    if (storyCategories.includes(cat)) {
                        // Duplicate tags (this REALLY shouldn't happen)
                        log(
                          [ 'warn'
                          , functionName
                          , `Duplicate tag ${cat} in story ID ${storyId}`
                          ]
                        );
                    } else {
                        // Add tag to list
                        storyCategories.push(cat);
                    }
                }
            });

            resolve(
              { storyCategories: storyCategories
              , storyTitle: story.title
              , storyImage: story.image
              , storyUrl: story.url
              , storyAuthor: story.author
              , storyStatus: story.status
              , storyRating: story.content_rating_text
              , storyWords: story.words
              , storyViews: story.views
              , storyViewsTotal: story.total_views
              , storyComments: story.comments
              , storyLikes: story.likes
              , storyDislikes: story.dislikes
              , storyDescription: story.description
              , storyChapterCount: story.chapter_count
              , storyId: story.id
              }
            );
        } catch (e) {
            reject(
              { log: [functionName, e.message]
              , message:
                  'Changeling Bot couldn’t read what ' +
                  'Fimfiction returned.'
              }
            );

        } // try {} catch (e) {}

    }); // return new Promise((resolve, reject) => {}
}

function createStoryEmbed(obj) {
    return new Promise((resolve, reject) => {
        var storyCategories = obj.storyCategories
          , storyTitle = obj.storyTitle
          , storyImage = obj.storyImage
          , storyUrl = obj.storyUrl
          , storyAuthor = obj.storyAuthor
          , storyStatus = obj.storyStatus
          , storyRating = obj.storyRating
          , storyWords = obj.storyWords
          , storyViews = obj.storyViews
          , storyViewsTotal = obj.storyViewsTotal
          , storyComments = obj.storyComments
          , storyLikes = obj.storyLikes
          , storyDislikes = obj.storyDislikes
          , storyDescription = obj.storyDescription
          , storyChapterCount = obj.storyChapterCount
          , storyId = obj.storyId;

        // Fimfiction usernames follow the following pattern:
        // 24 chars max, /(?! )( ?[a-zA-Z0-9_-])+/
        //          i.e. a-z, A-Z, 0-9, _, -, space
        //               space cannot appear after another space
        //               space cannot appear at start nor end
        // The only character that needs to be escaped for Discord is the
        // underscore, which is parsed as italics or underline
        storyAuthor.name = storyAuthor.name.replace(/_/g, '\\_');

        let result =
          { embed:
              { author:
                  { name: storyTitle
                  , icon_url: storyImage
                  , url: storyUrl
                  }
              , color: ((1 << 24) * Math.random() | 0) // Randomly sets the colour
              , fields: // TODO: Figure out how to indent this properly
                  [ { name: 'Author'
                    , value: `**${storyAuthor.name}** (id: ${storyAuthor.id})`
                    , inline: true
                    }
                  , { name: 'Categories'
                    , value: storyCategories.join(', ')
                    , inline: true
                    }
                  , { name: 'Status, Content Rating'
                    , value: storyStatus + ', ' + storyRating
                    , inline: true
                    }
                  , { name: 'Words'
                    , value: storyWords.toString()
                    , inline: true
                    }
                  , { name: 'Views'
                    , value: `${storyViews} (${storyViewsTotal} total)`
                    , inline: true
                    }
                  , { name: 'Comments'
                    , value: storyComments.toString()
                    , inline: true
                    }
                  , { name: 'Score' // TODO: Figure out a way to make this look slightly less shitty
                    , value: `${storyLikes} ▲ | ${storyDislikes} ▼`
                    , inline: true
                    }
                  , { name: 'Description'
                    , value: storyDescription
                    }
                  , { name: `Chapters (${storyChapterCount})`
                    , value: '(coming soon)' // TODO: Actually finish this
                    }
                  ]
              }
          };
        resolve(result);
    }); // return new Promise((resolve, reject) => {}
}

module.exports = {
    usage:
`Retrieves a story from **Fimfiction**. Right now the API’s limited to story \
IDs, e.g. in the story *Equestrian Fanfiction*, where the URL is \
<https://www.fimfiction.net/story/358763/>, the story ID is \`358763\`.

**Usage:**
\`\`\`
[command prefix]fimfic 358763
\`\`\``
  , aliases: ['fimfic']
  , dm: true
  , delete: false
  , cooldown: 10
  , process: obj => {

      return new Promise(resolve => {
          getStoryInfo(obj).then(
              body => parseStoryInfo(body)
          ).then(
              obj => createStoryEmbed(obj)
          ).then(message => {
                  log(
                    [ 'debug'
                    , 'then'
                    , 'returning output: ' +
                      JSON.stringify(message)
                    ]
                  );
                  resolve(message);
              }
          ).catch(err => {
              // If catch() caught an Error object, return error.message
              if (err instanceof Error) {
                  log(['error', 'catch', err.message, err.stack]);
                  resolve({ message: '**Error:** ' + err.message });
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
                  resolve({ message: resolveMessage });
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
                    { message:
                          '**Error:** Something really weird happened. ' +
                          'This is a bug in the command; please let the ' +
                          'developer know.'
                    }
                  );
              }
          }); // catch(err => {}
      }); // return new Promise(resolve => {}
    } // process
}; // module.exports
