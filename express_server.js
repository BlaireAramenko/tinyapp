const express = require("express");
const morgan = require('morgan');
const bodyParser = require('body-parser');
const bcrypt = require("bcryptjs");
const { getUserByEmail, generateRandomString, urlsForUser } = require('./helpers');
const { users, urlDatabase } = require('./database.js');
// const cookieParser = require('cookie-parser'); replaced with cookie session
const cookieSession = require('cookie-session');
const app = express();
const PORT = 8080;

app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2'],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

app.set("view engine", "ejs");
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.urlencoded({ extended: false }));

// GET ROUTES


app.get("/", (req, res) => {
  if (req.session.user_id) {
    res.redirect("/urls");
  } else {
    res.redirect("/login");
  }
});


app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});


app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});


app.get('/urls/new', (req, res) => {
  const userId = req.session.user_id;
  console.log('userId', userId);
  const user = users[userId];
  if (user) {
    const templateVars = {
      username: req.session.username,
      user: user
    };
    res.render('urls_new', templateVars);
  } else {
    res.redirect('/login');
  }
});


app.get('/register', (req, res) => {
  if (req.session.user_id) {
    res.redirect('/login');
  } else {
  // registration form
    const formTemplate = `
    <form method="POST" action="/register">
      <label for="email">Email:</label>
      <input type="email" id="email" name="email" required>
      <br>
      <label for="password">Password:</label>
      <input type="password" id="password" name="password" required>
      <br>
      <input type="submit" value="Register">
    </form>
  `;
    res.send(formTemplate);
  }
});


app.get("/urls/:id", (req, res) => {
  const userId = req.session.user_id;
  const user = users[userId];
  const shortURL = req.params.id;
  const longURL = urlDatabase[shortURL] && urlDatabase[shortURL].longURL;
  const templateVars = {
    user,
    shortURL,
    longURL
  };
  res.render("urls_show", templateVars);
});


app.get('/login', (req, res) => {
  if (req.session.user_id) {
    res.redirect('/urls');
  } else {
    res.render('urls_login');
    const formTemplate = `
  `;
    res.send(formTemplate);
  }
});


app.get("/u/:id", (req, res) => {
  console.log(req.params.id);
  const longURL = urlDatabase[req.params.id].longURL;
  console.log(urlDatabase['i3BoGr'].longURL);
  if (!longURL) {
    res.status(404).send('<h1>404 Page Not Found</h1>');
  } else {
    res.redirect(longURL);
  }
});


app.get("/urls", (req, res) => {
  const userId = req.session.user_id;
  const user = users[userId];
  if (!user) {
    res.status(401).send("Uh oh! Log in or register to view your URLs.");
  } else {
    const urls = urlsForUser(userId, urlDatabase);
    const templateVars = { urls, user };
    res.render("urls_index", templateVars);
  }
});

// POST ROUTES

app.post('/register', (req, res) => {
 
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).send('The email and password fields are required.');
    return;
  }

  //const userEmail = helpers.getUserByEmail(email, users);
  const userEmail = getUserByEmail(email, users);
  if (userEmail) {
    return res.status(400).send("The email already exists.");
  }

  // generate new random ID for the user
  const userId = generateRandomString();

  const hashedPassword = bcrypt.hashSync(password, 10);
  users[userId] = {
    id: userId,
    email: email,
    password: hashedPassword // updated to secure password
  };


  req.session.user_id = userId;

  // redirect the user to /urls
  res.redirect('/login');
});


app.post("/urls", (req, res) => {
  const userId = req.session.user_id;
  const user = users[userId];
  if (!user) {
    res.status(403).send('Log in to create new URLs.');
    return;
  }
  const shortURL = generateRandomString();

  let temp = {
    longURL: req.body.longURL,
    userID: userId
  };
  urlDatabase[shortURL] = temp;
  console.log("NEW URL ",urlDatabase);

  res.redirect(`/urls/${shortURL}`);
});

app.post("/urls/:id/delete", (req, res) => {
  if (urlDatabase[req.params.shortURL].userID === req.session["userID"]) {
    delete urlDatabase[req.params.shortURL];
    res.redirect("/urls");
  } else {
    res.status(403).send("Not allowed.");
  }
});

app.post("/urls/:id", (req, res) => {
  const shortURL = req.params.id;
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect('/urls');
});


app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = getUserByEmail(email, users);
  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.user_id = user.id;
    res.redirect('/urls');
  } else {
    res.status(403).send('Oops! Invalid email or password. Try again.');
  }

  res.session('user_id', user.id);
  res.redirect('/urls');
});


app.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
});


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});