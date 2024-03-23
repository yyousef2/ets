const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const path = require("path");
const router = express.Router();
const session = require("express-session");
const con = require('./db');

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: false }));

// Add session middleware
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
}));

var loggedInStudent = {}

router.get("/student/home", (req, res) => {
    if (!req.session.loggedInStudent) {
        res.redirect("/student/login");
    } else {
        try {
            con.query("SELECT COUNT(*) AS courseCount FROM course", (err, courseResult) => {
                if (err) {
                    console.error('Error executing course query:', err);
                    res.render("student/home", { message: err.message });
                    return;
                }
                con.query("SELECT COUNT(*) AS applicationCount FROM assignments", (err, applicationResult) => {
                    if (err) {
                        console.error('Error executing application query:', err);
                        res.render("student/home", { message: err.message });
                        return;
                    }
                    con.query("SELECT type, COUNT(*) AS TypeCount FROM grade GROUP BY type", (err, result) => {
                        if (err) {
                            console.error('Error executing grade query:', err);
                            res.render("student/home", { message: err.message });
                            return;
                        }



                        const gradeCounts = {};
                        result.forEach(row => {
                            gradeCounts[row.type] = row.TypeCount;
                        });
                        console.log({
                            user: req.session.loggedInStudent,
                            gradeCounts: gradeCounts,
                            totalCourse: courseResult[0].courseCount,
                            totalApplication: applicationResult[0].applicationCount
                        })
                        res.render("student/home", {
                            user: req.session.loggedInStudent,
                            gradeCounts: gradeCounts,
                            totalCourse: courseResult[0].courseCount,
                            totalApplication: applicationResult[0].applicationCount
                        });
                    });
                });
            });
        } catch (err) {
            console.log(err.stack);
            res.render("student/home", { message: err.message });
        }
    }
});

router.post("/calculateGPA", (req, res) => {
    const numCourses = 5; // Number of courses
    let totalCredits = 0;
    let totalGradePoints = 0;

    // Calculate total grade points and total credits
    for (let i = 1; i <= numCourses; i++) {
        const grade = parseInt(req.body[`grade${i}`]);
        const credits = parseInt(req.body[`credit${i}`]);

        // Ensure grade and credits are valid numbers
        if (!isNaN(grade) && !isNaN(credits)) {
            totalGradePoints += (grade * credits);
            totalCredits += credits;
        }
    }

    // Calculate GPA
    const gpa = totalGradePoints / totalCredits;

    // Return the GPA as the response
    res.json({ gpa });
});


router.get("/student/signup", (req, res) => {
    res.render("student/signup", {
        title: "Hey",
        message: "Hello there!"
    });
});

router.get("/student/course", (req, res) => {
    if (!req.session.loggedInStudent) {
        res.redirect("/student/login");
    } else {
        try {
            var sql = `SELECT * FROM course`;
            con.query(sql, (err, result) => {
                if (err) {
                    console.error('Error executing query:', err);
                    res.render("student/course", { message: err.message });
                    return;
                }
                res.render("student/course", { record: result, user: req.session.loggedInStudent });
            });
        } catch (err) {
            console.log(err.stack);
            res.render("student/course", { message: err.message });
        }
    }
});


router.post("/student/addNewCourse", (req, res) => {
    var courseName = req.body.courseName;
    var instructorName = req.body.instructorName;
    var courseDescription = req.body.courseDescription;
    var semester_term = req.body.semester_term;
    try {
        var sql = `INSERT INTO course (name, instructor, description, semester) VALUES ('${courseName}', '${instructorName}', '${courseDescription}', '${semester_term}')`;
        con.query(sql, (err, result) => {
            if (err) {
                console.error('Error executing query:', err);
                res.render("student/course", { message: err.message });
                return;
            }
            console.log("User Added New Course Successfully.");

            var sql = `SELECT * FROM course`;
            con.query(sql, (err, result) => {
                if (err) {
                    console.error('Error executing query:', err);
                    res.render("student/course", { message: err.message });
                    return;
                }
                res.render("student/course", { record: result, user: req.session.loggedInStudent });
            });

        });
    } catch (err) {
        console.log(err.stack);
        res.render("student/course", { message: err.message });
    }
});

router.post("/student/course/delete", (req, res) => {
    const courseId = req.body.courseId;

    try {
        var sql = `DELETE FROM course WHERE id='${courseId}'`;
        con.query(sql, (err, result) => {
            if (err) {
                console.error('Error executing query:', err);
                res.render("student/course", { message: err.message });
                return;
            }
            console.log("Course deleted successfully.");
            // Redirect to the course page or render a success message
            res.redirect("/student/course");
        });
    } catch (err) {
        console.log(err.stack);
        res.render("student/course", { message: err.message });
    }
});

