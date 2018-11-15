const port = 3000
const session = require("express-session");
const express = require('express')
const router = express.Router();
const app = express()
const MongoStore = require("connect-mongo")(session);
const mongoose = require("mongoose")
const bodyParser = require('body-parser')
const bcrypt = require("bcrypt");
const path = require("path")
const User = require("./models/user")
const genericUser = new User()

mongoose
	.connect('mongodb://localhost/bcrypt', {
		useNewUrlParser: true
	})
	.then(x => {
		console.log(`Connected to Mongo! Database name: "${x.connections[0].name}"`)
	})
	.catch(err => {
		console.error('Error connecting to mongo', err)
	});

app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());
app.use(session({
	secret: "basic-auth-secret",
	cookie: {
		maxAge: 60000
	},
	store: new MongoStore({
		mongooseConnection: mongoose.connection,
		ttl: 24 * 60 * 60 // 1 day
	})
}));
router.use((req, res, next) => {
	if (req.session.currentUser) {
		next();
	} else {
		res.redirect("/login");
	}
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.get('/secret', function (req, res) {
	console.log('req.session.inSession: ' + req.session.inSession)
	if (req.session.inSession) {
		res.render('secret')
	} else {
		res.render('404')
	}
})

app.post('/login', function (req, res) {
	User.findOne({
		user: req.body.user
	}).then(found => {
		const matches = bcrypt.compareSync(req.body.password, found.password)

		console.log("matches:" + matches)

		if (matches) {
			req.session.inSession = true
			console.log('req.session.inSession: ' + req.session.inSession)

			res.status(200).json({
				userFound: true
			})
		} else {
			req.session.inSession = false
			console.log('req.session.inSession: ' + req.session.inSession)

			res.status(200).json({
				userFound: false
			})
		}
	})
})

app.get('/logout', function (req, res) {
	req.session.destroy(() => {
		res.json({
			inSession: false
		})
	})
})

app.post('/createSession', function (req, res) {
	const saltRounds = 5;

	genericUser.user = "dani"
	genericUser.password = "123"

	const salt = bcrypt.genSaltSync(saltRounds);
	const hash1 = bcrypt.hashSync(genericUser.password, salt);

	genericUser.password = hash1

	genericUser.save().then(x => {
		req.session.inSession = true

		res.json({
			inSessionCreated: true
		})
	})
})

app.listen(port, function () {
	console.log(`Example app listening on port ${port}!`)
})