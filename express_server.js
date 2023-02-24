const express = require("express");
const morgan = require('morgan');
const bodyParser = require('body-parser');
const app = express();
const PORT = 8080; // default port 8080
// const cookieParser = require('cookie-parser'); replaced with cookie session
const cookieSession = require('cookie-session');
const helpers = require('./helpers');


app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2'],

  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

const bcrypt = require("bcryptjs");

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

//app.use(cookieParser());

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
  b6UTxQ: {
    longURL: "http://www.lighthouselabs.ca",
    userID: "aJ48lW",
  },
  i3BoGr: {
    longURL: "http://www.google.com",
    userID: "aJ48lW",
  },
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


app.get('/register', (req, res) => {
  if (req.session.user_id) {
    res.redirect('/urls');
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



app.post('/register', (req, res) => {
 
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).send('the email and password fields are required!');
    return;
  }

  const userEmail = helpers.getUserByEmail(email, users);
  if (userEmail) {
    return res.status(400).send("the email already exists.");
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
  res.redirect('/urls');
});



app.post("/urls", (req, res) => {
  const userId = req.session.user_id;
  const user = users[userId];
  if (!user) {
    res.status(403).send('you need to be logged in to create new URLs!');
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
    res.status(403).send("not allowed");
  }
});

app.post("/urls/:id", (req, res) => {
  const shortURL = req.params.id;
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect('/urls');
});

app.get('/login', (req, res) => {
  if (req.session['user_id']) {
    res.redirect('/urls');
  } else {
    res.render('urls_login');
    const formTemplate = `
  `;
    res.send(formTemplate);
  }
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  
  const user = helpers.getUserByEmail(email, users);
  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.user_id = user.id;
    res.redirect('/urls');
  } else {
    res.status(403).send('invalid email or password');
  }

  res.session('user_id', user.id);
  res.redirect('/urls');
});


app.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
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

const urlsForUser = (id, db) => {
  const userURLs = {};
  for (let url in db) {
    if (id === db[url].userID) {
      userURLs[url] = db[url];
    }
  }
  return userURLs;
};

app.get("/urls", (req, res) => {
  const userId = req.session.user_id;
  const user = users[userId];
  if (!user) {
    res.status(401).send("please log in or register to view your URLs.");
  } else {
    const urls = urlsForUser(userId, urlDatabase);
    const templateVars = { urls, user };
    res.render("urls_index", templateVars);
  }
});


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});