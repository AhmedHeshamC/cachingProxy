const yargs = require('yargs');
const { startServer, clearCache } = require('./server');

yargs
  .command('start', 'Start the caching proxy server', {
    port: {
      describe: 'Port to run the server on',
      type: 'number',
      demandOption: true,
      min: 1024,
      max: 65535
    },
    origin: {
      describe: 'Origin server URL',
      type: 'string',
      demandOption: true,
      coerce: (url) => {
        try {
          new URL(url);
          return url;
        } catch (e) {
          throw new Error('Invalid origin URL provided');
        }
      }
    }
  }, (argv) => {
    startServer(argv.port, argv.origin);
  })
  .command('clear-cache', 'Clear the proxy cache', {}, () => {
    clearCache();
  })
  .strict()
  .help()
  .argv;
