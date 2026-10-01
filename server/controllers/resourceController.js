const Resource = require('../models/Resource');
const Classroom = require('../models/Classroom');
const Assignment = require('../models/Assignment');
const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/errorHandler');
const fs = require('fs');

function discardUpload(file) {
  if (file) fs.unlink(file.path, () => {});
}

const uploadResource = asyncHandler(async (req, res) => {
  const classroom = await Classroom.findById(req.params.classroomId);
  if (!classroom) {
    discardUpload(req.file);
    return res.status(404).json({ message: 'Classroom not found.' });
  }
  if (!classroom.teacher.equals(req.user._id)) {
    discardUpload(req.file);
    return res.status(403).json({ message: 'Only the classroom teacher can upload resources.' });
  }
  if (!req.file) return res.status(400).json({ message: 'A file is required.' });

  const { title, description, assignmentId } = req.body;

  if (assignmentId) {
    const target = await Assignment.findOne({ _id: assignmentId, classroom: classroom._id });
    if (!target) {
      discardUpload(req.file);
      return res.status(400).json({ message: 'Assignment does not belong to this classroom.' });
    }
  }

  const resource = await Resource.create({
    classroom: classroom._id,
    assignment: assignmentId || null,
    title: title || req.file.originalname,
    description: description || '',
    file: {
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: `/uploads/resources/${req.file.filename}`,
      mimetype: req.file.mimetype,
      size: req.file.size,
    },
    uploadedBy: req.user._id,
  });

  if (assignmentId) {
    await Assignment.findByIdAndUpdate(assignmentId, { $push: { resources: resource._id } });
  }

  const notifications = classroom.students.map((studentId) => ({
    user: studentId,
    message: `New resource "${resource.title}" added to ${classroom.name}.`,
    type: 'resource',
    link: `/classroom.html?id=${classroom._id}&tab=resources`,
  }));
  if (notifications.length) await Notification.insertMany(notifications);

  res.status(201).json({ resource });
});

const listByClassroom = asyncHandler(async (req, res) => {
  const classroom = await Classroom.findById(req.params.classroomId);
  if (!classroom) return res.status(404).json({ message: 'Classroom not found.' });

  const isTeacher = classroom.teacher.equals(req.user._id);
  const isStudent = classroom.students.some((s) => s.equals(req.user._id));
  if (!isTeacher && !isStudent) {
    return res.status(403).json({ message: 'You are not a member of this classroom.' });
  }

  const resources = await Resource.find({ classroom: classroom._id })
    .populate('uploadedBy', 'name')
    .sort({ createdAt: -1 });
  res.json({ resources });
});

module.exports = { uploadResource, listByClassroom };
