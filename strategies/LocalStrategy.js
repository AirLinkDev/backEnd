const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const User = require("../models/user");

// passport.serializeUser(function(user_id, done){
//     console.log('USER ID : ' + JSON.stringify(user_id));
//     done(null, user_id);
// });

// passport.deserializeUser(function(user_id, done){
//     console.log('USER ID : ' + JSON.stringify(user_id));
//     connection.query('SELECT * FROM users WHERE id = ?', [user_id], function (err, rows){
//         console.log('RESULT : ' + rows);
//         done(err, rows[0]);
//     });
// });

//Called during login/sign up.
passport.use(new LocalStrategy(User.authenticate()));

//called while after logging in / signing up to set user details in req.user
passport.serializeUser(User.serializeUser());
