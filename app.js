const port = 3000;
const session = require('express-session');
const express = require('express');

const router = express.Router();
const app = express();
const MongoStore = require('connect-mongo')(session);
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const User = require('./models/User');

const genericUser = new User();

mongoose
  .connect('mongodb://localhost/bcrypt', {
    useNewUrlParser: true,
  })
  .then((x) => {
    console.log(`Connected to Mongo! Database name: "${x.connections[0].name}"`);
  })
  .catch((err) => {
    console.error('Error connecting to mongo', err);
  });

app.use(bodyParser.urlencoded({
  extended: true,
}));
app.use(bodyParser.json());
app.use(session({
  secret: 'basic-auth-secret',
  cookie: {
    maxAge: 60000,
  },
  store: new MongoStore({
    mongooseConnection: mongoose.connection,
    ttl: 24 * 60 * 60, // 1 day
  }),
}));
router.use((req, res, next) => {
  if (req.session.currentUser) {
    next();
  } else {
    res.redirect('/login');
  }
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.get('/secret', (req, res) => {
  if (req.session.inSession) {
    const sessionData = { ...req.session  };
    res.render('secret', {
      sessionData,
    });
  } else {
    res.render('404');
  }
});

app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', (req, res) => {
  const { user, password } = req.body;
  const saltRounds = 5;
  const salt = bcrypt.genSaltSync(saltRounds);
  const hash = bcrypt.hashSync(password, salt);
  const newUser = new User({
    user,
    password : hash,
  });

  newUser.save().then((user) => {
    console.log(user);
    res.redirect('/login');
  });
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  User.findOne({
    user: req.body.user,
  }).then((user) => {
    if (!user) {
      res.redirect('/login');
      return;
    }
    console.log(user);
    const matches = bcrypt.compareSync(req.body.password, user.password);

    if (matches) {
      req.session.inSession = true;
      req.session.user = req.body.user;

      res.redirect('secret');
    } else {
      req.session.inSession = false;
      res.redirect('login');
    }
  });
});

app.get('/loggedOut', (req, res) => {
  res.render('loggedOut');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    req.session = null;
    res.redirect('loggedOut');
  });
});

app.post('/createUser', (req, res) => {
  const saltRounds = 5;

  genericUser.user = req.body.user;

  const salt = bcrypt.genSaltSync(saltRounds);
  const hash = bcrypt.hashSync('123', salt);

  genericUser.password = hashedPassword;

  genericUser.save().then((x) => {
    req.session.inSession = true;

    res.json({
      inSessionCreated: true,
    });
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
});
