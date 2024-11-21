-- DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users (
  username VARCHAR(50) PRIMARY KEY NOT NULL,
  password CHAR(60) NOT NULL,
  email VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS recipes (
  recipe_id SERIAL PRIMARY KEY NOT NULL,
  recipe_name VARCHAR(75) NOT NULL, 
  recipe_description TEXT,
  recipe_prep_time INT CHECK (recipe_prep_time >= 0) NOT NULL, -- time in minutes
  recipe_difficulty VARCHAR(100) CONSTRAINT limited_values CHECK (recipe_difficulty IN ('easy', 'moderate', 'difficult', 'very_difficult')) NOT NULL,
  recipe_cook_time INT CHECK (recipe_cook_time >= 0) NOT NULL, -- time in minutes
  recipe_servings INT CHECK (recipe_servings > 0) NOT NULL,
  recipe_notes TEXT -- optional field for general notes
);

CREATE TABLE IF NOT EXISTS images (
  image_id SERIAL PRIMARY KEY NOT NULL,
  image_url VARCHAR(300) NOT NULL,
  image_caption VARCHAR(200)
);

-- Junction table for associating images with recipes
CREATE TABLE IF NOT EXISTS recipes_to_images (
  image_id INT NOT NULL,
  recipe_id INT NOT NULL,
  FOREIGN KEY (image_id) REFERENCES images (image_id) ON DELETE CASCADE,
  FOREIGN KEY (recipe_id) REFERENCES recipes (recipe_id) ON DELETE CASCADE
);

-- Table to store step-by-step instructions for each recipe
CREATE TABLE IF NOT EXISTS recipe_instructions (
  instruction_id SERIAL PRIMARY KEY NOT NULL,
  recipe_id INT NOT NULL,
  step_number INT NOT NULL CHECK (step_number > 0),
  instruction_text TEXT NOT NULL,
  FOREIGN KEY (recipe_id) REFERENCES recipes (recipe_id) ON DELETE CASCADE
);

-- Table to store cuisine tags
CREATE TABLE IF NOT EXISTS cuisine_tags (
  tag_id SERIAL PRIMARY KEY,
  tag_name VARCHAR(50) UNIQUE NOT NULL
);

-- Junction table for associating cuisine tags with recipes
CREATE TABLE IF NOT EXISTS recipe_cuisine_tags (
  recipe_id INT NOT NULL,
  tag_id INT NOT NULL,
  FOREIGN KEY (recipe_id) REFERENCES recipes (recipe_id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES cuisine_tags (tag_id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);

-- Table for favorite recipes with associated images
CREATE TABLE IF NOT EXISTS favorites (
  recipe_id INT NOT NULL,
  image_id INT NOT NULL,
  FOREIGN KEY (recipe_id) REFERENCES recipes (recipe_id) ON DELETE CASCADE,
  FOREIGN KEY (image_id) REFERENCES images (image_id) ON DELETE CASCADE
);

-- Table for comments on recipes
CREATE TABLE IF NOT EXISTS comments (
  comment_id SERIAL PRIMARY KEY NOT NULL,
  recipe_id INT NOT NULL,
  username VARCHAR(50) NOT NULL,
  comment_text TEXT NOT NULL,
  comment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipe_id) REFERENCES recipes (recipe_id) ON DELETE CASCADE,
  FOREIGN KEY (username) REFERENCES users (username) ON DELETE CASCADE
);

-- Table for ingredients
CREATE TABLE IF NOT EXISTS ingredients (
  ingredient_id SERIAL PRIMARY KEY NOT NULL,
  ingredient_name VARCHAR(100) NOT NULL UNIQUE
);

-- Junction table for associating ingredients with recipes
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  recipe_id INT NOT NULL,
  ingredient_id INT NOT NULL,
  quantity VARCHAR(50),
  FOREIGN KEY (recipe_id) REFERENCES recipes (recipe_id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients (ingredient_id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, ingredient_id)
);

-- Table for user-specific notes on recipes
CREATE TABLE IF NOT EXISTS user_notes (
  note_id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  recipe_id INT NOT NULL,
  note_text TEXT,
  FOREIGN KEY (username) REFERENCES users (username) ON DELETE CASCADE,
  FOREIGN KEY (recipe_id) REFERENCES recipes (recipe_id) ON DELETE CASCADE
);

-- Populate cuisine_tags with sample initial values
INSERT INTO cuisine_tags (tag_name) VALUES 
  ('Italian'), 
  ('Mexican'), 
  ('Chinese'), 
  ('Indian')
ON CONFLICT (tag_name) DO NOTHING; -- Prevents duplicate entries if run multiple times

CREATE TABLE IF NOT EXISTS profiles (
  user_id VARCHAR(50) PRIMARY KEY NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  bio TEXT,
  profile_pic VARCHAR(300),
  -- favorite_cuisines TEXT[],
  -- custom_cuisines TEXT[],
  dietary_preferences TEXT[],
  -- custom_preferences TEXT[]
  intolerances TEXT[]
);