
const express = require('express');
const router = express.Router();
const imageMagickHelp = require("../imageMagickHelp");
const pathUtil = require("../pathUtil");
const { isExist } = pathUtil;
const filesizeUitl = require('filesize');
const logger = require("../logger");
const db = require("../models/db");
const { getFileCollection } = db;
const path = require('path');

const serverUtil = require("../serverUtil");
const getStat = serverUtil.common.getStat;

const sevenZipHelp = require("../sevenZipHelp");
const { listZipContentAndUpdateDb } = sevenZipHelp;

const { move, trash } = require("../moveDeleteHelp");

const util = global.requireUtil();

const count = {
    processed: 0,
    saveSpace: 0
};
const minifyZipQue = [];
router.post('/api/minifyZipQue', (req, res) => {
    res.send({
        minifyZipQue
    })
})

const pLimit = require('p-limit');
const limit = pLimit(2);

router.post('/api/overwrite', async (req, res) => {
    const filePath = req.body && req.body.filePath;

    if (!filePath || !(await isExist(filePath))) {
        res.send({ failed: true, reason: "NOT FOUND" });
    }

    if (minifyZipQue.includes(filePath)) {
        res.send({ failed: true, reason: "still in minify queue" });
    }

    const newFileStat = await getStat(filePath);
    const temp = await listZipContentAndUpdateDb(filePath);
    const newFileImgs = temp.files;

    //fint the original file
    let originalFilePath;

    const fn = path.basename(filePath, path.extname(filePath));
    const reg = util.escapeRegExp(fn);
    const allPath = getFileCollection()
        .chain()
        .find({ 'fileName': { '$regex': reg }, isDisplayableInExplorer: true })
        .where(obj => {
            const pp = obj.filePath;
            return util.isCompress(pp) && pp !== filePath;
        })
        .data()
        .map(obj => obj.filePath);

    for (let ii = 0; ii < allPath.length; ii++) {
        let pp = allPath[ii];
        let ppFn = path.basename(pp, path.extname(pp));
        if (ppFn === fn) {
            const oldTemp = await listZipContentAndUpdateDb(pp);
            const oldFileImgs = oldTemp.files;
            const oldFileStat = await getStat(pp);

            if (oldFileStat.size > newFileStat.size && imageMagickHelp.isNewZipSameWithOriginalFiles(newFileImgs, oldFileImgs)) {
                originalFilePath = pp;
                break;
            }
        }
    }

    if (originalFilePath) {
        //do the overwrite 
        await trash(originalFilePath);
        const newPath = path.join(path.dirname(originalFilePath), path.basename(filePath));
        const { stdout, stderr } = move(filePath, newPath);
        if (!stderr) {
            logger.info("[overwrite]", "\n", originalFilePath, "\n", filePath);
            res.send({ failed: false });
        } else {
            logger.error("[overwrite]", "fail at", filePath);
            res.send({ reason: "fail to overwite original file", failed: true });
        }
    } else {
        res.send({ reason: "fail to find original file", failed: true });
    }
})

router.post('/api/isAbleToMinify', async (req, res) => {
    const filePath = req.body && req.body.filePath;

    if (!filePath || !(await isExist(filePath))) {
        res.send({ failed: true, reason: "NOT FOUND" });
    }

    let text = await imageMagickHelp.isConertable(filePath);
    if (text === "no_problem") {
        res.send({ failed: false })
    } else {
        res.send({ failed: true, reason: text })
    }

});

router.post('/api/minifyZip', async (req, res) => {
    const filePath = req.body && req.body.filePath;

    if (!filePath || !(await isExist(filePath))) {
        res.send({ failed: true, reason: "NOT FOUND" });
    } else if (minifyZipQue.includes(filePath)) {
        res.send({ failed: true, reason: "Already in the minify queue" });
    } else {
        //add to queue
        //it takes long time
        res.send({ failed: false });
    }

    minifyZipQue.push(filePath);
    try {
        const temp = await limit(() => imageMagickHelp.minifyOneFile(filePath));
        if (temp) {
            //only success will return result
            const { oldSize, newSize, saveSpace } = temp;
            count.processed++
            count.saveSpace += saveSpace;
            logger.info("[/api/minifyZip] total space save:", filesizeUitl(count.saveSpace, { base: 2 }))
        }
    } catch (e) {
        logger.error("[/api/minifyZip]", e);
    } finally {
        minifyZipQue.shift();
        if (minifyZipQue.length === 0) {
            console.log("[/api/minifyZip] the task queue is now empty");
        }
    }
});

module.exports = router;
