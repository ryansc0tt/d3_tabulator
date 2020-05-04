/* via https://stackoverflow.com/questions/9168737/read-a-text-file-using-node-js */

// Make sure we got a filename on the command line.
if (process.argv.length < 3) {
  console.log('Usage: node ' + process.argv[1] + ' FILENAME');
  process.exit(1);
}
// Read the file and print its contents.
var fs = require('fs')
  , filename = process.argv[2];
fs.readFile(filename, 'utf8', function(err, data) {
  if (err) throw err;

  /* via https://javascript-minifier.com/nodejs */

  const querystring = require('querystring');
  const https  = require('https');

  const query = querystring.stringify({
    input : data,
  });

  const req = https.request(
    {
      method   : 'POST',
      hostname : 'javascript-minifier.com',
      path     : '/raw',
    },
    function(resp) {
      // if the statusCode isn't what we expect, get out of here
      if ( resp.statusCode !== 200 ) {
        console.log('StatusCode=' + resp.statusCode);
        return;
      }

      resp.pipe(process.stdout);
    }
  );
  req.on('error', function(err) {
    throw err;
  });
  req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
  req.setHeader('Content-Length', query.length);
  req.end(query, 'utf8');

});