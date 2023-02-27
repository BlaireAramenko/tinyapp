// searches for user in database by email and returns user if they exist in the database
const getUserByEmail = function(email, database) {
  for (const userId in database) {
    const user = database[userId];
    if (user.email === email) {
      return user;
    }
  }
  return undefined;
};

// generates a random string
const generateRandomString = function() {
  const alphanumChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += alphanumChars.charAt(Math.floor(Math.random() * alphanumChars.length));
  }
  return result;
};

// fiters database of URLS by user id
const urlsForUser = (id, database) => {
  const userURLs = {};
  for (let url in database) {
    if (id === database[url].userID) {
      userURLs[url] = database[url];
    }
  }
  return userURLs;
};


module.exports = { getUserByEmail, generateRandomString, urlsForUser };
