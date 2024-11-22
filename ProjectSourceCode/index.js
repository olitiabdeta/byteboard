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
const { error } = require('console');
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
  res.redirect('/home'); 
});

// Middleware to set the loggedIn flag in your Handlebars template
app.use((req, res, next) => {
  res.locals.loggedIn = req.session.user ? true : false;
  res.locals.profilePic = req.session.user ? req.session.user.profilePic : '';
  next();
});

//GET login page 
app.get('/login', (req, res) => {
  res.render('pages/login');
});

//POST login
app.post('/login', async (req,res) =>{
  try
  {
    const username = req.body.username;
    const password = req.body.password;

    const userQuery = 'SELECT * FROM users WHERE username = $1';
    const userResult = await db.oneOrNone(userQuery, [username]);

    if(userResult)
    {
      const user = userResult;

      //compare the entered password with the hashed password from the database
      const match = await bcrypt.compare(password, user.password);

      if(match)
      {
        req.session.user = user;
        req.session.save();
        return res.redirect('/home');
      }
      else
      {
        return res.render('pages/login', {message: "Incorrect username or password.", error: true});
      }
    }
    //if user is not found, redirect to register page
    else
    {
      return res.redirect('/register');
    }
  }
  catch(error)
  {
    console.error("Login error:", error);
    res.render('pages/login', {message: "An error occured during login. Please try again.", error: true});
  }
});


//GET Register page
app.get('/register', (req, res) => {
  res.render('pages/register');
});

//POST Register
app.post('/register', async (req, res) => {
  //hash the password using bcrypt library
  try
  {
    const username = req.body.username;
    const password = req.body.password;
    const hashedPassword = await bcrypt.hash(password, 10);
    const email = req.body.email;
    const first_name = req.body.firstname;
    const last_name = req.body.lastname;
    
    // To-DO: Insert username and hashed password into the 'users' table
    //let something = await db.any('INSERT INTO users (username, password, email, first_name, last_name) VALUES($1, $2, $3, $4, $5)', [username, hash, email, first_name, last_name]);
    
    const registeredUserQuery = `SELECT * FROM users WHERE username = $1 OR email = $2`;
    const registeredUser = await db.oneOrNone(registeredUserQuery, [username, email]);
    
    
    // console.log(hashedPassword);
    // console.log(registeredUser);
    if(registeredUser)
    {
      return res.render('pages/register', 
      {
        message: 'An account with this username or email already exists. Please log in.',
        error: true
      });
    }

    const query = `INSERT INTO users (username, password, email, first_name, last_name) VALUES($1, $2, $3, $4, $5)`;
    const values = [username, hashedPassword, email, first_name, last_name];
    await db.none(query, values);

    res.redirect('/login');
  } 
  catch(error)
  {
    console.error("Error inserting user:", error);

    //if insertion failsm reirect back to the register page
    res.render('pages/register', 
    {
      message: 'An error occurred during registration. Please try again.',
      error: true
    });
  }
});

// Authentication Middleware.
const auth = (req, res, next) => {
  if (!req.session.user) 
  {
    // Default to login page.
    return res.redirect('/login');
  }
  next();
};


app.use(auth);

// Create Profile page
app.get('/createProfile', auth, (req, res) => {
  res.render('pages/createProfile', { 
    username: req.session.user.username,
    dietaryPref: req.session.user.dietaryPref,
    intolerances: req.session.user.intolerances});
});

// const multer = require('multer');
// // // Configure multer to store uploaded files
// // const upload = multer({ dest: 'uploads/' }); // Adjust the destination as needed

// // app.post('/createProfile', auth, upload.single('profilePic'), async (req, res) => {
// //   try 
// //   {
// //     const {bio} = req.body;
// //     const profilePic = req.file ? req.file.filename : null; //get the filename of the uploaded image
// //     const userId = req.session.user.username;
// //     //const { bio, favCuisine, customCuisine, dietaryPref, customPref } = req.body;

// //     /*const profilePic = req.body.profilePic; // Adjust if using file upload handling
// //     const favoriteCuisines = Array.isArray(favCuisine) ? favCuisine.join(', ') : favCuisine || '';
// //     const dietaryPreferences = Array.isArray(dietaryPref) ? dietaryPref.join(', ') : dietaryPref || '';*/
// //     const dietaryPref = Array.isArray(req.body.dietaryPref) ? req.body.dietaryPref.join(', ') : req.body.dietaryPref;
// //     const intolerances = Array.isArray(req.body.intolerances) ? req.body.intolerances.join(', ') : req.body.intolerances;


