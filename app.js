require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const md5 = require("md5");
const session = require("express-session");
const _ = require('lodash');
const passport = require("passport");
const Swal = require('sweetalert2');
// var JSAlert = require("js-alert");
const encrypt = require("mongoose-encryption");
const passportLocalMongoose = require("passport-local-mongoose");
//const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GoogleStrategy = require("passport-google-oauth2").Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');
//const popupS = require('popups');
const app = express();
let personname;
let personemail;

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: process.env.secret,
  resave: false,
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
  username: String,
  googleId: {
    type: String,
    require: true,
    index: true,
    unique: true,
    sparse: true

  },
  facebookId: String,
  password: String,
  // password2: String
});

const reservationSchema = new mongoose.Schema({
  name: String,
  table_for: Number,
  phone: String,
  username: Number,
  email: String,
  date: String,
  time: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

reservationSchema.plugin(passportLocalMongoose);


const User = new mongoose.model("user", userSchema);
const Reservation = new mongoose.model("reservation", reservationSchema);

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
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    callbackURL: "http://localhost:3000/auth/google/restaurant",
  },
  function(token, tokenSecret, profile, done) {
  //  console.log(profile);

    personname = _.startCase(_.toLower(profile.displayName));
    User.findOrCreate({
      googleId: profile.id,
      username: profile.displayName,
      email: profile.email
    }, function(err, user) {

      return done(err, user);
    });

  }
));

app.get("/", function(req, res) {
  if (req.isAuthenticated()) {
    res.redirect("/bookingmain");
  } else
    res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['https://www.googleapis.com/auth/plus.login', , 'https://www.googleapis.com/auth/plus.profile.emails.read']
  }));

app.get('/auth/google/restaurant',
  passport.authenticate('google', {
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
    user = profile.displayName;
    User.findOrCreate({
      facebookId: profile.id,
      username: profile.displayName,
      email: profile.email
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/restaurant',
  passport.authenticate('facebook', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/bookingmain');
  });

app.get("/", function(req, res) {
  //res.sendFile(__dirname + "/index.html");
  if (req.isAuthenticated()) {
    res.render("bookingmain");

  } else {
    res.render("index");
  }
});

app.get("/signup", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("bookingmain");

  } else {
  res.render("signup", {
    Heading: "Signup"
  });
}
  //res.sendFile(__dirname + "/public/signup.html");
});

app.get("/login", function(req, res) {

  if (req.isAuthenticated()) {
    res.render("bookingmain");

  } else {
  res.render("login", {
    Heading: "Login"
  });
}
  //res.sendFile(__dirname + "/public/login.html");
});

app.get("/bookingmain", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("bookingmain", {
      user: personname,
    });
  } else {
    res.redirect("login");
  }
});

app.get("/displaybooking", function(req, res) {
  if (req.isAuthenticated()) {
    console.log("Person Name" + personname);

    Reservation.find({
      name: personname
    }, function(err, uss) {
      //console.log(uss);
      //  var reqName = _.startCase(_.toLower(uss.name));
      //console.log("Req Name:"+  reqName);
      //  if(reqName===personname){
      res.render("displaybooking", {
        Heading: "Your Reservations",
        // name:uss.name,
        // people:uss.table_for,
        // date:uss.date,
        // time:uss.time,
        // email:uss.email,
        // phone:uss.phone,
        users: uss
      });
      //}
    });

    //
    // console.log(req.body.username);
    // res.render("displaybooking", {
    //   Heading: "Your Reservations"
    // });
  } else {
    res.redirect("login");
  }
});

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/signup", function(req, res) {
  const password = md5(req.body.password);
  const password2 = md5(req.body.password2);
  personname = _.startCase(_.toLower(req.body.name));
  personemail = req.body.email;
  if (password === password2) {
    User.register({
      name: req.body.name,
      username: req.body.username
    }, req.body.password, function(err, user) {
      if (err) {
        console.log(err);
        res.redirect("/signup");
      } else {
        passport.authenticate("local")(req, res, function() {
          //console.log("registration successful");
          res.render("bookingmain", {
            user: personname
          });
        });
      }
    });
  } else {
    res.redirect("/signup");
  }
});

app.post("/login", function(req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });


  req.login(user, function(err) {
    if (err) {
      //console.log(err);
        res.redirect("/Signup");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.render("bookingmain", {
          user: personname
        });
      });
    }
  });

  const requestedEmail = req.body.username;

  User.findOne({username: requestedEmail}, function(err, newt) {
    if (!err) {
      personname = _.startCase(_.toLower(newt.name));;
    }
    else{
      res.redirect("/Signup");
    }
  });

});

app.post("/bookingmain", function(req, res) {
  const resbook = new Reservation({
    name: personname,
    table_for: req.body.totalpersons,
    date: req.body.date,
    time: req.body.bookingt,
    email: req.body.email,
    phone: req.body.phone,
    username: Date.now(),
  });
  resbook.save(function(err) {
    if (err) {
      console.log(err);
      res.redirect("/bookingmain");
    } else {
      res.redirect("/bookingmain");
      console.log("Booking has been done!");
    }
  });
});

app.listen(process.env.PORT || 3000, function() {
  console.log("server is running on port 3000");
});
