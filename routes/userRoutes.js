const express = require("express");
const router = express.Router();
const User = require("../models/user");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const session = require("express-session");
const { setTimeout } = require("timers/promises");
const GoogleStrategy = require("passport-google-oauth20");



const {
  getToken,
  COOKIE_OPTIONS,
  getRefreshToken,
  verifyUser,
} = require("../authenticate");


router.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false
}));

router.use(passport.initialize());
router.use(passport.session());

function isEmpty(obj) {
  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      return false;
    }
  }

  return true;
}
var googleUser = {};
function getGoogleUser(){
  var counter = 0;
  while(isEmpty(googleUser)){
    setTimeout(() => {
      counter++;
      console.log("Waiting "+counter+"seconds")
    }, 1000);   
  }
  return googleUser;
}
function setGoogleUser(u){
  googleUser = u;
}
router.post("/signup", (req, res, next) => {
  console.log("<<<<<<<<<<<< INSIDE SIGNUP WITH: "+JSON.stringify(req.body));
  // Verify that first name is not empty
  if (!req.body.password) {
    res.statusCode = 500;
    res.send({
      name: "PasswordError",
      message: "The password is required",
    });
  } else if(req.body.authStrategy == "google"){
    User.register(
      new User({ username: req.body.username }),
      req.body.password, (err, user) => {
        if (err) {
          res.statusCode = 500;
          res.send(err);
        } else {
          user.firstName = "";
          user.lastName = "";
          user.points = 1;
          user.email = req.body.email;
          user.photo = req.body.photo;
          user.authStrategy = req.body.authStrategy;
          const token = getToken({ _id: user._id });
          const refreshToken = getRefreshToken({ _id: user._id });
          user.refreshToken.push({ refreshToken });
          user.save((err, user) => {
            if (err) {
              res.statusCode = 500;
              res.send(err);
            } else {
              res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);
              res.send({ success: true, token });
            }
          });
        }
      }
    );
  } else {
    User.register(
      new User({ username: req.body.username }),
      req.body.password, (err, user) => {
        if (err) {
          res.statusCode = 500;
          res.send(err);
        } else {
          user.points = 50;
          user.email = req.body.email;
          user.firstName = req.body.firstName;
          user.lastName = req.body.lastName || "";
          const token = getToken({ _id: user._id });
          const refreshToken = getRefreshToken({ _id: user._id });
          user.refreshToken.push({ refreshToken });
          user.save((err, user) => {
            if (err) {
              res.statusCode = 500;
              res.send(err);
            } else {
              res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);
              res.send({ success: true, token });
            }
          });
        }
      }
    );
  }
});
// router.post("/signup", (req, res, next) => {
//   // Verify that first name is not empty
//   if (!req.body.firstName) {
//     res.statusCode = 500;
//     res.send({
//       name: "FirstNameError",
//       message: "The first name is required",
//     });
//   } else {
//     User.register(
//       new User({ username: req.body.username }),
//       req.body.password,
//       (err, user) => {
//         if (err) {
//           res.statusCode = 500;
//           res.send(err);
//         } else {
//           user.firstName = req.body.firstName;
//           user.lastName = req.body.lastName || "";
//           const token = getToken({ _id: user._id });
//           const refreshToken = getRefreshToken({ _id: user._id });
//           user.refreshToken.push({ refreshToken });
//           user.save((err, user) => {
//             if (err) {
//               res.statusCode = 500;
//               res.send(err);
//             } else {
//               res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);
//               res.send({ success: true, token });
//             }
//           });
//         }
//       }
//     );
//   }
// });

passport.use(new GoogleStrategy.Strategy({
  clientID : process.env.CLIENT_ID,
  clientSecret : process.env.CLIENT_SECRET,
  callbackURL : "http://localhost:8081/users/auth/google/secrets",
  userProfileURL : "https://www.googleapis.com/oauth2/v3/userinfo"
},
async function(accessToken, refreshToken, profile, cb) {
  console.log("Profile: "+JSON.stringify(profile));
  let bob = new User({
    username: profile.emails[0].value, 

  });
  const query = { username: profile.emails[0].value };
  const id= await User.find(query);
  console.log(">>>>>>>>>>>>>>>>>>>>>Google User query came back with: "+JSON.stringify(id[0])+" and a length of: "+id.length);
  if(id.length<1){
    
    setGoogleUser({ 
      username: bob.username,
      password: profile.id,
      email: profile.emails[0].value,     
      photo: profile.photos[0].value, 
      authStrategy: profile.provider,
      points: 0
     })
  }else{
    console.log("I found: "+JSON.stringify(id[0]));
    setGoogleUser({ 
      username: bob.username,
      password: profile.id,
      email: profile.emails[0].value,     
      photo: profile.photos[0].value, 
      authStrategy: profile.provider,
      points: 1
     })
  }
 
}
));

