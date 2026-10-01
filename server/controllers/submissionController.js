const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const Classroom = require('../models/Classroom');
const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/errorHandler');
const fs = require('fs');

function discardUploads(files) {
  (files || []).forEach((f) => fs.unlink(f.path, () => {}));
}

const submitAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.assignmentId);
  if (!assignment) {
    discardUploads(req.files);
    return res.status(404).json({ message: 'Assignment not found.' });
  }

  const classroom = await Classroom.findById(assignment.classroom);
  const isStudent = classroom.students.some((s) => s.equals(req.user._id));
  if (!isStudent) {
    discardUploads(req.files);
    return res.status(403).json({ message: 'You are not enrolled in this classroom.' });
  }

  const existing = await Submission.findOne({ assignment: assignment._id, student: req.user._id });
  if (existing && existing.status === 'graded') {
    discardUploads(req.files);
    return res.status(409).json({ message: 'This submission has already been graded and can no longer be changed.' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'At least one file is required.' });
  }

  const files = req.files.map((f) => ({
    originalName: f.originalname,
    filename: f.filename,
    path: `/uploads/submissions/${f.filename}`,
    mimetype: f.mimetype,
    size: f.size,
  }));

  const isLate = new Date() > new Date(assignment.deadline);
  const now = new Date();

  const submission = await Submission.findOneAndUpdate(
    { assignment: assignment._id, student: req.user._id },
    {
      $set: {
        classroom: classroom._id,
        files,
        note: req.body.note || '',
        status: isLate ? 'late' : 'submitted',
        submittedAt: now,
        marks: null,
        feedback: '',
        gradedBy: null,
        gradedAt: null,
      },
    },
    { upsert: true, new: true }
  );

  await Notification.create({
    user: assignment.createdBy,
    message: `${req.user.name} submitted "${assignment.title}".`,
    type: 'assignment',
    link: `/submission.html?id=${submission._id}`,
  });

  res.status(201).json({ submission });
});

const getMySubmission = asyncHandler(async (req, res) => {
  const submission = await Submission.findOne({
    assignment: req.params.assignmentId,
    student: req.user._id,
  });
  res.json({ submission: submission || null });
});

const listByAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.assignmentId);
  if (!assignment) return res.status(404).json({ message: 'Assignment not found.' });
  if (!assignment.createdBy.equals(req.user._id)) {
    return res.status(403).json({ message: 'Only the assignment creator can view submissions.' });
  }

  const classroom = await Classroom.findById(assignment.classroom).populate(
    'students',
    'name email regNo avatarColor'
  );
  const submissions = await Submission.find({ assignment: assignment._id }).populate(
    'student',
    'name email regNo avatarColor'
  );
  const subMap = Object.fromEntries(submissions.map((s) => [s.student._id.toString(), s]));

  const roster = classroom.students.map((student) => ({
    student,
    submission: subMap[student._id.toString()] || null,
  }));

  res.json({ assignment, roster });
});

const getSubmission = asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.id)
    .populate('student', 'name email regNo avatarColor')
    .populate('assignment')
    .populate('gradedBy', 'name');
  if (!submission) return res.status(404).json({ message: 'Submission not found.' });

  const isOwner = submission.student._id.equals(req.user._id);
  const isGrader = submission.assignment.createdBy.equals(req.user._id);
  if (!isOwner && !isGrader) {
    return res.status(403).json({ message: 'You cannot view this submission.' });
  }

  res.json({ submission, canGrade: isGrader });
});

const gradeSubmission = asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.id).populate('assignment');
  if (!submission) return res.status(404).json({ message: 'Submission not found.' });
  if (!submission.assignment.createdBy.equals(req.user._id)) {
    return res.status(403).json({ message: 'Only the assignment creator can grade submissions.' });
  }

  const { marks, feedback } = req.body;
  const marksNum = Number(marks);
  if (marks === undefined || marks === null || String(marks).trim() === '' || Number.isNaN(marksNum) || marksNum < 0 || marksNum > submission.assignment.maxMarks) {
    return res.status(400).json({ message: `Marks must be between 0 and ${submission.assignment.maxMarks}.` });
  }

  submission.marks = marksNum;
  submission.feedback = feedback || '';
  submission.status = 'graded';
  submission.gradedBy = req.user._id;
  submission.gradedAt = new Date();
  await submission.save();

  await Notification.create({
    user: submission.student,
    message: `Your submission for "${submission.assignment.title}" was graded: ${marksNum}/${submission.assignment.maxMarks}.`,
    type: 'grade',
    link: `/submission.html?id=${submission._id}`,
  });

  res.json({ submission });
});

module.exports = {
  submitAssignment,
  getMySubmission,
  listByAssignment,
  getSubmission,
  gradeSubmission,
};
