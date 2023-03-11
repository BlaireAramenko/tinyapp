const express = require("express");
const morgan = require('morgan');
const bodyParser = require('body-parser');
const bcrypt = require("bcryptjs");
const { getUserByEmail, generateRandomString, urlsForUser } = require('./helpers');
const { users, urlDatabase } = require('./database.js');
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
  const templateVars = {
    username: req.session.username,
    user: undefined
  };
  if (req.session.user_id) {
    res.redirect('/login');
  } else {
    res.render("urls_registration", templateVars);

  }
});


app.get("/urls/:id", (req, res) => {
  const userId = req.session.user_id;
  const user = users[userId];
  const shortURL = req.params.id;
  const longURL = urlDatabase[shortURL] && urlDatabase[shortURL].longURL;
  if (!longURL) {
    res.status(404).send('URL not found');
    return;
  }
  const templateVars = {
    user,
    shortURL,
    longURL
  };
  res.render("urls_show", templateVars);
});


app.get('/login', (req, res) => {
  const templateVars = {
    user: undefined
  };
  if (req.session.user_id) {
    res.redirect('/urls');
  } else {
    res.render('urls_login', templateVars);
  }
});


app.get("/u/:id", (req, res) => {
  const url = urlDatabase[req.params.id];
  console.log('url', url);
  if (!url || !url.longURL) {
    console.log('url missing error');
    res.status(404).send('<h1>404 Page Not Found</h1>');
  } else {
    console.log('I have my url');
    const longURL = url.longURL;
    console.log(longURL);
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
    console.log('urls', urls);
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
  } if (getUserByEmail(email, users)) {
    res.status(400).send("The email already exists.");
    return;
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
  res.redirect('urls');
});





app.post("/urls", (req, res) => {
  const userId = req.session.user_id;
  const user = users[userId];
  if (!user) {
    res.status(403).send('Log in to create new URLs.');
    return;
  }
  const shortURL = generateRandomString();
  let newLongURL = req.body.longURL;
  if (newLongURL.substring(0, 7) !== 'http://') {
    newLongURL = 'http://' + newLongURL;
  }
  let temp = {
    longURL: newLongURL,
    userID: userId
  };
  urlDatabase[shortURL] = temp;
  console.log("NEW URL ", urlDatabase);

  res.redirect("/urls");
});

app.post("/urls/:id/delete", (req, res) => {
  console.log("req.params.id", req.params.id);
  console.log("urlDatabase", urlDatabase);
  console.log("req.session", req.session);
  if (urlDatabase[req.params.id].userID === req.session.user_id) {
    delete urlDatabase[req.params.id];
    res.redirect("/urls");
  } else {
    res.status(403).send("Not allowed.");
  }
});

//edit route
app.post("/urls/:id", (req, res) => {
  console.log("req.params.id", req.params.id);
  console.log("urlDatabase", urlDatabase);
  console.log("req.session", req.session);
  const shortURL = req.params.id;
  urlDatabase[shortURL] = {
    //spread operator
    ...urlDatabase[shortURL],
    longURL: req.body.longURL
  };
  console.log("urlDatabase[shortURL]", urlDatabase[shortURL]);
  res.redirect('/urls');
});


/* app.post("/urls/:id", (req, res) => {
  const shortURL = req.params.id;
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect('/urls');
}); */


app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = getUserByEmail(email, users);
  console.log(email, password);
  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.user_id = user.id;
    res.redirect('/urls');
  } else {
    res.status(403).send('Oops! Invalid email or password. Try again.');
  }

  const userId = generateRandomString();

  const hashedPassword = bcrypt.hashSync(password, 10);
  users[userId] = {
    id: userId,
    email: email,
    password: hashedPassword // updated to secure password
  };


  req.session.user_id = userId;
});


app.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
});


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});