// //     //check if user already has a profile
// //     const result = await db.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
    
// //     if(result.rows.length > 0)
// //     {
// //       await db.query(
// //       `UPDATE profiles
// //       SET bio = $1, profile_pic = $2, dietary_preferences = $3, intolerances = $4
// //       WHERE user_id = $5`,
// //       [bio, profilePic, dietaryPref, intolerances, userId]);

// //       res.redirect('/profile');
// //     }
// //     else
// //     {
// //       //insert new profile
// //       await db.query(
// //       `INSERT INTO profiles (user_id, bio, profile_pic, dietary_preferences, intolerances)
// //       VALUES ($1, $2, $3, $4, $5)`, 
// //       [userId, bio, profilePic, dietaryPref, intolerances]);
      
// //       res.redirect('/profile')
// //     }
// //   } 
// //   catch (error) 
// //   {
// //     console.error('Profile creation error:', error);
// //     res.render('pages/createProfile', 
// //     {
// //       error: true,
// //       message: 'An error occurred while creating your profile. Please try again.'
// //     });
// //   }
// // });

const fs = require('fs'); // To work with the file system
const multer = require('multer');

// Configure multer to store uploaded files in memory
const upload = multer({ storage: multer.memoryStorage() }); // Use memory storage to access file buffer

app.post('/createProfile', auth, upload.single('profilePic'), async (req, res) => {
  try {
    const { bio, dietaryPref, intolerances } = req.body; 
    const profilePicFile = req.file;
    const userId = req.session.user.username; 

    let profilePicPath = null;

    // saving the uploaded file locally once inserted
    if (profilePicFile) {
      profilePicPath = path.join(__dirname, '/uploads', profilePicFile.originalname);
      fs.writeFileSync(profilePicPath, profilePicFile.buffer);
    }

    // converting them into arrays for Postgres to read
    const bioArray = Array.isArray(bio) ? `{${bio.join(',')}}` : `{${bio}}`;
    const dietaryPreferences = Array.isArray(dietaryPref) ? `{${dietaryPref.join(',')}}` : `{${dietaryPref || ''}}`;
    const intoleranceArray = Array.isArray(intolerances) ? `{${intolerances.join(',')}}` : `{${intolerances || ''}}`;
    const existingProfile = await db.oneOrNone('SELECT * FROM profiles WHERE user_id = $1', [userId]);

    if (existingProfile) {
      // to update an existing profle 
      await db.query(
        `UPDATE profiles
        SET bio = COALESCE($1, bio),
            profile_pic = COALESCE($2, profile_pic),
            dietary_preferences = COALESCE($3, dietary_preferences),
            intolerances = COALESCE($4, intolerances)
        WHERE user_id = $5`,
        [bioArray, profilePicPath, dietaryPreferences, intoleranceArray, userId]
      );
      console.log('Profile updated for user:', userId);
      res.redirect('/profile');
    } else {
      // insert a new profile
      await db.query(
        `INSERT INTO profiles (user_id, bio, profile_pic, dietary_preferences, intolerances)
        VALUES ($1, $2, $3, $4, $5)`,
        [userId, bioArray, profilePicPath, dietaryPreferences, intoleranceArray]
      );
      res.redirect('/profile');
    }
  } catch (error) {
    console.error('Profile creation error:', error);
    res.render('pages/createProfile', {
      error: true,
      message: 'An error occurred while creating your profile. Please try again.',
    });
  }
});


