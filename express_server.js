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
/*const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
}; */

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

// const variableExample = 'b6UTxQ';
// urlDatabase[variableExample].longUrl;

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
  const userId = req.cookies.user_id;
  console.log('userId', userId);
  const user = users[userId];
  if (user) {
    const templateVars = {
      username: req.cookies.username,
      user: user
    };
    res.render('urls_new', templateVars);
  } else {
    res.redirect('/login');
  }
});



//make sure id is at the bottom of hard coded ones like urls/new
/* app.get("/urls/:id", (req, res) => {
  const templateVars = { id: req.params.id, longURL: "http://www.lighthouselabs.ca" };
  res.render("urls_show", templateVars);
}); */


app.get("/urls/:id", (req, res) => {
  const userId = req.cookies.user_id;
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
  if (req.cookies.user_id) {
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

const checkUserEmail = (email) => {
  // check if email is already used
  for (const userId in users) {
    const user = users[userId];
    if (user.email === email) {
      return true;
    }
  }
  return false;
};
app.post('/register', (req, res) => {
 
  const { email, password } = req.body;

  // check if email/pw are empty
  if (!email || !password) {
    res.status(400).send('the email and password fields are required!');
    return;
  }

  let userEmail = checkUserEmail(email);
  if(userEmail) {
    return res.status(400).send("the email is already there");
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
  res.cookie('user_id', userId);

  // test users object
  console.log(users);

  // redirect the user to /urls
  res.redirect('/urls');
});


app.post("/urls", (req, res) => {
  const userId = req.cookies.user_id;
  const user = users[userId];
  if (!user) {
    res.status(403).send('You need to be logged in to create new URLs!');
    return;
  }
  const shortURL = generateRandomString();
  // "xyz": {
  //   longURL: "http://wkdkdkdk",
  //   userID: kakkadfkakdf
  // }
  let temp = {
    longURL: req.body.longURL,
    userID: userId
  };
  urlDatabase[shortURL] = temp;
  console.log("NEW URL ",urlDatabase);

  res.redirect(`/urls/${shortURL}`);
});

app.post("/urls/:id/delete", (req, res) => {
  if (urlDatabase[req.params.shortURL].userID === req.cookies["userID"]) {
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
  if (req.cookies['user_id']) {
    res.redirect('/urls');
  } else {
    res.render('urls_login');
    const formTemplate = `
  `;
    res.send(formTemplate);
  }
});


app.post('/login', (req, res) => {
  const email = req.body.username;
  console.log(req.body);
  const password = req.body.password;

  if (!email || !password) {
    return res.status(401).send('please provide email & password.');
  }

  let foundUser = null;
  for (const userId in users) {
    const user = users[userId];
    if (user.email === email) {
      foundUser = user;
    }
  }
  if (!foundUser) {
    return res.status(400).send('this email address was not found.');
  }

  if (foundUser.password !== password) {
    return res.status(400).send('password is invalid');
  }

  res.cookie('user_id', foundUser.id);
  res.redirect('/urls');
});



app.post('/logout', (req, res) => {
  req.cookies = null;
  res.clearCookie('user_id');
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
  const userId = req.cookies.user_id;
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