router.get('/auth/google',
  passport.authenticate("google", { scope: ["email"] })
  );

router.get('/auth/google/secrets', 
  passport.authenticate("google", { failureRedirect: "users/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    console.log("Google authentication successful!!!!");

    //res.redirect("/secrets");

  });



router.get('/auth/google/response',async (req,res,next) => {
  console.log("/auth/google/response was called");
  var temp = await getGoogleUser();

  console.log("Now sending back data: "+JSON.stringify(getGoogleUser())+"\n");
  //res.cookie("refreshToken", rtoken, COOKIE_OPTIONS);
  res.send(getGoogleUser());
})




router.post("/login", passport.authenticate("local"), (req, res, next) => {
  console.log("What came from Login fetch: "+JSON.stringify(req.user));
  
  const token = getToken({ _id: req.user._id });
  const refreshToken = getRefreshToken({ _id: req.user._id });
  User.findById(req.user._id).then(
    (user) => {
      console.log(">>inside Login find by id query result: "+JSON.stringify(user));
      user.refreshToken.push({ refreshToken });
      user.save((err, user) => {
        if (err) {
          res.statusCode = 500;
          res.send(err);
        } else {
          console.log(">>>>inside Login No Errorrs: "+JSON.stringify(user));
          res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);
          res.send({ success: true, token });
        }
      });
    },
    (err) => next(err)
  );
});

router.post("/refreshToken", (req, res, next) => {

    console.log("Inside refreshToken with: ")
    console.log("Inside refreshToken with req length: "+req.length);

    const { signedCookies = {} } = req;
    const { refreshToken } = signedCookies;
  
    console.log("Inside refreshToken with signedCookies: "+JSON.stringify(signedCookies));
  

  if (refreshToken) {
    try {
      const payload = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );
      console.log("------------------------Refresh token payload: "+JSON.stringify(payload)+" the id was: "+payload._id);
      const userId = payload._id;
      User.findOne({ _id: userId }).then(
        (user) => {
          if (user) {
            // Find the refresh token against the user record in database
            const tokenIndex = user.refreshToken.findIndex(
              (item) => item.refreshToken === refreshToken
            );
              console.log("LOGIN database test for refreshToken index: "+JSON.stringify(refreshToken)+" vs DB located: "+JSON.stringify(user.refreshToken));
              console.log("LOGIN database test for refreshToken resulted in the tokenIndex= "+tokenIndex);
            if (tokenIndex === -1) {
              res.statusCode = 401;
              res.send("Unauthorized");
            } else {
              const token = getToken({ _id: userId });
              // If the refresh token exists, then create new one and replace it.
              const newRefreshToken = getRefreshToken({ _id: userId });
              user.refreshToken[tokenIndex] = { refreshToken: newRefreshToken };
              user.save((err, user) => {
                if (err) {
                  res.statusCode = 500;
                  res.send(err);
                } else {
                  res.cookie("refreshToken", newRefreshToken, COOKIE_OPTIONS);
                  res.send({ success: true, token });
                }
              });
            }
          } else {
            res.statusCode = 401;
            res.send("Unauthorized");
          }
        },
        (err) => next(err)
      );
    } catch (err) {
      res.statusCode = 401;
      res.send("Unauthorized");
    }
  } else {
    res.statusCode = 401;
    res.send("Unauthorized");
  }
});

router.get("/me", verifyUser, (req, res, next) => {
  res.send(req.user);
});

router.get("/logout", verifyUser, (req, res, next) => {
  const { signedCookies = {} } = req;
  const { refreshToken } = signedCookies;
  User.findById(req.user._id).then(
    (user) => {
      const tokenIndex = user.refreshToken.findIndex(
        (item) => item.refreshToken === refreshToken
      );

      if (tokenIndex !== -1) {
        user.refreshToken.id(user.refreshToken[tokenIndex]._id).remove();
      }

      user.save((err, user) => {
        if (err) {
          res.statusCode = 500;
          res.send(err);
        } else {
          res.clearCookie("refreshToken", COOKIE_OPTIONS);
          res.send({ success: true });
        }
      });
    },
    (err) => next(err)
  );
});
module.exports = router;
