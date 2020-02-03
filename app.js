require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const md5 = require("md5");
const session = require("express-session");
const _ = require('lodash');
const passport = require("passport");
const encrypt = require("mongoose-encryption");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth2").Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');


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

mongoose.connect("mongodb+srv://admin-rahul:atlas123@cluster0-5jq0d.mongodb.net/restaurantDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.set("useCreateIndex", true);
mongoose.set('useFindAndModify', false);

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
  } else {
    // alert.Call();
    res.render("home");
  }

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

app.get("/menu", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("menu-true", {
      Heading: "Menu",
    });
  } else {
    res.render("menu-false", {
      Heading: "Menu",
    });
  }

})

app.get("/signup", function(req, res) {
  if (req.isAuthenticated()) {
    res.redirect("/bookingmain");
  } else {
    res.render("signup", {
      Heading: "Signup",
        block: "none",
        message:""
    });
  }
  //res.sendFile(__dirname + "/public/signup.html");
});

app.get("/login", function(req, res) {

  if (req.isAuthenticated()) {
    res.redirect("/bookingmain");

  } else {
    res.render("login", {
      Heading: "Login",
      message: 'false',
      block: 'none',
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

    Reservation.find({
      name: personname
    }, function(err, uss) {

      res.render("displaybooking", {
        Heading: "Your Reservations",
        users: uss
      });

    });
  } else {
    res.redirect("login");
  }
});

app.get("/loginFail", function(req, res) {
  res.render("Login", {
    Heading: "Login",
    block: "block",
    message: "Wrong Email or Password"
  });
});

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/signup", function(req, res) {
  const password = md5(req.body.password);
  const password2 = md5(req.body.password2);
  personname = _.startCase(_.toLower(req.body.name));
  personemail = req.body.username;
  if (password === password2) {
    User.register({
      name: _.startCase(_.toLower(req.body.name)),
      username: _.toLower(req.body.username)
    }, req.body.password, function(err, user) {
      if (err) {
        // console.log(err);
        // res.redirect("/signup");
        res.render("Signup",{
          Heading:"Signup",
          block: "block",
          message:"User Already Registered!"
        });
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
    // res.redirect("/signup");
    res.render("Signup",{
      Heading:"Signup",
      block: "block",
      message:"The passwords do not match!"
    });
  }
});

app.post('/login', passport.authenticate('local', {
  failureRedirect: '/loginFail'
}));

app.post("/login", function(req, res) {
  console.log(_.toLower(req.body.username));
  const user = new User({
    username: _.toLower(req.body.username),
    password: req.body.password
  });


  req.login(user, function(err) {
    if (err) res.redirect("/Signup");
    else {
      passport.authenticate("local")(req, res, function() {
        res.render("bookingmain", {
          user: personname
        });
      });
    }
    if (!user) res.redirect("/Signup");
  });

  if (req.isAuthenticated()) {
    const requestedEmail = _.toLower(req.body.username);
    User.findOne({
      username: requestedEmail
    }, function(err, newt) {
      if (!err) {
        personname = _.startCase(_.toLower(newt.name));;
      }
    });
  }

});

app.post("/bookingmain", function(req, res) {
  const resbook = new Reservation({
    name: personname,
    table_for: req.body.totalpersons,
    date: req.body.date,
    time: req.body.bookingt,
    email: _.toLower(req.body.email),
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

app.post("/update", function(req, res) {
  const userId = req.body.id;

  Reservation.findByIdAndUpdate(userId, {
    name: personname,
    table_for: req.body.totalpersons,
    date: req.body.date,
    time: req.body.bookingt,
    email: _.toLower(req.body.email),
    phone: req.body.phone,
  }, function(err) {
    if (!err) res.redirect("/bookingmain");
  });

});

app.get("/changepassword", function(req, res) {
  res.render("editpassword", {
    Heading: "Edit Password",
  });
});

let name1;
let email1;

app.post("/updatepassword", function(req, res) {
  name1 =  _.startCase(_.toLower(req.body.name));
  personname = _.startCase(_.toLower(req.body.name));
  email1 = _.toLower(req.body.username),
  console.log(email1);

  User.findOne({username: email1}, function(err, user) {
    console.log("user "+ user);
    if(!user) {
      return res.render("login",{
        Heading:"Login",
        block: "block",
        message:"User Not Found"
      });
    }
     else if (!err) {
      User.deleteOne({
        name: name1
      }, function(err) {
        res.redirect("/userRevival");
      });
    }
  });
});

app.post("/enterpassword", function(req, res) {
  const password = md5(req.body.password);
  const password2 = md5(req.body.password2);
  personname = _.startCase(_.toLower(req.body.name));
  personemail = _.toLower(req.body.email);
  if (password === password2) {
    User.register({
      name:  _.startCase(_.toLower(req.body.name)),
      username: _.toLower(req.body.username),
      //username: req.body.username
    }, req.body.password, function(err, user) {
      if (err) {
        console.log(err);
        res.redirect("/changepassword");
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
    res.redirect("/changepassword");
  }
});

app.get("/userRevival", function(req, res) {
  res.render("enterpassword", {
    Heading: "Enter New Password",
    name: name1,
    email: email1
  });
});

app.post("/userRevival", function(req, res) {

  const password = req.body.password;
  const password2 = req.body.password2;
  personname = _.startCase(_.toLower(name1));
  if (password === password2) {
    User.register({
      name:  _.startCase(_.toLower(req.body.name)),
      username: _.toLower(req.body.username),
      //username: req.body.username
    }, req.body.password, function(err, user) {
      console.log("Working");
      if (err) {
        console.log(err);
        res.redirect("/changepassword");
      } else {
        console.log("Perfect");
        passport.authenticate("local")(req, res, function(err) {
          console.log("Password Changed");
          res.render("bookingmain", {
            user: personname
          });
        });
      }
    });
  } else {
    res.redirect("/changepassword");
  }
});

app.get("/modify/:uId", function(req, res) {
  const userId = req.params.uId;

  Reservation.findById(userId, function(err, users) {
    if (err) console.log(err);
    else {
      res.render("editreg", {
        Heading: "Edit Reservation",
        user: users
      });
    }
  });

});

app.get("/delete/:userId", function(req, res) {

  const userId = req.params.userId;

  Reservation.deleteOne({
    _id: userId
  }, function(err) {
    if (!err) {
      res.redirect("/bookingmain");
    }
  });

});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server started Successfully");
});
