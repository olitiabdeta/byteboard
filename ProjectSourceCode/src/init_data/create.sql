-- DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users (
  username VARCHAR(50) PRIMARY KEY,
  password CHAR(60) NOT NULL,
  email VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS recipes (
  recipe_id SERIAL PRIMARY KEY NOT NULL,
  recipe_name VARCHAR(75), 
  recipe_difficulty VARCHAR(100) CONSTRAINT limited_values CHECK (recipe_difficulty in ('easy', 'moderate', 'difficult', 'very_difficult'))
);

CREATE TABLE IF NOT EXISTS images (
  image_id SERIAL PRIMARY KEY NOT NULL,
  image_url VARCHAR(300) NOT NULL,
  image_caption VARCHAR(200)
);

CREATE TABLE recipes_to_images (
  image_id INT NOT NULL,
  recipe_id INT NOT NULL,
  FOREIGN KEY (image_id) REFERENCES images (image_id),
  -- FOREIGN KEY (image_id) REFERENCES images (image_id) ON DELETE CASCADE,
  FOREIGN KEY (recipe_id) REFERENCES recipes (recipe_id)
  -- FOREIGN KEY (recipe_id) REFERENCES recipes (recipe_id) ON DELETE CASCADE
);

CREATE TABLE favorites (
  recipe_id INT NOT NULL,
  image_id INT NOT NULL,
  FOREIGN KEY (recipe_id) REFERENCES recipes (recipe_id),
  -- FOREIGN KEY (recipe_id) REFERENCES recipes (recipes_id) ON DELETE CASCADE,
  FOREIGN KEY (image_id) REFERENCES images (image_id)
  -- FOREIGN KEY (images_id) REFERENCES images (image_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comments (
  comment_id SERIAL PRIMARY KEY NOT NULL,
  recipe_id INT NOT NULL,
  username VARCHAR(50) NOT NULL,
  comment_text TEXT NOT NULL,
  comment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipe_id) REFERENCES recipes (recipe_id),
  -- FOREIGN KEY (recipe_id) REFERENCES recipes (recipe_id) ON DELETE CASCADE,
  FOREIGN KEY (username) REFERENCES users (username)
  -- FOREIGN KEY (username) REFERENCES users (username) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ingredients (
  ingredient_id SERIAL PRIMARY KEY NOT NULL,
  ingredient_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  recipe_id INT NOT NULL,
  ingredient_id INT NOT NULL,
  quantity VARCHAR(50),
  FOREIGN KEY (recipe_id) REFERENCES recipes (recipe_id),
  -- FOREIGN KEY (recipe_id) REFERENCES recipes (recipe_id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients (ingredient_id),
  -- FOREIGN KEY (ingredient_id) REFERENCES ingredients (ingredient_id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, ingredient_id)
);
