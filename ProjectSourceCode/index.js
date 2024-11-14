// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcryptjs'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part C.
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'src', 'resources')));
app.use(express.static(__dirname + '/'));

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/src/views/layouts',
  partialsDir: __dirname + '/src/views/partials',
});

console.log(__dirname, path.join(__dirname, 'src', 'views'))
app.set('views', path.join(__dirname, 'src', 'views'));
app.use(express.static(path.join(__dirname, 'resources'))); 

// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
 //app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************


//redirect to login when website is loaded
app.get('/', (req, res) => {
  res.redirect('/login'); 
});

// Middleware to set the loggedIn flag in your Handlebars template
app.use((req, res, next) => {
  res.locals.loggedIn = req.session.user ? true : false;
  res.locals.profilePic = req.session.user ? req.session.user.profilePic : '';
  next();
});

// Home page
app.get('/home', (req, res) => {
  res.render('pages/home');
});

// Register page
app.get('/register', (req, res) => {
  res.render('pages/register');
});

// Display login page 
app.get('/login', (req, res) => {
    res.render('pages/login');
  });

//Friends
app.get('/friends', (req, res) => {
  res.render('pages/friends');
});
//Saved 
app.get('/saved', (req, res) => {
  res.render('pages/saved');
});
//Create Recipe
app.get('/createRecipe', (req, res) => {
  res.render('pages/createRecipe');
});
// Create Profile 
app.get('/createProfile', (req, res) => {
  res.render('pages/createProfile');
});

// Register
app.post('/register', async (req, res) => {
  //hash the password using bcrypt library
  try{
  const username = req.body.username;
  const hash = await bcrypt.hash(req.body.password, 10);
  const email = req.body.email;
  const first_name = req.body.firstname;
  const last_name = req.body.lastname;
  
  
  // To-DO: Insert username and hashed password into the 'users' table
  let something = await db.any('INSERT INTO users (username, password, email, first_name, last_name) VALUES($1, $2, $3, $4, $5)', [username, hash, email, first_name, last_name]);
    console.log(hash);
  console.log(something);
  if(something){
  res.redirect('/login');
  }
  } catch{
  res.redirect('/register');
  }
  });
  app.get('/login', (req, res) => {
  res.render('pages/login'); // Render login.hbs, no initial message
  });



  // POST route for login
  app.post('/login', async (req, res) => {
    try {
    const { username, password } = req.body;
    
    
    // Find the user in the database
    const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [username]);
    console.log(user);
    if (!user) {
    // if not found
    return res.redirect('/register');
    }
    
    
    // Compare the provided password with the hashed password in the database
    const match = await bcrypt.compare(password, user.password);
    
    
    if (!match) {
    //if not corect
    return res.render('pages/login', { message: 'Incorrect username or password.' }); // /login ->pages/login
    } 
    
    // Save user details
    req.session.user = user;
    req.session.save();
    
    
    // redirect to the home route
    return res.redirect('/home');
    } catch (error) {
    console.error('Login error:', error);
    return res.render('pages/login', { message: 'An error occurred. Please try again.' });
    }
    });
   
    // Authentication Middleware.
    const auth = (req, res, next) => {
    if (!req.session.user) {
    // Default to login page.
    return res.redirect('/login');
    }
    next();
    };


  // Logout route
  app.get('/logout', (req, res) => {
  // Destroy the session
  req.session.destroy((err) => {
  if (err) {
  console.error('Session destruction error:', err);
  return res.redirect('/');
  }
  res.render('pages/logout', { message: 'Logged out Successfully' });
  });
  });


// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
  


app.listen(3000);
console.log('Server is listening on port 3000');