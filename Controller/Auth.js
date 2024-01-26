var passport = require('passport');
var localStrategy = require('passport-local').Strategy;
var bcrypt = require('bcrypt');
var JwtStrategy = require('passport-jwt').Strategy,
    ExtractJwt = require('passport-jwt').ExtractJwt;
var BearerStrategy = require('passport-http-bearer').Strategy;

var dataService = require('../Controller/DataService');

var opts = {}
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = 'biwithaggrid';
passport.use(new JwtStrategy(opts, function(jwt_payload, next) {
    console.log('payload received', jwt_payload);
    dataService.findUserByName({ username: jwt_payload.name }, (flag, user) => {
        if (flag) {
            return next(null, user);
        } else {
            console.log("failure");
            return next(null, false, { message: "Error" });
        }
    })
}));

passport.use('login',
    new localStrategy({
        usernameField: 'username',
        passwordField: 'password',
        session: false
    }, (username, password, done) => {
        let userData = {
            username: username,
            password: password
        };
        dataService.findUser(userData, (flag, user) => {
            if (flag) {
                return done(null, user);
            } else {
                console.log("failure");
                return done(null, false, { message: "Error" });
            }
        })
    })
);

passport.serializeUser(function(user, cb) {
    cb(null, user);
});

module.exports = passport;