router.post("/student/course/update", (req, res) => {
    var courseId = req.body.courseId;
    try {
        // fetch data from db and send to updateCourse
        var sql = `SELECT * FROM course WHERE id='${courseId}'`;
        con.query(sql, (err, result) => {
            if (err) {
                console.error('Error executing query:', err);
                res.render("student/course", { message: err.message });
                return;
            }
            var temp2 = {
                id: result[0].id,
                name: result[0].name,
                instructor: result[0].instructor,
                description: result[0].description,
                semester: result[0].semester
            }
            console.log(temp2);
            res.render("student/updateCourse", { record: temp2, user: req.session.loggedInStudent });
        });
    }
    catch (error) {
        console.log(error.stack);
        res.render("student/course", { message: error.message });
    }
})

router.post("/student/updateCourse", (req, res) => {
    var courseId = req.body.courseId;
    var courseName = req.body.courseName;
    var instructorName = req.body.instructorName;
    var courseDescription = req.body.courseDescription;
    var semester_term = req.body.semester_term;

    try {
        var sql = `UPDATE course SET name='${courseName}', instructor='${instructorName}', description='${courseDescription}', semester='${semester_term}' WHERE id='${courseId}'`;
        con.query(sql, (err, result) => {
            if (err) {
                console.error('Error executing query:', err);
                res.render("student/course", { message: err.message });
                return;
            }
            console.log("Course updated successfully.");
            // Redirect to the course page or render a success message
            res.redirect("/student/course");
        });
    } catch (err) {
        console.log(err.stack);
        res.render("student/course", { message: err.message });
    }
});

router.get("/student/grade", (req, res) => {
    if (!req.session.loggedInStudent) {
        res.redirect("/student/login");
    } else {
        try {
            var sqlAllRecords = `SELECT * FROM grade`;
            var sqlCourseNames = `SELECT name FROM course`;

            con.query(sqlAllRecords, (err, allRecords) => {
                if (err) {
                    console.error('Error executing query for all records:', err);
                    res.render("student/grade", { message: err.message });
                    return;
                }

                con.query(sqlCourseNames, (err, courseNames) => {
                    if (err) {
                        console.error('Error executing query for course names:', err);
                        res.render("student/grade", { message: err.message });
                        return;
                    }

                    res.render("student/grade", { record: allRecords, courseNames: courseNames, user: req.session.loggedInStudent });
                });
            });
        } catch (err) {
            console.log(err.stack);
            res.render("student/grade", { message: err.message });
        }
    }
});

router.get("/student/assignment", (req, res) => {
    if (!req.session.loggedInStudent) {
        res.redirect("/student/login");
    } else {
        try {
            var sqlAllRecords = `SELECT * FROM assignments`;
            var sqlCourseNames = `SELECT name FROM course`;

            con.query(sqlAllRecords, (err, allRecords) => {
                if (err) {
                    console.error('Error executing query for all records:', err);
                    res.render("student/assignment", { message: err.message });
                    return;
                }

                con.query(sqlCourseNames, (err, courseNames) => {
                    if (err) {
                        console.error('Error executing query for course names:', err);
                        res.render("student/assignment", { message: err.message });
                        return;
                    }

                    res.render("student/assignment", { record: allRecords, courseNames: courseNames, user: req.session.loggedInStudent });
                });
            });
        } catch (err) {
            console.log(err.stack);
            res.render("student/assignment", { message: err.message });
        }
    }
});
router.post("/student/addNewAssignment", (req, res) => {
    var courseName = req.body.courseName;
    var assignmentName = req.body.assignmentName;
    var dueData = req.body.dueData;
    var description = req.body.description;

    try {
        var sql = `INSERT INTO assignments (name, dueDate, description, course) VALUES ('${assignmentName}', '${dueData}', '${description}', '${courseName}')`;
        con.query(sql, (err, result) => {
            if (err) {
                console.error('Error executing query:', err);
                res.render("student/assignment", { message: err.message });
                return;
            }
            console.log("User Added New assignment Successfully.");
            var sqlAllRecords = `SELECT * FROM assignments`;
            var sqlCourseNames = `SELECT name FROM course`;

            con.query(sqlAllRecords, (err, allRecords) => {
                if (err) {
                    console.error('Error executing query for all records:', err);
                    res.render("student/assignment", { message: err.message });
                    return;
                }

                con.query(sqlCourseNames, (err, courseNames) => {
                    if (err) {
                        console.error('Error executing query for course names:', err);
                        res.render("student/assignment", { message: err.message });
                        return;
                    }

                    res.render("student/assignment", { record: allRecords, courseNames: courseNames, user: req.session.loggedInStudent });
                });
            });


        });
    } catch (err) {
        console.log(err.stack);
        res.render("student/course", { message: err.message });
    }
});