// Profile page
app.get('/profile', auth, async (req, res) => {
  try {
    const userId = req.session.user.username; // Get the username from the session

    const profileQuery = `
      SELECT u.username AS user_id, p.bio, p.profile_pic, p.dietary_preferences, p.intolerances
      FROM users u
      LEFT JOIN profiles p ON u.username = p.user_id
      WHERE u.username = $1
    `;

    const profile = await db.oneOrNone(profileQuery, [userId]);

    if (!profile) {
      // If no profile exists, render a message to the user
      return res.render('pages/profile', {
        message: 'No profile found. Please create one!',
        error: true,
      });
    }

    // Render the profile page with retrieved data
    res.render('pages/profile', { profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.render('pages/profile', {
      message: 'An error occurred while fetching your profile.',
      error: true,
    });
  }
});


// Home page
app.get('/home', (req, res) => {
  //display username if logged in, display guest if not
  const username = req.session?.user?.username || 'Guest';
  res.render('pages/home', {username})
});

//discover page
app.get('/discover', async(req, res) => {
  try
  {
    //fetching a list of recipes
    const searchResponse = await axios({
      url: `https://api.spoonacular.com/recipes/complexSearch`,
      method: 'GET',
      headers: 
      {
        'Accept-Encoding': 'application/json',
      },
      params: 
      {
        apiKey: process.env.API_KEY,
        query: 'pasta', //example query
        number: 10, //number of recipes to fetch
      },
    });

    //extract recipe IDs from the search results
    const recipeIds = searchResponse.data.results.map(recipe => recipe.id);

    //fetching detailed information for each recipe using its ID
    const detailedRecipes = await Promise.all(
      recipeIds.map(async id => {
        try
        {
          const detailedResponse = await axios({
            url: `https://api.spoonacular.com/recipes/${id}/information`,
            method: 'GET',
            headers:
            {
              'Accept-Encoding': 'application/json',
            },
            params:
            {
              apiKey: process.env.API_KEY,
            },
          });
          return detailedResponse.data; //return the full recipe details
        }
        catch(error)
        {
          console.error('Error fetching detals for recipe ID ${id}:', error.message);
          return null; //handle errors gracefully be skipping the recipe
        }
      })
    );

    //filter out null responses
    const results = detailedRecipes.filter(recipe => recipe != null).map(recipe => ({
      name: recipe.title,
      description: recipe.summary || 'No description available',
      prepTime: recipe.preparationMinutes || '0',
      //TODO: no difficulty in API
      cookTime: recipe.cookingMinutes || '0',
      servings: recipe.servings || 'N/A',
      ingredients: recipe.extendedIngredients.map(ing => ing.original) || [], // list of ingredients
      instructions: recipe.instructions || 'No instructions available.',
      image: recipe.image || '/default-recipe-image.jpg', //TODO: make a default photo
      cuisineTags: recipe.cuisines?.join(', ') || 'No cuisine info available.',
      diets: recipe.diets.join(', ') || 'No diet info available.',
      allergens: recipe.cuisines.join(', ') || 'No allergen info available.',
      totalTime: recipe.readyInMinutes || 'N/A',
      recipeURL: recipe.spoonacularSourceUrl
    }));

    //render page with detailed recipes
    res.render('pages/discover', { results });
  }
  catch(error)
  {
    console.error('Error fetching recipes:', error.message);
    res.render('pages/discover', {
      results: [],
      message: 'Error fetching recipe. Please try again later.',
    });
  }
});

//Friends
app.get('/friends', (req, res) => {
  res.render('pages/friends');
});
//Saved 
app.get('/saved', (req, res) => {
  res.render('pages/saved');
});

//searchResults
app.get('/search', (req, res) => {
  res.render('pages/searchResults')
});


// Get Create Recipe
app.get('/createRecipe', (req, res) => {
  res.render('pages/createRecipe');
});

//Post Create Recipe 
app.post('/createRecipe', auth,  async (req, res) => {
  try 
  {
    const recipeName = req.body.recipeName;
    const description = req.body.description;
    const prepTime = req.body.prepTime;
    const difficulty = req.body.difficulty;
    const cookTime = req.body.cookTime;
    const servings = req.body.servings;
    const notes = req.body.notes;
    const ingredients = req.body.ingredients;
    const instructions = req.body.instructions;

      //insert new recipe
const recipeQuery = 
      `INSERT INTO recipes (recipe_name, recipe_description ,
        recipe_prep_time ,
        recipe_difficulty,
        recipe_cook_time, 
        recipe_servings,
        recipe_notes,
        ingredients, 
        instructions )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING recipe_id;`
      ;
      const newRecipe =  [recipeName, description, prepTime, difficulty, cookTime, servings, notes, ingredients, instructions]
      const result = await db.query(recipeQuery, newRecipe);

       const newRecipeId = result[0].recipe_id;
      res.render('pages/saved', {
        message: 'Recipe created successfully!',
        recipeId: newRecipeId,
      });
  } //docker-compose logs web
  catch (error) 
  {
    console.error('Invalid Recipe Submission:', error);
    res.render('pages/createRecipe', 
    {
      error: true,
      message: 'Error creating recipe, try again'
  });
  }
});





// Logout route
app.get('/logout', (req, res) => {
  try {
    req.session.destroy(() => {
      res.redirect('/login');
    });
  } catch (error) {
    console.error('Error logging out:', error);
    res.redirect('/home');
  }
});




// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
  
app.listen(3000);
console.log('Server is listening on port 3000');