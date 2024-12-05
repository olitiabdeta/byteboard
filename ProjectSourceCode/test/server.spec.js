// ********************** Initialize server **********************************

const server = require('../index'); //TODO: Make sure the path to your index.js is correctly added
const pgp = require('pg-promise')();
const bcrypt = require('bcryptjs');
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

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe('Server!', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        console.log(res.body);
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
    });
});

// *********************** TODO: WRITE 2 UNIT TESTCASES **************************

// ********************************************************************************

describe('Testing /register API', () => {
    beforeEach(async () => {
        const existingUser = await db.oneOrNone('SELECT * FROM users WHERE username = $1', ['existinguser']);
        if (!existingUser) {
          const testUser = {
            username: 'existinguser',
            password: await bcrypt.hash('hashedpassword', 10),
            email: 'existinguser@example.com',
            firstname: 'Existing',
            lastname: 'User'
          };
          await db.none('INSERT INTO users (username, password, email, first_name, last_name) VALUES($1, $2, $3, $4, $5)', [
            testUser.username, testUser.password, testUser.email, testUser.firstname, testUser.lastname
          ]);
        }
      });
      
      
      afterEach(async () => {
        await db.none('DELETE FROM users WHERE username = $1', ['existinguser']);
      });
      
    it('positive: should register a new user with valid input', (done) => {
      chai
        .request(server)
        .post('/register')
        .send({
          username: 'testuser',
          password: 'securepassword', // Ensure this password gets hashed
          email: 'testuser@example.com',
          firstname: 'Test',
          lastname: 'User'
        })
        .end((err, res) => {
          expect(res).to.have.status(200); // Check that the API returns status 200
          //expect(res).to.redirectTo(/\/login$/); // Ensure the redirection goes to /login
          done();
        });
    });

    it('negative: should not register a user with an existing username or email', (done) => {
        chai
          .request(server)
          .post('/register')
          .send({
            username: 'existinguser', // Ensure this user exists in the database already
            password: 'newpassword',
            email: 'existinguser@example.com', // Ensure this email exists as well
            firstname: 'New',
            lastname: 'User'
          })
          .end((err, res) => {
            // Check for the 400 status code for error
            expect(res).to.have.status(400);
            
            // Verify the error message in JSON response
            expect(res.body.error).to.equal('An account with this username or email already exists. Please log in.');
            
            done();
          });
      });
  });

  describe('Testing /login API', () => {
    // Set up test user data
    beforeEach(async () => {
      const existingUser = await db.oneOrNone('SELECT * FROM users WHERE username = $1', ['testuser']);
      if (!existingUser) {
        const testUser = {
          username: 'testuser',
          password: await bcrypt.hash('correctpassword', 10),
          email: 'testuser@example.com',
          firstname: 'Test',
          lastname: 'User'
        };
        await db.none('INSERT INTO users (username, password, email, first_name, last_name) VALUES($1, $2, $3, $4, $5)', [
          testUser.username, testUser.password, testUser.email, testUser.firstname, testUser.lastname
        ]);
      }
    });
  
    // Clean up after the test
    afterEach(async () => {
      await db.none('DELETE FROM users WHERE username = $1', ['testuser']);
    });
  
    it('positive: should log in with correct username and password', (done) => {
        chai
          .request(server)
          .post('/login')
          .send({
            username: 'correctUsername',
            password: 'correctPassword'
          })
          .end((err, res) => {
            expect(res).to.have.status(200); // Expect 200 OK since it's a successful login
            //expect(res).to.redirectTo('/home'); // Expect redirect to /home
            done();
          });
      });      
  
    it('negative: should not log in with incorrect password', (done) => {
      chai
        .request(server)
        .post('/login')
        .send({
          username: 'testuser',
          password: 'incorrectpassword'
        })
        .end((err, res) => {
          expect(res).to.have.status(401); // Should return status 401 for incorrect password
          //expect(res.text).to.include('Incorrect username or password.'); // Check error message
          done();
        });
    });

});
  