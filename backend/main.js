// Get the client
const mysql = require('mysql2');
require('dotenv').config()

// ATTENTION REQUIRED: Create the connection to database
const pool = mysql.createPool({
    host: process.env.SQL_HOSTNAME,
    user: process.env.SQL_USERNAME,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DBNAME,
});

// Set up the API
const express = require('express')
var cors = require('cors');
const bodyParser = require('body-parser')
const app = express()
const port = 3001

// Make it available for public access
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    next();
});

app.use(cors());
app.options("*", cors());

app.set('json spaces', 2)
app.use(bodyParser.json({
    limit: "50mb"
}))
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
)

// Listen to outside connection
app.listen(port, () => {
    console.log(`App running on port ${port}. Control+C to exit.`)
})

// Spit out data
app.get('/', (request, response) => {
    response.json(
        {
            info: 'Movie Management System'
        }
    )
})

// Search Movies by Genre
app.get("/v1/movies/genre", (request, response) => {
    const genre = request.query.genre;

    pool.query(
        `SELECT m.title, m.release_year, g.name AS genre
         FROM movies m
         JOIN movie_genres mg ON m.movie_id = mg.movie_id
         JOIN genres g ON mg.genre_id = g.genre_id
         WHERE g.name = ?`,
        [genre],
        (error, result) => {        
            response.json({
                status: "success",
                data: result                
            });
        }
    );
});

// Get All Active Users Account (Not Deleted / Deactivated)
app.get("/v1/users/active", (request, response) => {
    pool.query(
        "SELECT user_name, email FROM users WHERE is_active = TRUE",
        [],
        (error, result) => {
            response.json({
                status: "success",
                data: result
            });
        }
    );
});

// Get Ratings for a Specific Movie
app.get("/v1/ratings/get", (request, response) => {

    const movieId = request.query.movie_id;

    pool.query(
        `SELECT m.title, r.rating, r.comment, u.user_name
         FROM ratings r
         JOIN users u ON r.user_id = u.user_id
         JOIN movies m ON r.movie_id = m.movie_id
         WHERE r.movie_id = ?`,
        [movieId],
        (error, result) => {
            console.log(result);
            response.json({
                status: "success",
                data: result
            });
        }
    );
});

app.patch("/v1/users/deactivate", (request, response) => {
    const userId = request.query.id;

    pool.query(
        "SELECT user_name, email FROM users WHERE user_id = ?",
        [userId],
        (error, userResult) => {
            if (error) {
                return response.status(500).json({ status: "error", message: "Database error" });
            }

            if (userResult.length === 0) {
                return response.status(404).json({ status: "error", message: "User not found" });
            }

            const { user_name, email } = userResult[0];

            pool.query(
                "UPDATE users SET is_active = FALSE WHERE user_id = ?",
                [userId],
                (updateError, result) => {
                    if (updateError) {
                        return response.status(500).json({ status: "error", message: "Update failed" });
                    }

                    response.json({
                        status: "success",
                        message: `User "${user_name}" (${email}) has been deactivated`
                    });
                }
            );
        }
    );
});

app.patch("/v1/users/activate", (request, response) => {
    const userId = request.query.id;

    pool.query(
        "SELECT user_name, email FROM users WHERE user_id = ?",
        [userId],
        (error, userResult) => {
            if (error) {
                return response.status(500).json({ status: "error", message: "Database error" });
            }

            if (userResult.length === 0) {
                return response.status(404).json({ status: "error", message: "User not found" });
            }

            const { user_name, email } = userResult[0];

            pool.query(
                "UPDATE users SET is_active = TRUE WHERE user_id = ?",
                [userId],
                (updateError, result) => {
                    if (updateError) {
                        return response.status(500).json({ status: "error", message: "Update failed" });
                    }

                    response.json({
                        status: "success",
                        message: `User "${user_name}" (${email}) has been activated`
                    });
                }
            );
        }
    );
});

app.post("/v1/users/create", (req, res) => {
    const { user_name, email, password } = req.body;

    pool.query(
        "INSERT INTO users (user_name, email, password, is_active) VALUES (?, ?, ?, TRUE)",  // is_active is set to TRUE by default
        [user_name, email, password],
        (error, result) => {
            if (error) {
                return res.status(500).json({ status: "error", message: "Database error" });
            }

            res.status(201).json({
                status: "success",
                message: `User ${user_name} with email ${email} has been created`
            });
        }
    );
});
