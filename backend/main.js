// Get the client
const mysql = require("mysql2");
require("dotenv").config();

// ATTENTION REQUIRED: Create the connection to database
const pool = mysql.createPool({
  host: process.env.SQL_HOSTNAME,
  user: process.env.SQL_USERNAME,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DBNAME,
});

// Set up the API
const express = require("express");
var cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const port = 3001;

// Make it available for public access
app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "*");
  next();
});

app.use(cors());
app.options("*", cors());

app.set("json spaces", 2);
app.use(
  bodyParser.json({
    limit: "50mb",
  })
);
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// Listen to outside connection
app.listen(port, () => {
  console.log(`App running on port ${port}. Control+C to exit.`);
});

// Spit out data
app.get("/", (request, response) => {
  response.json({
    info: "Movie Management System",
  });
});

// Movie search
app.get("/movies/search", (request, response) => {
  const keyword = request.query.title;

  const query = `
        SELECT 
            m.title,
            m.release_year AS year,
            m.duration,
            m.summary,
            c.name AS category
        FROM movies m
        JOIN categorys c ON m.category_id = c.category_id
        WHERE m.title LIKE CONCAT('%', ?, '%')
    `;

  pool.query(query, [keyword], (error, result) => {
    if (error) {
      return response
        .status(500)
        .json({ status: "error", message: "Database error" });
    }

    if (result.length === 0) {
      return response
        .status(404)
        .json({ status: "error", message: "No movies found" });
    }

    response.json({
      status: "success",
      data: result,
    });
  });
});

app.get("/movies/by-genre", (request, response) => {
  const genreName = request.query.name; // Get the genre name from the query parameter

  pool.query(
    `SELECT m.title, m.release_year, m.duration, m.summary, c.name AS category
        FROM movies m
        JOIN movie_genres mg ON m.movie_id = mg.movie_id
        JOIN genres g ON mg.genre_id = g.genre_id
        JOIN categorys c ON m.category_id = c.category_id
        WHERE g.name LIKE CONCAT('%', ?, '%')`,
    [genreName], // Replace with user input (genre keyword)
    (error, result) => {
      if (error) {
        return response
          .status(500)
          .json({ status: "error", message: "Database error" });
      }
      if (result.length === 0) {
        return response
          .status(404)
          .json({ status: "error", message: "No movies found for this genre" });
      }
      response.json({
        status: "success",
        data: result,
      });
    }
  );
});

app.get("/movies", (req, res) => {
  const query = `
      SELECT 
        m.title, 
        m.release_year AS year, 
        m.duration, 
        m.summary, 
        c.name AS category
      FROM movies m
      JOIN categorys c ON m.category_id = c.category_id
    `;

  pool.query(query, (error, results) => {
    if (error) {
      return res.status(500).json({
        status: "error",
        message: "Database error",
      });
    }

    res.status(200).json({
      status: "success",
      data: results,
    });
  });
});

// User Management & Administration
app.patch("/users/deactivate", (request, response) => {
  const userId = request.query.id;

  pool.query(
    "SELECT user_name, email FROM users WHERE user_id = ?",
    [userId],
    (error, result) => {
      if (error) {
        return response
          .status(500)
          .json({ status: "error", message: "Database error" });
      }

      if (result.length === 0) {
        return response
          .status(404)
          .json({ status: "error", message: "User not found" });
      }

      const { user_name, email } = result[0];

      pool.query(
        "UPDATE users SET is_active = FALSE WHERE user_id = ?",
        [userId],
        (updateError, updateResult) => {
          if (updateError) {
            return response
              .status(500)
              .json({ status: "error", message: "Database error" });
          }

          response.json({
            status: "success",
            message: `User with username '${user_name}' and email '${email}' has been deactivated`,
          });
        }
      );
    }
  );
});

app.patch("/users/activate", (request, response) => {
  const userId = request.query.id;

  pool.query(
    "SELECT user_name, email FROM users WHERE user_id = ?",
    [userId],
    (error, result) => {
      if (error) {
        return response
          .status(500)
          .json({ status: "error", message: "Database error" });
      }

      if (result.length === 0) {
        return response
          .status(404)
          .json({ status: "error", message: "User not found" });
      }

      const { user_name, email } = result[0];

      pool.query(
        "UPDATE users SET is_active = TRUE WHERE user_id = ?",
        [userId],
        (updateError, updateResult) => {
          if (updateError) {
            return response
              .status(500)
              .json({ status: "error", message: "Database error" });
          }

          response.json({
            status: "success",
            message: `User with username '${user_name}' and email '${email}' has been activated`,
          });
        }
      );
    }
  );
});

