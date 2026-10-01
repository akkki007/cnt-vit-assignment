const { validationResult } = require('express-validator');
const Assignment = require('../models/Assignment');
const Classroom = require('../models/Classroom');
const Submission = require('../models/Submission');
const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/errorHandler');

async function assertMember(classroom, user) {
  const isTeacher = classroom.teacher.equals(user._id);
  const isStudent = classroom.students.some((s) => s.equals(user._id));
  return { isTeacher, isStudent, ok: isTeacher || isStudent };
}

const createAssignment = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const classroom = await Classroom.findById(req.params.classroomId);
  if (!classroom) return res.status(404).json({ message: 'Classroom not found.' });
  if (!classroom.teacher.equals(req.user._id)) {
    return res.status(403).json({ message: 'Only the classroom teacher can create assignments.' });
  }

  const { title, description, stage, maxMarks, deadline } = req.body;

  const assignment = await Assignment.create({
    classroom: classroom._id,
    title,
    description,
    category: classroom.category,
    stage,
    maxMarks,
    deadline,
    createdBy: req.user._id,
  });

  const notifications = classroom.students.map((studentId) => ({
    user: studentId,
    message: `New assignment "${title}" posted in ${classroom.name}.`,
    type: 'assignment',
    link: `/assignment.html?id=${assignment._id}`,
  }));
  if (notifications.length) await Notification.insertMany(notifications);

  res.status(201).json({ assignment });
});

const listByClassroom = asyncHandler(async (req, res) => {
  const classroom = await Classroom.findById(req.params.classroomId);
  if (!classroom) return res.status(404).json({ message: 'Classroom not found.' });

  const { ok, isTeacher } = await assertMember(classroom, req.user);
  if (!ok) return res.status(403).json({ message: 'You are not a member of this classroom.' });

  const assignments = await Assignment.find({ classroom: classroom._id }).sort({ deadline: 1 });

  if (isTeacher) {
    const counts = await Submission.aggregate([
      { $match: { assignment: { $in: assignments.map((a) => a._id) } } },
      { $group: { _id: '$assignment', count: { $sum: 1 }, graded: { $sum: { $cond: [{ $eq: ['$status', 'graded'] }, 1, 0] } } } },
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c]));
    const withCounts = assignments.map((a) => {
      const stat = countMap[a._id.toString()];
      return {
        ...a.toObject(),
        submissionCount: stat ? stat.count : 0,
        gradedCount: stat ? stat.graded : 0,
        totalStudents: classroom.students.length,
      };
    });
    return res.json({ assignments: withCounts });
  }

  const mySubmissions = await Submission.find({
    assignment: { $in: assignments.map((a) => a._id) },
    student: req.user._id,
  });
  const subMap = Object.fromEntries(mySubmissions.map((s) => [s.assignment.toString(), s]));
  const withStatus = assignments.map((a) => {
    const sub = subMap[a._id.toString()];
    let status = 'pending';
    if (sub) status = sub.status;
    else if (new Date(a.deadline) < new Date()) status = 'missed';
    return { ...a.toObject(), mySubmission: sub || null, computedStatus: status };
  });
  res.json({ assignments: withStatus });
});

const getAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id).populate({
    path: 'resources',
    select: 'title file uploadedBy createdAt',
  });
  if (!assignment) return res.status(404).json({ message: 'Assignment not found.' });

  const classroom = await Classroom.findById(assignment.classroom);
  const { ok, isTeacher } = await assertMember(classroom, req.user);
  if (!ok) return res.status(403).json({ message: 'You are not a member of this classroom.' });

  res.json({ assignment, classroom, isTeacher });
});

const updateAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) return res.status(404).json({ message: 'Assignment not found.' });
  if (!assignment.createdBy.equals(req.user._id)) {
    return res.status(403).json({ message: 'Only the assignment creator can edit it.' });
  }

  const { title, description, stage, maxMarks, deadline } = req.body;
  Object.assign(assignment, {
    ...(title && { title }),
    ...(description && { description }),
    ...(stage && { stage }),
    ...(maxMarks && { maxMarks }),
    ...(deadline && { deadline }),
  });
  await assignment.save();
  res.json({ assignment });
});

const deleteAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) return res.status(404).json({ message: 'Assignment not found.' });
  if (!assignment.createdBy.equals(req.user._id)) {
    return res.status(403).json({ message: 'Only the assignment creator can delete it.' });
  }
  await assignment.deleteOne();
  await Submission.deleteMany({ assignment: assignment._id });
  res.json({ message: 'Assignment deleted.' });
});

module.exports = {
  createAssignment,
  listByClassroom,
  getAssignment,
  updateAssignment,
  deleteAssignment,
};
