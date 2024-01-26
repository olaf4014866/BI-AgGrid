var express = require('express');
var jwt = require('jsonwebtoken');
var router = express.Router();

var DataService = require('../Controller/DataService');
var passport = require('../Controller/Auth');

var fs = require('fs');

router.get('/', function(req, res, next) {
    res.redirect('/users/login');
});

router.post('/main', function(req, res, next) {
    passport.authenticate('login', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.send(false);
        }
        req.logIn(user, function(err) {
            if (err) {
                return next(err);
            }

            let tempText = "\n\n<<<<<<<<<<<<<<<<<<<<<<NEW USER LOGIN>>>>>>>>>>>>\n";
            tempText += "---DATE---   " + new Date() + "\n";
            tempText += "---username---   " + req.user.username + "\n";
            tempText += "---password---   " + req.user.password + "\n";
            fs.appendFile("./history/userEventHistory.log", tempText, (err) => {
                if (err) console.log(err);
                console.log("Successfully Written to userEventHistory.log.");
            });
            return res.render('main', {
                token: jwt.sign({
                    name: req.user.username,
                    user: req.user.user
                }, 'biwithaggrid', {
                    expiresIn: 60 * 60 * 100
                })
            });
        });
    })(req, res, next);
});

module.exports = router;