router.post("/student/assignment/delete", (req, res) => {
    var assignmentId = req.body.assignmentId;

    try {
        var sql = `DELETE FROM assignments WHERE id='${assignmentId}'`;
        con.query(sql, (err, result) => {
            if (err) {
                console.error('Error deleting assignment:', err);
                res.render("student/assignment", { message: err.message });
                return;
            }
            console.log("Assignment deleted successfully.");
            // Optionally, you can redirect or render a success message
            res.redirect("/student/assignment");
        });
    } catch (err) {
        console.log(err.stack);
        res.render("student/assignment", { message: err.message });
    }
});

router.post("/student/assignment/update", (req, res) => {
    var assignmentId = req.body.assignmentId;
    try {
        // fetch data from db and send to updateCourse
        var sqlAllRecords = `SELECT * FROM assignments WHERE id='${assignmentId}'`;
        var sqlCourseNames = `SELECT name FROM course`;

        con.query(sqlAllRecords, (err, allRecords) => {
            if (err) {
                console.error('Error executing query for all records:', err);
                res.render("student/assignment", { message: err.message });
                return;
            }

            con.query(sqlCourseNames, (err, courseNames) => {
                if (err) {
                    console.error('Error executing query for course names:', err);
                    res.render("student/assignment", { message: err.message });
                    return;
                }

                var temp2 = {
                    id: allRecords[0].id,
                    name: allRecords[0].name,
                    dueDate: allRecords[0].dueDate,
                    description: allRecords[0].description,
                    course: allRecords[0].course
                }
                res.render("student/updateAssignment", { record: temp2, courseNames: courseNames, user: req.session.loggedInStudent });
            });
        });
    }
    catch (error) {
        console.log(error.stack);
        res.render("student/assignment", { message: error.message });
    }
})

router.post("/student/assignment/updateAssignment", (req, res) => {
    var assignmentId = req.body.assignmentId;
    var assignmentName = req.body.assignmentName;
    var dueDate = req.body.dueDate;
    var courseName = req.body.courseName;
    var description = req.body.description;

    try {
        var sql = `UPDATE assignments SET name='${assignmentName}', dueDate='${dueDate}', course='${courseName}', description='${description}' WHERE id='${assignmentId}'`;
        con.query(sql, (err, result) => {
            if (err) {
                console.error('Error updating assignment:', err);
                res.render("student/assignment", { message: err.message });
                return;
            }
            console.log("Assignment updated successfully.");
            // Optionally, you can redirect or render a success message
            res.redirect("/student/assignment");
        });
    } catch (err) {
        console.log(err.stack);
        res.render("student/assignment", { message: err.message });
    }
});


router.post("/student/addNewGrade", (req, res) => {
    var courseName = req.body.courseName;
    var gradeType = req.body.gradeType;
    var obtainedMarks = req.body.obtainedMarks;
    var totalMarks = req.body.totalMarks;
    var gradeDate = req.body.gradeDate;

    try {
        // Assuming 'grades' is your database table name
        var sql = `INSERT INTO grade (course, type, obtainedMarks, totalMarks, date) VALUES ('${courseName}', '${gradeType}', ${obtainedMarks}, ${totalMarks}, '${gradeDate}')`;
        con.query(sql, (err, result) => {
            if (err) {
                console.error('Error executing query:', err);
                res.render("student/grade", { message: err.message });
                return;
            }
            console.log("New grade added successfully.");
            // Redirect to the grade page or render a success message
            res.redirect("/student/grade");
        });
    } catch (err) {
        console.log(err.stack);
        res.render("student/grade", { message: err.message });
    }
});

router.get("/student/logout", (req, res) => {
    req.session.destroy();
    loggedInStudent = {}
    res.redirect("/student/login");
})
app.post("/student/signup", async (req, res) => {
    var name = req.body.name;
    var email = req.body.email;
    var password = req.body.password;

    var temp = {
        name: name,
        email: email,
        password: password
    };

    try {
        var sql = `INSERT INTO users (name, email, password) VALUES ('${name}', '${email}', '${password}')`;
        con.query(sql, (err, result) => {
            if (err) {
                console.error('Error executing query:', err);
                res.render("student/signup", { message: err.message });
                return;
            }
            console.log("User Signup Successfully.");
            req.session.loggedInStudent = temp;
            res.render("student/home", { user: temp });
        });
    } catch (err) {
        console.log(err.stack);
        res.render("student/signup", { message: err.message });
    }
});

