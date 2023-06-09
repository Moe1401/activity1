const { ObjectId } = require('mongoose').Types;
const { Student, Course } = require('../models');

// Aggregate function to get the number of students overall

/*
  .aggregate() ===> we want to agregate somehow,
  .count() ===> count of all the student records
  mongoose sends back the data, we name it numberOfStudents.
*/
const headCount = async () =>
  Student.aggregate()
    .count('studentCount')
    .then((numberOfStudents) => numberOfStudents);

// Aggregate function for getting the overall grade using $avg
const grade = async (studentId) =>
  Student.aggregate([
    // only include the given student by using $match
    { $match: { _id: ObjectId(studentId) } }, //break down array "assignments" for use

    // mongoose cannot agg. with array data, we need to break it
    //down so mongoose can handle them individually
    {
      $unwind: '$assignments',  //filter by assignments, "$" shows that its the model Value
    },

    //group results by Student ID. result will be an average of the score
    //property for each assignment the student has taken.
    //name of the result is overallGrade in this case.
    {
      $group: {
        _id: ObjectId(studentId), //group them back together
        overallGrade: { $avg: '$assignments.score' }, //load into overallGrade
      },
    },
  ]);

module.exports = {
  // Get all students
  getStudents(req, res) {
    Student.find()
      .then(async (students) => {
        const studentObj = {
          students,
          headCount: await headCount(),
        };
        return res.json(studentObj);
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).json(err);
      });
  },
  // Get a single student
  getSingleStudent(req, res) {
    Student.findOne({ _id: req.params.studentId })
      .select('-__v')
      .then(async (student) =>
        !student
          ? res.status(404).json({ message: 'No student with that ID' })
          : res.json({
              student,
              grade: await grade(req.params.studentId),
            })
      )
      .catch((err) => {
        console.log(err);
        return res.status(500).json(err);
      });
  },
  // create a new student
  createStudent(req, res) {
    Student.create(req.body)
      .then((student) => res.json(student))
      .catch((err) => res.status(500).json(err));
  },
  // Delete a student and remove them from the course
  deleteStudent(req, res) {
    Student.findOneAndRemove({ _id: req.params.studentId })
      .then((student) =>
        !student
          ? res.status(404).json({ message: 'No such student exists' })
          : Course.findOneAndUpdate(
              { students: req.params.studentId },
              { $pull: { students: req.params.studentId } },
              { new: true }
            )
      )
      .then((course) =>
        !course
          ? res.status(404).json({
              message: 'Student deleted, but no courses found',
            })
          : res.json({ message: 'Student successfully deleted' })
      )
      .catch((err) => {
        console.log(err);
        res.status(500).json(err);
      });
  },

  // Add an assignment to a student
  addAssignment(req, res) {
    console.log('You are adding an assignment');
    console.log(req.body);
    Student.findOneAndUpdate(
      { _id: req.params.studentId },
      { $addToSet: { assignments: req.body } },
      { runValidators: true, new: true }
    )
      .then((student) =>
        !student
          ? res
              .status(404)
              .json({ message: 'No student found with that ID :(' })
          : res.json(student)
      )
      .catch((err) => res.status(500).json(err));
  },
  // Remove assignment from a student
  removeAssignment(req, res) {
    Student.findOneAndUpdate(
      { _id: req.params.studentId },
      { $pull: { assignment: { assignmentId: req.params.assignmentId } } },
      { runValidators: true, new: true }
    )
      .then((student) =>
        !student
          ? res
              .status(404)
              .json({ message: 'No student found with that ID :(' })
          : res.json(student)
      )
      .catch((err) => res.status(500).json(err));
  },
};
