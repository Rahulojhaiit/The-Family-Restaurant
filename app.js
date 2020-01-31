require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const md5 = require("md5");
const session = require("express-session");
const passport = require("passport");
var JSAlert = require("js-alert");
const encrypt = require("mongoose-encryption");
const passportLocalMongoose = require("passport-local-mongoose");
//const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GoogleStrategy = require( "passport-google-oauth2" ).Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');
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
 email :String,
 googleId: {
       type: String,
       require: true,
       index:true,
       unique:true,
       sparse:true

     },
  facebookId:String,
  password: String,
  // password2: String
});

const reservationSchema = new mongoose.Schema({
    name:String,
    table_for:  Number,
    phone: String,
    username: Number,
    email:String,
    date:String,
    time:String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

reservationSchema.plugin(passportLocalMongoose);


const User = new mongoose.model("customers", userSchema);
const Reservation = new mongoose.model("reservation",reservationSchema);

passport.use(User.createStrategy());
//passport.use(Reservation.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/restaurant",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(token, tokenSecret, profile, done) {
    console.log(profile);
      User.findOrCreate({ googleId: profile.id, username:profile.displayName, email:profile.email }, function (err, user) {
        return done(err, user);
      });
  }
));

app.get("/",function(req,res){
  res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope:
      [ 'https://www.googleapis.com/auth/plus.login',
      , 'https://www.googleapis.com/auth/plus.profile.emails.read' ] }
));

app.get( '/auth/google/restaurant',
    passport.authenticate( 'google', {
        successRedirect: '/bookingmain',
        failureRedirect: '/login'
}));

passport.use(new FacebookStrategy({
  clientID: process.env.APP_ID,
  clientSecret: process.env.APP_SECRET,
  callbackURL: "http://localhost:3000/auth/facebook/restaurant",
  profileFields: ['id', 'displayName', 'photos', 'email']
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ facebookId: profile.id, username:profile.displayName, email:profile.email }, function (err, user) {
    return cb(err, user);
  });
}
));

app.get('/auth/facebook',
passport.authenticate('facebook'));

app.get('/auth/facebook/restaurant',
passport.authenticate('facebook', { failureRedirect: '/login' }),
function(req, res) {
  // Successful authentication, redirect home.
  res.redirect('/bookingmain');
});



app.get("/", function(req, res) {
  //res.sendFile(__dirname + "/index.html");
  if(req.isAuthenticated()){
      res.render("bookingmain");
  }else{
  res.render("index");}
});

app.get("/signup", function(req, res) {
  res.render("signup");
  //res.sendFile(__dirname + "/public/signup.html");
});

app.get("/login", function(req, res) {
  res.render("login");
  //res.sendFile(__dirname + "/public/login.html");
});

app.get("/bookingmain",function(req,res){
  if(req.isAuthenticated()){
      res.render("bookingmain");
  }else{
    res.redirect("login");
  }
});

app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
})


app.post("/signup", function(req, res) {
  const password = md5(req.body.password);
  const password2 = md5(req.body.password2);

  if(password===password2){
    User.register({name:req.body.name, username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/signup");
    } else {
      passport.authenticate("local")(req, res, function(){
        console.log("registration successful");
        res.redirect("/bookingmain");
      });
    }
  });
    }else{
    res.redirect("/signup");
  }
});

app.post("/bookingmain",function(req,res){
   const resbook = new Reservation(
     {name:req.body.name,
    table_for:req.body.totalpersons,
    phone:req.body.phone,
    username:Date.now(),
    email:req.body.email,
    date:req.body.date,
    time:req.body.bookingt
  });
  resbook.save(function(err){
    if(err){
      console.log(err);
      res.redirect("/bookingmain");
    }else{
      console.log("Booking has been done!");
      res.redirect("/bookingmain");
    }
  });
});

app.post("/login",function(req,res){
    const user = new User({
      username: req.body.username,
      password: req.body.password
    });

    req.login(user, function(err){
      if(err){
        console.log(err);
      }else{
        passport.authenticate("local")(req,res,function(){
          res.redirect("/bookingmain");
        });
      }
    });

});

  app.listen(process.env.PORT || 3000, function() {
    console.log("server is running on port 3000");
  });