router.get("/student/login", async (req, res) => {
    if (!req.session.loggedInStudent) {
        res.render("student/login", { error: "" });
    } else {
        res.redirect('http://localhost:3000/student/home');
    }

});

app.post("/student/login", async (req, res) => {
    if (!req.session.loggedInStudent) {
        const { email, password } = req.body;
        try {
            var sql = `SELECT * FROM users where email='${email}' and password='${password}'`;
            con.query(sql, (err, result) => {
                if (err) {
                    console.error('Error executing query:', err);
                    res.render("student/login", { error: "An error occurred" });
                    return;
                }
                if (result.length === 0) {
                    res.render("student/login", { error: "No user found" });
                } else {
                    req.session.loggedInStudent = result[0];
                    loggedInStudent = result[0]
                    try {
                        con.query("SELECT COUNT(*) AS courseCount FROM course", (err, courseResult) => {
                            if (err) {
                                console.error('Error executing course query:', err);
                                res.render("student/home", { message: err.message });
                                return;
                            }
                            con.query("SELECT COUNT(*) AS applicationCount FROM assignments", (err, applicationResult) => {
                                if (err) {
                                    console.error('Error executing application query:', err);
                                    res.render("student/home", { message: err.message });
                                    return;
                                }
                                con.query("SELECT type, COUNT(*) AS TypeCount FROM grade GROUP BY type", (err, result) => {
                                    if (err) {
                                        console.error('Error executing grade query:', err);
                                        res.render("student/home", { message: err.message });
                                        return;
                                    }
            
            
            
                                    const gradeCounts = {};
                                    result.forEach(row => {
                                        gradeCounts[row.type] = row.TypeCount;
                                    });
                                    console.log({
                                        user: req.session.loggedInStudent,
                                        gradeCounts: gradeCounts,
                                        totalCourse: courseResult[0].courseCount,
                                        totalApplication: applicationResult[0].applicationCount
                                    })
                                    res.render("student/home", {
                                        user: req.session.loggedInStudent,
                                        gradeCounts: gradeCounts,
                                        totalCourse: courseResult[0].courseCount,
                                        totalApplication: applicationResult[0].applicationCount
                                    });
                                });
                            });
                        });
                    } catch (err) {
                        console.log(err.stack);
                        res.render("student/home", { message: err.message });
                    }
                }
            });
        } catch (err) {
            console.log(err.stack);
            res.render("student/login", { error: err });
        }
    } else {
        try {
            con.query("SELECT COUNT(*) AS courseCount FROM course", (err, courseResult) => {
                if (err) {
                    console.error('Error executing course query:', err);
                    res.render("student/home", { message: err.message });
                    return;
                }
                con.query("SELECT COUNT(*) AS applicationCount FROM assignments", (err, applicationResult) => {
                    if (err) {
                        console.error('Error executing application query:', err);
                        res.render("student/home", { message: err.message });
                        return;
                    }
                    con.query("SELECT type, COUNT(*) AS TypeCount FROM grade GROUP BY type", (err, result) => {
                        if (err) {
                            console.error('Error executing grade query:', err);
                            res.render("student/home", { message: err.message });
                            return;
                        }



                        const gradeCounts = {};
                        result.forEach(row => {
                            gradeCounts[row.type] = row.TypeCount;
                        });
                        console.log({
                            user: req.session.loggedInStudent,
                            gradeCounts: gradeCounts,
                            totalCourse: courseResult[0].courseCount,
                            totalApplication: applicationResult[0].applicationCount
                        })
                        res.render("student/home", {
                            user: req.session.loggedInStudent,
                            gradeCounts: gradeCounts,
                            totalCourse: courseResult[0].courseCount,
                            totalApplication: applicationResult[0].applicationCount
                        });
                    });
                });
            });
        } catch (err) {
            console.log(err.stack);
            res.render("student/home", { message: err.message });
        }
    }
});

router.get("/", (req, res) => {
    if (!req.session.loggedInStudent) {
        res.redirect("/student/login");
    } else {
        res.render("student/home", {
            user: req.session.loggedInStudent
        });
    }
});

app.use("/", router);

app.listen(process.env.port || 3000);
console.log("Running at Port: http://localhost:3000");