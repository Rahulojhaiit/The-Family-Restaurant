require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const md5 = require("md5");
const findOrCreate = require('mongoose-findorcreate');
const session = require("express-session");
const passport = require("passport");
var JSAlert = require("js-alert");
const encrypt = require("mongoose-encryption");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: process.env.secret,
  resave:false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/restaurantDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  password2: String
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/index.html");
});

app.get("/signup.html", function(req, res) {
  res.sendFile(__dirname + "/public/signup.html");
});

app.get("/login.html", function(req, res) {
  res.sendFile(__dirname + "/public/login.html");
});


app.post("/signup.html", function(req, res) {
  const password = md5(req.body.password);
  const password2 = md5(req.body.password2);

  if(password===password2){
    User.register({name:req.body.name, username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/signup.html");
    } else {
      passport.authenticate("local")(req, res, function(){
        console.log("registration successful");
        res.redirect("/");
      });
    }
  });
    }else{
    res.redirect("/signup.html");
  }
});
  // const user = new User({
  //   name: req.body.name,
  //   email: req.body.username,
  // });
// User.register({username:req.body.username},req.body.password,function(err,user){
//   if(err){
//     console.log(err);
//     res.redirect("/signup.html");
//   }else{
//       passport.authenticate("local")(req,res,function(){
//         //console.log("Signup successful");
//         //res.redirect("/index.html");
//         res.sendFile(__dirname + "/index.html");
//       });
//   }
// });

  // const newUser = new User({
  //   name: req.body.name,
  //   email: req.body.username,
  //   password: md5(req.body.password),
  //   password2: md5(req.body.password2)
  // });
  // if (password === password2) {
  //   newUser.save(function(err) {
  //     if (err) {
  //       console.log(err);
  //     } else {
  //       console.log("signup-working");
  //       res.redirect("/");
  //     }
  //   });
  // } else {
  //     res.redirect("/signup.html");
  // }


app.post("/login.html",function(req,res){
    const user = new User({
      username: req.body.username,
      password: req.body.password
    });

    req.login(user, function(err){
      if(err){
        console.log(err);
      }else{
        passport.authenticate("local")(req,res,function(){
          res.redirect("/");
        });
      }
    });

    //const username =req.body.username;
    //const password = md5(req.body.password);
    
    // User.findOne({email: username}, function(err, foundUser){
    //   if(err){
    //     console.log(err)
    //   }else{
    //     if(foundUser){
    //       if(foundUser.password === password){
    //         console.log("successfully logged in");
    //         res.sendFile(__dirname + "/index.html");
    //       }
    //     }
    //   }
    // })
});


app.listen(process.env.PORT || 4000, function() {
  console.log("server is running on port 4000");
});



//facebook authentication
//App Id: 2201384640169387
//App Secret: eb4778cf5e7f74c19ea14cd735dc802c


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:4000/auth/google/restaurant"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile']
  }));

app.get('/auth/google/restaurant',
  passport.authenticate('google', {
    failureRedirect: '/signup.html'
  }),
  function(req, res) {
    res.redirect('/');
  });
