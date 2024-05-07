import express from "express"; // Importing the express module to create the server
import bodyParser from "body-parser"; // Importing body-parser to parse incoming request bodies
import pg from "pg"; // Importing the pg module to connect to PostgreSQL database

const app = express(); // Creating an instance of express
const port = 3000; // Setting the port number for the server

// Creating a new client instance to connect to the PostgreSQL database with configuration details
const db = new pg.Client({
  user: "postgres", // Database user
  host: "localhost", // Database host
  database: "world", // Database name
  password: "639606", // Database password
  port: 5432, // Port number the database server is listening on
});
db.connect(); // Connecting to the database

app.use(bodyParser.urlencoded({ extended: true })); // Telling the app to use bodyParser to parse URL-encoded bodies
app.use(express.static("public")); // Serving static files from the "public" directory

let currentUserId = 1; // Initializing the current user ID

// Initializing an array of users
let users = [
  { id: 1, name: "Angela", color: "teal" },
  { id: 2, name: "Jack", color: "powderblue" },
];

// Asynchronous function to check visited countries for the current user
async function checkVisisted() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1; ",
    [currentUserId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code); // Adding each country code to the countries array
  });
  return countries; // Returning the array of visited countries
}

// Asynchronous function to get the current user's details
async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users"); // Querying all users from the database
  users = result.rows; // Updating the users array with the query result
  return users.find((user) => user.id == currentUserId); // Returning the current user's details
}

// Handling GET requests to the root route
app.get("/", async (req, res) => {
  const countries = await checkVisisted(); // Getting the visited countries for the current user
  const currentUser = await getCurrentUser(); // Getting the current user's details
  // Rendering the index.ejs file and passing data to it
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});

// Handling POST requests to the "/add" route
app.post("/add", async (req, res) => {
  const input = req.body["country"]; // Getting the country input from the request body
  const currentUser = await getCurrentUser(); // Getting the current user's details

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0]; // Getting the first row from the query result
    const countryCode = data.country_code; // Extracting the country code
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUser.id]
      );
      res.redirect("/"); // Redirecting to the root route after successful insertion
    } catch (err) {
      console.log(err); // Logging any errors during insertion
    }
  } catch (err) {
    console.log(err); // Logging any errors during the query
  }
});

// Handling POST requests to the "/user" route
app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs"); // Rendering the new.ejs file if the request body has "add" equal to "new"
  } else {
    currentUserId = req.body.user; // Updating the currentUserId with the user ID from the request body
    res.redirect("/"); // Redirecting to the root route
  }
});

// Handling POST requests to the "/new" route
app.post("/new", async (req, res) => {
  const name = req.body.name; // Getting the name from the request body
  const color = req.body.color; // Getting the color from the request body

  const result = await db.query(
    "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
    [name, color]
  );

  const id = result.rows[0].id; // Getting the ID of the newly inserted user
  currentUserId = id; // Updating the currentUserId with the new user's ID
  
  res.redirect("/"); // Redirecting to the root route
});

// Starting the server and listening on the specified port
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
