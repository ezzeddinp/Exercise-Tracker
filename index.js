const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
require('dotenv').config()
const { Schema } = mongoose;

mongoose.connect(process.env.MONGO_URI)

const UserSchema = new Schema({
    username: String, // pop up in the repl terminal
});
const User = mongoose.model("User", UserSchema)

const ExerciseSchema = new Schema({
    user_id: String,
    description: String,
    duration: Number,
    date: Date,
});
// creates mongoose model called 'Exercise' using prev defined 'ExerciseSchema'
const Exercise = mongoose.model("Exercise", ExerciseSchema)


app.use(cors())
//enables Express.js to serve static files from the "public" directory, making it easier to organize and deliver client-side assets in your application.
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true })) // allow us to grab our body request
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html')
});

// reading the result from app.post /api/users with formatted json
app.get('/api/users', async (req, res) => {
    const users = await User.find({}).select("_id username");
    if (!users) {
        res.send("No users");
    } else {
        res.json(users);
    }
})

app.post("/api/users", async (req, res) => {
    console.log(req.body)
    const userObj = new User({
        username: req.body.username
    });

    try {
        const user = await userObj.save();
        console.log(user)
        res.json(user)
    } catch (err) {
        console.log(err)
    }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
    const id = req.params._id; // grab the id
    const { description, duration, date } = req.body

    try {
        const user = await User.findById(id)
        if (!user) {
            res.send("Could not find user")
        } else {
            const exerciseObj = new Exercise({
                user_id: user._id,
                description,
                duration,
                date: date ? new Date(date) : new Date()
            });
            const exercise = await exerciseObj.save()
            res.json({
                _id: user._id, // user took from mongodb data = '_id: .... '
                username: user.username,
                description: exercise.description,
                duration: exercise.duration,
                date: new Date(exercise.date).toDateString()
                // ^ formatted date(exerciseObj) to a string 
                // also creates new object called 'Date' that
                // converts the 'date' to a 'human-readable string'
            })
        }
    } catch (err) {
        console.log(err);
        res.send("There was an error saving the exercise")
    }
})

app.get('/api/users/:_id/logs', async (req, res) => {
    const { from, to, limit } = req.query;
    const id = req.params._id;
    const user = await User.findById(id);
    if (!user) {
        res.send("Couldn't fine user")
        return;
    }
    let dateObj = {}
    if (from) {
        // "$gte" = operator used in 'MongoDB queries' and stands for "Greater Than or Equal to"
        dateObj["$gte"] = new Date(from) // the simple is it specify a condition where the date should be greater than or equal to the 'provided date'
    }
    if (to) {
        dateObj["$lte"] = new Date(to)
    }
    let filter = {
        user_id: id
    }
    if (from || to) {
        filter.date = dateObj // dateObj as the 'value' of 'date' property within the 'filter' object
    }

    const exercises = await Exercise.find(filter).limit(+limit ?? 500) // if it's null/undefined then return 500
    const log = exercises.map(e => ({
        description: e.description,
        duration: Number(e.duration),
        date: e.date.toDateString()
    }))
    
    res.json({
        username: user.username,
        count: exercises.length,
        _id: user._id,
        log
    })
})

// GET user's exercise log: GET /api/users/:_id/logs?[from][&to][&limit]
const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port' + listener.address().port)
})