// app.post("/users/add", (request, response) => {
//     const { user_name, email, password, is_active } = request.body;

//     pool.query(
//         "SELECT user_id FROM users WHERE user_name = ? OR email = ?",
//         [user_name, email],
//         (error, result) => {
//             if (error) {
//                 return response.status(500).json({ status: "error", message: "Database error" });
//             }

//             if (result.length > 0) {
//                 return response.status(400).json({ status: "error", message: "Username or email already exists" });
//             }

//             // Insert the new user with dynamic is_active
//             pool.query(
//                 "INSERT INTO users (user_name, email, password, is_active) VALUES (?, ?, ?, ?)",
//                 [user_name, email, password, is_active || true],  // Defaults to TRUE if not provided
//                 (insertError, insertResult) => {
//                     if (insertError) {
//                         return response.status(500).json({ status: "error", message: "Failed to add user" });
//                     }

//                     response.status(201).json({
//                         status: "success",
//                         message: `User '${user_name}' with email '${email}' has been added successfully`
//                     });
//                 }
//             );
//         }
//     );
// });

app.post("/users/create", (req, res) => {
  const { user_name, email, password } = req.body;

  pool.query(
    "INSERT INTO users (user_name, email, password, is_active) VALUES (?, ?, ?, TRUE)",
    [user_name, email, password],
    (error, result) => {
      if (error) {
        return res.status(500).json({
          status: "error",
          message: "Database error",
        });
      }

      res.status(201).json({
        status: "success",
        message: `User ${user_name} with email ${email} has been created`,
      });
    }
  );
});

app.get("/users", (req, res) => {
  pool.query(
    "SELECT user_id, user_name, email, is_active FROM users",
    (error, results) => {
      if (error) {
        return res.status(500).json({
          status: "error",
          message: "Database error",
        });
      }

      res.status(200).json({
        status: "success",
        data: results,
      });
    }
  );
});

// Search & Filter Options
app.get("/movies/ratings", (req, res) => {
  const minRating = parseFloat(req.query.rating);

  // Check if the rating query parameter is provided
  if (!minRating && minRating !== 0) {
    return res.status(400).json({
      status: "error",
      message: "Rating query parameter is required",
    });
  }

  // Ensure the rating is a valid number between 0 and 5
  if (isNaN(minRating) || minRating < 0 || minRating > 5) {
    return res.status(400).json({
      status: "error",
      message: "Rating must be a float between 0 and 5",
    });
  }

  pool.query(
    `SELECT 
            m.movie_id,
            m.title,
            ROUND(AVG(r.rating), 2) AS average_rating,
            COUNT(r.user_id) AS user_count,
            GROUP_CONCAT(DISTINCT g.name) AS genres,
            c.name AS category
        FROM 
            movies m
        JOIN 
            ratings r ON m.movie_id = r.movie_id
        JOIN 
            movie_genres mg ON m.movie_id = mg.movie_id
        JOIN 
            genres g ON mg.genre_id = g.genre_id
        JOIN
            categorys c ON m.category_id = c.category_id
        GROUP BY 
            m.movie_id, m.title, c.name
        HAVING 
            average_rating >= ?`,
    [minRating],
    (error, results) => {
      if (error) {
        return res.status(500).json({
          status: "error",
          message: "Database error",
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          status: "not found",
          message: "No movies found with the specified rating",
        });
      }

      res.status(200).json({
        status: "success",
        data: results,
      });
    }
  );
});

app.get("/directors/search", (req, res) => {
  const { keyword } = req.query;

  if (!keyword) {
    return res.status(400).json({
      status: "error",
      message: "Keyword is required",
    });
  }

  const query = `
        SELECT d.director_id, d.f_name, d.l_name, m.title
        FROM directors d
        LEFT JOIN movie_directors md ON d.director_id = md.director_id
        LEFT JOIN movies m ON md.movie_id = m.movie_id
        WHERE d.f_name LIKE ? OR d.l_name LIKE ?;
    `;

  pool.query(query, [`%${keyword}%`, `%${keyword}%`], (error, results) => {
    if (error) {
      return res
        .status(500)
        .json({ status: "error", message: "Database error" });
    }

    if (results.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "No directors found" });
    }

    res.status(200).json({
      status: "success",
      data: results,
    });
  });
});
