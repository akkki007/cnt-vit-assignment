const { validationResult } = require('express-validator');
const Classroom = require('../models/Classroom');
const Notification = require('../models/Notification');
const { generateUniqueClassCode } = require('../utils/generateCode');
const { asyncHandler } = require('../middleware/errorHandler');

const createClassroom = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const { name, subject, category, description, coverColor } = req.body;
  const code = await generateUniqueClassCode(Classroom);

  const classroom = await Classroom.create({
    name,
    subject,
    category,
    description,
    coverColor,
    code,
    teacher: req.user._id,
  });

  res.status(201).json({ classroom });
});

const listMyClassrooms = asyncHandler(async (req, res) => {
  const query =
    req.user.role === 'teacher' ? { teacher: req.user._id } : { students: req.user._id };

  const classrooms = await Classroom.find(query)
    .populate('teacher', 'name email department avatarColor')
    .sort({ createdAt: -1 });

  res.json({ classrooms });
});

const getClassroom = asyncHandler(async (req, res) => {
  const classroom = await Classroom.findById(req.params.id)
    .populate('teacher', 'name email department avatarColor')
    .populate('students', 'name email regNo department avatarColor');

  if (!classroom) return res.status(404).json({ message: 'Classroom not found.' });

  const isTeacher = classroom.teacher._id.equals(req.user._id);
  const isMember = classroom.students.some((s) => s._id.equals(req.user._id));
  if (!isTeacher && !isMember) {
    return res.status(403).json({ message: 'You are not a member of this classroom.' });
  }

  res.json({ classroom, isTeacher });
});

const joinClassroom = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ message: 'Classroom code is required.' });

  const classroom = await Classroom.findOne({ code: code.trim().toUpperCase() });
  if (!classroom) return res.status(404).json({ message: 'Invalid classroom code.' });

  if (classroom.students.some((id) => id.equals(req.user._id))) {
    return res.status(409).json({ message: 'You have already joined this classroom.' });
  }

  classroom.students.push(req.user._id);
  await classroom.save();

  await Notification.create({
    user: classroom.teacher,
    message: `${req.user.name} joined "${classroom.name}".`,
    type: 'classroom',
    link: `/classroom.html?id=${classroom._id}`,
  });

  res.json({ classroom });
});

const removeStudent = asyncHandler(async (req, res) => {
  const classroom = await Classroom.findById(req.params.id);
  if (!classroom) return res.status(404).json({ message: 'Classroom not found.' });
  if (!classroom.teacher.equals(req.user._id)) {
    return res.status(403).json({ message: 'Only the classroom teacher can remove students.' });
  }

  classroom.students = classroom.students.filter((s) => !s.equals(req.params.studentId));
  await classroom.save();
  res.json({ classroom });
});

module.exports = { createClassroom, listMyClassrooms, getClassroom, joinClassroom, removeStudent };
