/* Insert the values into corresponding columns in the table products. password=abcd*/
INSERT INTO users (username, password,  email, first_name, last_name) VALUES
  ('suus', '$2a$10$LVgItd92Jw6FtDUCSg4yzOtOUUlepE/i5nevVNxrNRygZvX6i0ge6', 'sumeyyeustunel05@gmail.com', 'Sumeyye', 'Ustunel');

INSERT INTO friends (user_id, friend_id, status)
VALUES
  ('suus', 'bob'),
  ('alice', 'charlie');