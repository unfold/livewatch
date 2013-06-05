var exec = require('child_process').exec,
    fs = require('fs'),
    path = require('path'),
    watchr = require('watchr'),
    LiveReloadServer = require('livereload-server')

exports = module.exports = livewatch

function indent(str) {
    return '\t' + str.split('\n').join('\t\n')
}

function livewatch(command, sourcePaths, targetPaths, debug) {
    var script = fs.readFileSync(path.join(__dirname, 'vendor/livereload-2.0.8.js'), 'utf-8'),
        headers = {'Content-Length': script.length, 'Content-Type': 'text/javascript'}

    var executeCommand = function() {
        debug && console.log('Executing: %s', command)

        exec(command, function(err, stdout, stderr) {
            if (err) return console.error('Error executing command: %s - %s', command, err)

            debug && stdout.length && console.log(indent(stdout.toString()))
            debug && stderr.length && console.error(indent(stdout.toString()))
        })
    }

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
                if (err) return console.error('Error watching source path: %s - %s', watcher.path, err)
            },
            change: executeCommand
        }
    })

    watchr.watch({
        paths: targetPaths,
        listeners: {
            watching: function(err, watcher) {
                if (err) return console.error('Error watching target path: %s - %s', watcher.path, err)
            },

            change: function(type, targetPath, currentStat) {
                if (!currentStat || !currentStat.size) return

                for (var id in server.connections) {
                    var connection = server.connections[id]

                    debug && console.log('Connection %s, sending reload: %s', id, targetPath)

                    try {
                        connection.send({
                            command: 'reload',
                            path: path.basename(targetPath),
                            liveCSS: true
                        })
                    } catch (e) {
                        debug && console.log('Connection send error: %s', e.message)
                    }
                }
            }
        }
    })

    if (debug) {
        server.on('connected', function(connection) {
            console.log('Client %s connected', connection.id)
        })

        server.on('disconnected', function(connection) {
            console.log('Client %s disconnected', connection.id)
        })

        server.on('close', function(connection) {
            console.log('Client %s closed connection', connection.id)
        })

        server.on('command', function(connection, message) {
            console.log('Client %s command: %s', connection.id, message.command)
        })

        server.on('error', function(err, connection) {
            console.error('Client %s error: %s', err, connection.id)
        })

        console.log('LiveWatch %s watching %d sources and %d targets', server.options.version, sourcePaths.length, targetPaths.length)
    }

    executeCommand()
}
