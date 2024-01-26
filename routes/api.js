var express = require('express');
var router = express.Router();

var DataService = require('../Controller/DataService');
var passport = require('../Controller/Auth');

router.get('/', function(req, res, next) {
    // res.render('main');
});

router.post('/', passport.authenticate('jwt'), function(req, res, next) {
    DataService.getData(req.body, (rows, lastRow) => {
        res.json({ rows: rows, lastRow: lastRow });
    });
});

/* GET Initial data. */
router.get('/init', passport.authenticate('jwt'), function(req, res, next) {
    DataService.getInitDatas((datas) => {
        res.json(datas);
    });
});

/* Update tree data. */
router.post('/update', passport.authenticate('jwt'), function(req, res, next) {
    let insertTreeRes;
    DataService.updateData(req.body, (datas) => {
        insertTreeRes = datas;
        DataService.insertDataToChangeTable(insertTreeRes.params, insertTreeRes.change, insertTreeRes.count_agg, insertTreeRes.sum_agg, insertTreeRes.avg_agg, req.user);
        res.json({ result: insertTreeRes });
    });
});

router.post('/history', passport.authenticate('jwt'), function(req, res, next) {
    DataService.getHistoryLast50(req.body, (result, err) => {
        if (result) {
            res.json(result);
        } else {
            res.status(404).send(err);
        }
    })
})

router.post('/stp', passport.authenticate('jwt'), function(req, res, next) {
    let tmp = req.body.selected.split(",");
    // let rowData = isNaN(parseInt(tmp[0])) ? tmp.slice(1, tmp.length - 1) : tmp.slice(0, tmp.length - 1);
    let rowData;
    if (isNaN(parseInt(tmp[0]))) {
        let intval = -1;
        console.log("1");
        if (tmp[0].indexOf("attribute") > -1) {
            intval = tmp[1 + parseInt(tmp[0].slice("attribute".length))];
        } else {
            intval = tmp[1 + parseInt(tmp[0].slice("channel".length))];
        }
        rowData = tmp[0] + "=" + intval;
    } else {
        rowData = tmp.slice(0, tmp.length - 1);
    }
    DataService.getDataForTSP({...req.body, selected: rowData, user: req.user }, res);
})

router.post('/bdp', passport.authenticate('jwt'), function(req, res, next) {
    let tmp = req.body.selected.split(",");
    let rowData = isNaN(parseInt(tmp[0])) ? tmp.slice(2, tmp.length - 1) : tmp.slice(1, tmp.length - 1);
    DataService.getDataForBDP({...req.body, selected: rowData, user: req.user }, res);
})

module.exports = router;