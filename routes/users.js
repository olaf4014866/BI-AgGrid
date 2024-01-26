var express = require('express');
var passport = require('../Controller/Auth');
var router = express.Router();
var jwt = require('jsonwebtoken');

var dataService = require('../Controller/DataService');
/* GET user register */
router.get('/register', function(req, res, next) {
    res.render('register');
});

/* GET user register */
router.get('/login', function(req, res, next) {
    res.render('index');
});

/* POST users listing. */
router.post('/register', function(req, res, next) {
    let payload = req.body;
    if (payload.password1 !== payload.password2) {
        res.redirect('register');
    }
    dataService.registerUser(payload, (result) => {
        if (result) {
            res.redirect('login');
        } else {
            res.redirect('register');
        }
    });
});

module.exports = router;