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
require('dotenv').config();
// database configuration
const dbConfig = {
  host: process.env.POSTGRES_HOST || 'db', // the database server
  port: process.env.POSTGRES_PORT || 5432, // the database port
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


const fs = require('fs'); // To work with the file system
const multer = require('multer');

// Ensure the uploads folder exists
const uploadDir = path.join(__dirname, 'public', 'recipe_uploads');
const profileDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true }); // Create the directory if it doesn't exist
}
// Check if directories exist, create them if not
if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
}

// // Set up multer for file upload
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/uploads'); // Specify the folder to store uploaded files
//   },
//   filename: (req, file, cb) => {
//     const uniqueName = `${Date.now()}-${file.originalname}`;
//     cb(null, uniqueName);
//   },
// });


// Set up storage for multer to handle both profile pictures and recipe images
const recipeImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'public/recipe_uploads'; // Store recipe images in this folder
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`; // Ensure unique filenames
    cb(null, uniqueName);
  },
});
const profilePicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const profileDir = 'uploads'; // Store profile pictures in this folder
    cb(null, profileDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`; // Ensure unique filenames
    cb(null, uniqueName);
  },
});

// Example of a route to serve static files like images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/recipe_uploads', express.static(path.join(__dirname, 'public/recipe_uploads')));


// Configure multer to store uploaded files in memory
const uploadRecipeImages = multer({ storage: recipeImageStorage });
const uploadProfilePic = multer({ storage: profilePicStorage });
//const upload = multer({ storage: multer.memoryStorage() }); // Use memory storage to access file buffer

