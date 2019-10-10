const { spawn } = require('child_process')
const util = require('util')
const fs = require('fs')
const mkdir = util.promisify(fs.mkdir)

function loadHtml(url) {
    const options = [
        '-H', 'Cookie: _ga=GA1.2.1772023635.1570682783; _gat=1; _gid=GA1.2.872753816.1570682783; country=TW',
        '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        '-H', 'Host: www.manhuagui.com',
        '-H', 'Referer: https://www.manhuagui.com/',
        '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.2 Safari/605.1.15',
        '-H', 'Accept-Language: en-us',
        '-H', 'Accept-Encoding: br, gzip, deflate',
        // '-x', '108.179.221.114:3128',
        '--compressed'
    ]
    const curl = spawn('curl', [url, ...options])

    return new Promise((resolve, reject) => {
        let error = ''
        let out = ''
        curl.stderr.on('data', (data) => {
            error += data
        });

        curl.stdout.on('data', (data) => {
            out += data
        })

        curl.on('close', (code) => {
            if (code === 0) {
                resolve(out)
            } else {
                reject(`out: ${out} \n error: ${error}`)
            }
        })
    })
}

module.exports = loadHtml
