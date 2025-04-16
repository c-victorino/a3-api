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
            info: 'Backend for GBC Library, set up by Chris K!'
        }
    )
})

app.get("/v1/users/list", (request, response) => {

    pool.query("SELECT fname, lname, email FROM users ORDER BY id", [], (error, result) => {
        response.json(
            {
                status: "success",
                data: result
            }
        )
    });

})

app.get("/v1/users/get", (request, response) => {

    const id = request.query.id;

    pool.query("SELECT fname, lname, email FROM users WHERE id = ?", [id], (error, result) => {
        response.json(
            {
                status: "success",
                data: result
            }
        )
    });
})

app.post("/v1/users/create", (request, response) => {

    const fname = request.body.fname;
    const lname = request.body.lname;
    const email = request.body.email;

    pool.query(
        "INSERT INTO users (fname, lname, email) VALUES (?, ?, ?)",
        [fname, lname, email], (error, result) => {
            response.json(
                {
                    status: "success",
                    message: "New user created"
                }
            )
        }

    )

})


app.post("/v1/users/remove", (request, response) => {

    const id = request.body.id;

    pool.query(
        "UPDATE users SET removed = 1 WHERE id = ?",
        [id], (error, result) => {
            response.json(
                {
                    status: "success",
                    message: "User removed"
                }
            )
        }

    )

})