const express = require("express");
const morgan = require('morgan');
const bodyParser = require('body-parser');
const app = express();
const PORT = 8080; // default port 8080
const cookieParser = require('cookie-parser');

const generateRandomString = function() {
  const alphanumChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += alphanumChars.charAt(Math.floor(Math.random() * alphanumChars.length));
  }
  return result;
};

app.set("view engine", "ejs");

app.use(morgan('dev'));

app.use(cookieParser());

app.use(express.urlencoded({ extended: false }));

app.use(bodyParser.urlencoded({ extended: false }));

// database
const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk",
  },
};
const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

app.get("/", (req, res) => {
  res.send("Homepage!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});


app.get("/urls", (req, res) => {
  //console.log("request object", req);
  const templateVars = { urls: urlDatabase, username: req.cookies.username };
  res.render("urls_index", templateVars);
});

app.get('/urls/new', (req, res) => {
  const username = req.cookies["username"];
  res.render('urls_new', { username });
});

app.get("/urls/:id", (req, res) => {
  const templateVars = { id: req.params.id, longURL: "http://www.lighthouselabs.ca" };
  res.render("urls_show", templateVars);
});



app.get('/register', (req, res) => {
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
});

app.post('/register', (req, res) => {
  const { email, password } = req.body;

  // check if email/pw are empty
  if (!email || !password) {
    res.status(400).send('The email and password fields are required!');
    return;
  }

  // check if email is already used
  for (const userId in users) {
    const user = users[userId];
    if (user.email === email) {
      res.status(400).send('This email address is already in use!');
      return;
    }
  }

  // generate new random ID for the user
  const userId = generateRandomString();

  // add new user to the users object
  users[userId] = {
    id: userId,
    email: email,
    password: password // not a secure way to store pw but will update later
  };

  // set user_id cookie to newly generated user ID
  res.cookie('username', userId);

  // test users object
  console.log(users);

  // redirect the user to /urls
  res.redirect('/urls');
});


app.post("/urls", (req, res) => {
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect(`/urls/${shortURL}`);
});

app.post("/urls/:id/delete", (req, res) => {
  const shortURL = req.params.id;
  delete urlDatabase[shortURL];
  res.redirect('/urls');
});

app.post("/urls/:id", (req, res) => {
  const shortURL = req.params.id;
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect('/urls');
});

app.get('/login', (req, res) => {
  res.render('urls_login');
  const formTemplate = `
  `;
  res.send(formTemplate);
});

app.post('/login', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (!username || !password) {
    return res.status(401).send('please provide username & password.');
  }

  let foundUser = null;
  for (const userId in users) {
    const user = users[userId];
    if (user.username === username) {
      foundUser = user;
    }
  }
  if (!foundUser) {
    res.status(400).send('this username was not found.');
  }

  if (foundUser.password !== password) {
    return res.status(400).send('password is invalid');
  }
  res.cookie('username', username);
  res.redirect('/urls');
});

/*
app.post('/login', (req, res) => {
  const { username } = req.body;
  res.cookie('username', username);
  res.redirect('/urls');
});*/

app.post('/logout', (req, res) => {
  res.clearCookie('username');
  res.redirect('/urls');
});

app.get("/u/:id", (req, res) => {
  const longURL = urlDatabase[req.params.id];
  res.redirect(longURL);
});

app.get('/urls', (req, res) => {
  const templateVars = {
    username: req.cookies.username,
    urls: urlDatabase
  };
  res.render('urls_index', templateVars);
});

app.get('/urls/new', (req, res) => {
  const templateVars = {
    username: req.cookies.username
  };
  res.render('urls_new', templateVars);
});



app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});