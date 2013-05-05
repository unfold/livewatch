var exec = require('child_process').exec,
    fs = require('fs'),
    path = require('path'),
    watchr = require('watchr'),
    LiveReloadServer = require('livereload-server')

exports = module.exports = livewatch

function livewatch(command, sourcePaths, targetPaths) {
    var script = fs.readFileSync(path.join(__dirname, 'vendor/livereload-2.0.8.js'), 'utf-8'),
        headers = {'Content-Length': script.length, 'Content-Type': 'text/javascript'},
        targetCache = {}

    var server = new LiveReloadServer({
        id: 'no.unfold.watch',
        name: 'LiveWatch',
        version: require('../package').version,
        protocols: {
            monitoring: 7
        }
    })

    server.on('livereload.js', function(req, res) {
        res.writeHead(200, headers)
        res.end(script)
    })

    server.listen(function(err) {
        if (err) return console.error('Listening failed: %s', err.message)
    })

    watchr.watch({
        paths: sourcePaths,
        listeners: {
            watching: function(err, watcher) {
                if (err) return console.log('Error watching path: %s - %s', watcher.path, err)
            },
            change: function() {
                exec(command, function(err) {
                    if (err) return console.log('Error executing command: %s - %s', command, err)
                })
            }
        }
    })

    watchr.watch({
        paths: targetPaths,
        listener: function(type, targetPath, currentStat, previousStat) {
            if (!currentStat || !currentStat.size) return

            for (var id in server.connections) {
                var connection = server.connections[id]

                connection.send({
                    command: 'reload',
                    path: path.basename(targetPath),
                    liveCSS: true
                })
            }
        }
    })
}
