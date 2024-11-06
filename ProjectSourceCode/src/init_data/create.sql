-- DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users (
  username VARCHAR(50) PRIMARY KEY,
  password CHAR(60) NOT NULL,
  email VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS recipes (
  recipe_id SERIAL PRIMARY KEY NOT NULL,
  recipe_name VARCHAR(75), 
  recipe_difficulty VARCHAR(100) CONSTRAINT limited_values CHECK (difficulty in ('easy', 'moderate', 'difficult', 'very_difficult'))
);

CREATE TABLE IF NOT EXISTS images (
  image_id SERIAL PRIMARY KEY NOT NULL,
  image_url VARCHAR(300) NOT NULL,
  image_caption VARCHAR(200)
);

CREATE TABLE recipes_to_images (
  image_id INT NOT NULL,
  review_id INT NOT NULL,
  FOREIGN KEY (image_id) REFERENCES images (image_id),
  -- FOREIGN KEY (image_id) REFERENCES images (image_id) ON DELETE CASCADE,
  FOREIGN KEY (recipe_id) REFERENCES recipes (recipe_id)
  -- FOREIGN KEY (recipe_id) REFERENCES recipes (recipe_id) ON DELETE CASCADE
);

CREATE TABLE favorites (
  recipe_id INT NOT NULL,
  image_id INT NOT NULL,
  FOREIGN KEY (recipe_id) REFERENCES recipes (recipes_id),
  -- FOREIGN KEY (recipe_id) REFERENCES recipes (recipes_id) ON DELETE CASCADE,
  FOREIGN KEY (images_id) REFERENCES images (image_id)
  -- FOREIGN KEY (images_id) REFERENCES images (image_id) ON DELETE CASCADE
);