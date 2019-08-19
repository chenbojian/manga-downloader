const fs = require('fs')
const axios = require('axios')
const util = require('util')

var ProgressBar = require('progress');


const mkdir = util.promisify(fs.mkdir)
const writeFile = util.promisify(fs.writeFile)

class ManHuaGui {
    constructor(page) {
        this.page = page
        this.imageBufferPromises = {}
        this.db = this._loadDb()
    }

    _loadDb() {
        if (fs.existsSync('db.json')) {
            return JSON.parse(fs.readFileSync('db.json', 'utf8'))
        }
        return {};
    }

    _persistDb() {
        fs.writeFileSync('db.json', JSON.stringify(this.db), 'utf8')
    }

    _isPageDownloaded(url) {
        if (!this.db.downloadedPages) {
            return false
        }
        return this.db.downloadedPages[url]
    }

    _setPageDownloaded(url) {
        if (!this.db.downloadedPages) {
            this.db.downloadedPages = {}
        }
        this.db.downloadedPages[url] = true
        this._persistDb()
    }

    async init() {
        await this.page.goto('https://www.manhuagui.com/')
    }

    async downloadAll(url) {
        await this.page.goto(url)
        const list = await this.page.$$eval('div.chapter-list li a', nodes => nodes.map(a => a.href))
        for (const i of list) {
            await this.download(i)
        }
    }

    async download(url) {
        if (this._isPageDownloaded(url)) {
            return
        }
        await this.page.goto(url)
        const title = /关灯(.+)\(.+\)/.exec(await this.page.$eval('div.title', node => node.textContent))[1]
        const mangaData = await this.page.evaluate(() => {
            SMH.imgData = function(n) { window.mangaData = n }
            let script = [...document.querySelectorAll('script:not([src])')].filter(s => /window.+fromCharCode/.test(s.innerHTML))[0]
            let newScript = document.createElement('script')
            newScript.type = "text\/javascript"
            newScript.innerHTML = script.innerHTML
            document.body.append(newScript)          
            return window.mangaData
        })
        const pVars = await this.page.evaluate(() => pVars)
        const imgInfos = mangaData.files.map((file, idx) => {
            file = file.replace(/(.*)\.webp$/gi, "$1")
            const fileExt = (/(\.[^\.]+)$/.exec(file))[1]
            return ({
                filename: mangaData.bname + '/' + mangaData.cname + '/' + (idx + 1) + fileExt,
                url: pVars.manga.filePath + file + '?cid=' + mangaData.cid + '&md5=' + mangaData.sl.md5
            });
        })


        const bar = new ProgressBar(title + '    [:current/:total] :percent :etas', { total: imgInfos.length });

        await batchSaveImage(imgInfos, url, 10, bar)

        this._setPageDownloaded(url)
    }
}

async function batchSaveImage(infos, referer, batchSize, bar) {
    const promises = []
    for (let info of infos) {
        promises.push(getImageBufferPromise(info, referer))
        if (promises.length % batchSize === 0) {
            await Promise.all(promises)
        }
        bar.tick()
    }
    await Promise.all(promises)
}

function getImageBufferPromise(info, referer) {
    return axios.get(info.url, {
        headers: {
            'Referer': referer,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36'
        },
        responseType: 'arraybuffer'
    })
    .then((response) => response.data)
    .then(buffer => writeImage(buffer, info.filename))
}

async function writeImage(buffer, filename) {
    const prefix = 'out/'
    const foldername = /(.+\/)[^\/]+$/.exec(filename)[1]

    if (!fs.existsSync(prefix + foldername)) {
        await mkdir(prefix + foldername, {
            recursive: true
        })
    }

    await writeFile(prefix + filename, buffer, 'binary')
}

module.exports = ManHuaGui