app.post('/createProfile', auth, uploadProfilePic.single('profilePic'), async (req, res) => {
  try {
    const { bio, dietaryPref, intolerances } = req.body;
    const profilePicFile = req.file;
    const userId = req.session.user.username;

    let profilePicPath = null;

    // Save the uploaded file locally
    // if (profilePicFile) {
    //   profilePicPath = path.join('uploads', profilePicFile.originalname);
    //   fs.writeFileSync(profilePicPath, profilePicFile.buffer);
      
    // }

    if (profilePicFile) {
      profilePicPath = path.join('uploads', profilePicFile.filename); // Profile picture path
    }
    console.log('Profile Pic Path:', profilePicPath);


    // input values to arrays for PostgreSQL
    const bioArray = bio ? (Array.isArray(bio) ? `{${bio.join(',')}}` : `{${bio}}`) : null;
    const dietaryPreferences = dietaryPref
      ? (Array.isArray(dietaryPref) ? `{${dietaryPref.join(',')}}` : `{${dietaryPref}}`)
      : null;
      const intoleranceArray = intolerances
      ? (Array.isArray(intolerances) ? `{${intolerances.join(',')}}` : `{${intolerances}}`)
      : null;

    const existingProfile = await db.oneOrNone('SELECT * FROM profiles WHERE user_id = $1', [userId]);

    if (existingProfile) {
      // Dynamically build the update query
      const updates = [];
      const values = [];
      let idx = 1;

      if (bioArray !== null) {
        updates.push(`bio = $${idx}`);
        values.push(bioArray);
        idx++;
      }
      if (profilePicPath !== null) {
        updates.push(`profile_pic = $${idx}`);
        values.push(profilePicPath);
        idx++;
      }
      if (dietaryPreferences !== null) {
        updates.push(`dietary_preferences = $${idx}`);
        values.push(dietaryPreferences);
        idx++;
      }
      if (intoleranceArray !== null) {
        updates.push(`intolerances = $${idx}`);
        values.push(intoleranceArray);
        idx++;
      }

      values.push(userId); // userId as the last parameter because it is used in the WHERE clause of the query as it comes at the end of the query
      const query = `UPDATE profiles SET ${updates.join(', ')} WHERE user_id = $${idx}`;
      
      await db.query(query, values);
      console.log('Profile updated for user:', userId);
      res.redirect('/profile');
    } else {
      // Insert a new profile
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
        diet: req.session.user.dietaryPref, //example query
        intolerances: req.session.user.intolerances,
        number: 50, //number of recipes to fetch
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

//Friends page 

app.get('/friends', (req, res) => {
  const currentUser = req.session.user.username; 

  const userFriends = `
    SELECT u.username, u.first_name, u.last_name
    FROM users u
    JOIN friends f ON (f.user_id = u.username OR f.friend_id = u.username)
    WHERE (f.user_id = $1 OR f.friend_id = $1) AND u.username != $1
  `;

  db.query(userFriends, [currentUser])
    .then(result => {
      const message = req.session.message;  
      delete req.session.message;  

      res.render('pages/friends', { friends: result, message });
    })
    .catch(err => {
      console.error('Cannot display friends:', err);
      res.render('pages/friends', { message: 'Cannot display friends.' });
    });
});


//post friends 
app.post('/friends', (req, res) => {
  const { friendUsername } = req.body; 
  const currentUser = req.session.user.username;

  const searchFriends = `
    SELECT username, first_name, last_name
    FROM users
    WHERE username = $1
  `;
  
  db.query(searchFriends, [friendUsername])
    .then(result => {
      if (!result[0]) {
        req.session.message = 'Cannot find user';
        return res.redirect('/friends');
      }

      const alreadyExist = `
        SELECT 1
        FROM friends
        WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
      `;

      db.query(alreadyExist, [currentUser, friendUsername])
        .then(existingFriend => {
          if (existingFriend[0]) {
            req.session.message = 'You are already friends';
            return res.redirect('/friends');
          }

          const insertFriend = `
            INSERT INTO friends (user_id, friend_id)
            VALUES ($1, $2), ($2, $1)
          `;
          
          db.query(insertFriend, [currentUser, friendUsername])
            .then(() => {
              console.log(`Friendship inserted: ${currentUser} and ${friendUsername}`);
              res.redirect('/friends');  
            })
            .catch(err => {
              console.error('Error adding friend:', err);
              req.session.message = 'Error adding friend';
              return res.redirect('/friends');
            });
        })
        .catch(err => {
          console.error('Error checking friendship:', err);
          req.session.message = 'Error checking friendship';
          return res.redirect('/friends');
        });
    })
    .catch(err => {
      console.error('Error searching for user:', err);
      req.session.message = 'Error searching for user';
      return res.redirect('/friends');
    });
});

//My Recipes
app.get('/myRecipes',auth, async (req, res) => {
  try
  {
    const username = req.session.user.username;
    const recipeQuery = 
    `SELECT 
    r.recipe_id,
    r.recipe_name,
    r.recipe_description,
    r.recipe_difficulty,
    r.recipe_prep_time,
    r.recipe_cook_time,
    r.recipe_servings,
    r.recipe_notes,
    array_agg(DISTINCT i.image_url) AS image_urls,
    array_agg(ri_instr.instruction_text ORDER BY ri_instr.step_number) AS instructions,
    array_agg(DISTINCT CONCAT(ing.amount, ' ', ing.unit, ' ', ing.ingredient_name)) AS ingredient_description
FROM recipes r
LEFT JOIN (
    SELECT rti.recipe_id, i.image_url
    FROM recipes_to_images rti
    JOIN images i ON rti.image_id = i.image_id
) i ON r.recipe_id = i.recipe_id
LEFT JOIN (
    SELECT ri_instr.recipe_id, ri_instr.instruction_text, ri_instr.step_number
    FROM recipe_instructions ri_instr
) ri_instr ON r.recipe_id = ri_instr.recipe_id
LEFT JOIN recipe_ingredients ri_ing ON r.recipe_id = ri_ing.recipe_id
LEFT JOIN ingredients ing ON ri_ing.ingredient_id = ing.ingredient_id
WHERE r.username = $1
GROUP BY r.recipe_id
ORDER BY r.recipe_id DESC;
    `;
    
    
    const recipes = await db.query(recipeQuery, [username]);
    res.render('pages/myRecipes', {recipes: recipes});
    console.log('Recipes:', recipes);

  }
  catch(error)
  {
    console.error('Error fetching recipes: ', error);
    res.status(500).render('pages/myRecipes', {
      error: true,
      message: 'Error fetching recipes, lease try again later.',
    });
  }
});

// //Saved 
// app.get('/saved', (req, res) => {
//   res.render('pages/saved');
// });

//searchResults
app.get('/search', (req, res) => {
  res.render('pages/searchResults')
});


app.get('/api/search', async (req, res) => {
  const query = req.query.query;
  
  console.log('query:', query);
  if (!query) 
  {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try 
  {
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
        query: query,
      },
    });
    res.json(response.data);
  } 
  catch (error) 
  {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data from Spoonacular API' });
  }
});



// Get Create Recipe
app.get('/createRecipe', (req, res) => {
  res.render('pages/createRecipe');
});

//Post Create Recipe 
app.post('/createRecipe', auth, uploadRecipeImages.array('recipe_image', 5), async (req, res, next) => {
  try 
  {
    const username = req.session.user.username;
    const recipeName = req.body.recipeName;
    const description = req.body.description;
    const prepTime = req.body.prepTime;
    const difficulty = req.body.difficulty;
    const cookTime = req.body.cookTime;
    const servings = req.body.servings;
    const notes = req.body.notes;
    const ingredients = [];
    const amounts = req.body.amount;
    const units = req.body.unit;
    const ingredientNames = req.body.ingredient;
    const instructions = req.body.instructions;
    
    if (amounts && units && ingredientNames) {
      for (let i = 0; i < amounts.length; i++) {
        ingredients.push({
          id: i,
          amount: amounts[i],
          unit: units[i],
          ingredient_name: ingredientNames[i],
        });
      }
    }

    // Handle uploaded images
    const recipeImages = req.files; 
    // Prepare image paths (relative paths to store in DB)
    const recipeImagePaths = recipeImages ? recipeImages.map(file => `/recipe_uploads/${file.filename}`) : [];

    //insert new recipe
    const recipeQuery = 
      `INSERT INTO recipes (
      username,
      recipe_name, 
      recipe_description,
      recipe_prep_time,
      recipe_difficulty,
      recipe_cook_time, 
      recipe_servings,
      recipe_notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING recipe_id;`
    ;
    const newRecipe =  [username, recipeName, description, prepTime, difficulty, cookTime, servings, notes];
    console.log("newRecipe made:", newRecipe);
    const result = await db.query(recipeQuery, newRecipe);
    console.log("result made (full):", result);

    if (!result || result.length === 0) {
      throw new Error('Recipe creation failed: No recipe ID returned.');
    }

    const newRecipeId = result[0]?.recipe_id;
    if (!newRecipeId) {
      throw new Error('Recipe creation failed: No recipe ID returned!');
    }
    console.log('New Recipe ID:', newRecipeId);

    //insert new recipe ingredient(s)
    if (ingredients && Array.isArray(ingredients)) 
    {
      for (const ingredient of ingredients) 
      {
        const ingredientQuery = `
          INSERT INTO ingredients (amount, unit, ingredient_name)
          VALUES ($1, $2, $3) 
          RETURNING ingredient_id; 
        `;
        const ingredientQueryResult =  await db.query(ingredientQuery, [ingredient.amount, ingredient.unit, ingredient.ingredient_name]);
        
        const recipeIngredientQuery = `INSERT INTO recipe_ingredients (recipe_id, ingredient_id)
        VALUES ($1, $2);`;
        const ingredientId = ingredientQueryResult[0]?.ingredient_id;
        if (!ingredientId) {
          throw new Error('Failed to retrieve ingredient ID');
        }
        await db.query(recipeIngredientQuery, [newRecipeId, ingredientId]);
      }
    }

    


    //insert instruction(s)
    if (instructions && Array.isArray(instructions)) {
      let stepNumber = 1; // Instructions should have an order
      for (const instruction of instructions) {
        const instructionQuery = `
          INSERT INTO recipe_instructions (recipe_id, step_number, instruction_text)
          VALUES ($1, $2, $3);
        `;
        await db.query(instructionQuery, [newRecipeId, stepNumber, instruction]);
        stepNumber++;
      }
    }

    // Insert images into the 'images' table and associate them with the new recipe
    for (const imageUrl of recipeImagePaths) {
      const imageQuery = `
        INSERT INTO images (image_url) 
        VALUES ($1) RETURNING image_id;
      `;
      const imageResult = await db.query(imageQuery, [imageUrl]);
      const imageId = imageResult[0].image_id;

      // Associate the image with the recipe in the 'recipes_to_images' table
      const assocQuery = `
        INSERT INTO recipes_to_images (recipe_id, image_id)
        VALUES ($1, $2);
      `;
      await db.query(assocQuery, [newRecipeId, imageId]);
    }

    console.log('Ingredients:', ingredients);  // Before ingredients insertion
    console.log('Instructions:', instructions); // Before instructions insertion
    console.log('Recipe Images:', recipeImagePaths); // Before image insertion

    /*res.render('pages/myRecipes', {
      message: 'Recipe created successfully!',
      recipeId: newRecipeId,
      recipes: newRecipe,
      ingredients: ingredients,
      instructions: instructions,
      images: recipeImages,
    });*/

    res.redirect('/myRecipes');
  } 
  catch (err) 
  {
    if (err instanceof multer.MulterError) 
    {
      console.error('Multer Error:', err);
      res.render('pages/createRecipe', {
        error: true,
        message: `Upload Error: ${err.message}`
      });
    } 
    else 
    {
      //next(err); // Pass other errors to the default error handler
      console.error('Invalid Recipe Submission:', err);
      res.render('pages/createRecipe', 
      {
        error: true,
        message: 'Error creating recipe, try again'
      });
    }
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
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

// app.listen(3000);
// console.log('Server is listening on port 3000');