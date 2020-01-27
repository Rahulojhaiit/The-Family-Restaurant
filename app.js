require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const md5 = require("md5");
const findOrCreate = require('mongoose-findorcreate');
const session = require("express-session");
const passport = require("passport");
//var JSAlert = require("js-alert");
const encrypt = require("mongoose-encryption");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
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
  password1: String,
  password2: String
});

const mysecret = "Idontknowhowtobehave";
userSchema.plugin(encrypt, {secret: mysecret,encryptedFields: ["password1","password2"] });

const User = new mongoose.model("User", userSchema);


app.listen(process.env.PORT || 3000, function() {
  console.log("server is running on port 3000");
});

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/index.html");
});



app.post("/signup.html", function(req, res) {
  const password1 = req.body.password1;
  const password2 = req.body.password2;

  const newUser = new User({
    name: req.body.name,
    email: req.body.username,
    password1: req.body.password1,
    password2: req.body.password2
  });
  if (password1 === password2) {
    newUser.save(function(err) {
      if (err) {
        console.log(err);
      } else {
        console.log("signup-working");
        res.sendFile(__dirname + "/index.html");
      }
    });
  } else {
    res.sendFile(__dirname + "/public/signup.html")
  }
});

app.post("/login.html",function(req,res){
    const username =req.body.username;
    const password = req.body.password;

    User.findOne({email: username}, function(err, foundUser){
      if(err){
        console.log(err)
      }else{
        if(foundUser){
          if(foundUser.password1 === password){
            console.log("successfully logged in");
            res.sendFile(__dirname + "/index.html");
          }
        }
      }
    })
});


//facebook authentication
//App Id: 2201384640169387
//App Secret: eb4778cf5e7f74c19ea14cd735dc802c


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/restaurant"
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
