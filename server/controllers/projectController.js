const Project = require('../models/Project');
const Classroom = require('../models/Classroom');
const Assignment = require('../models/Assignment');
const { asyncHandler } = require('../middleware/errorHandler');

const STATUSES = Project.schema.path('status').enumValues;

function memberInfo(classroom, user) {
  const isTeacher = classroom.teacher.equals(user._id);
  const isStudent = classroom.students.some((s) => s.equals(user._id));
  return { isTeacher, isStudent, ok: isTeacher || isStudent };
}

const createProject = asyncHandler(async (req, res) => {
  const classroom = await Classroom.findById(req.params.classroomId);
  if (!classroom) return res.status(404).json({ message: 'Classroom not found.' });

  const { isTeacher, ok } = memberInfo(classroom, req.user);
  if (!ok) return res.status(403).json({ message: 'You are not a member of this classroom.' });

  const { title, problemStatement, currentStage, teamMembers } = req.body;
  if (!title || !problemStatement || !currentStage) {
    return res.status(400).json({ message: 'Title, problem statement and stage are required.' });
  }

  const stages = Assignment.STAGES_BY_CATEGORY[classroom.category] || [];
  if (!stages.includes(currentStage)) {
    return res.status(400).json({ message: `Stage must be one of: ${stages.join(', ')}.` });
  }

  let team = [req.user._id];
  if (Array.isArray(teamMembers) && teamMembers.length) {
    const allowed = new Set(classroom.students.map(String));
    if (teamMembers.some((id) => !allowed.has(String(id)))) {
      return res.status(400).json({ message: 'Team members must be students of this classroom.' });
    }
    team = teamMembers;
  } else if (isTeacher) {
    team = [];
  }

  const project = await Project.create({
    classroom: classroom._id,
    title,
    problemStatement,
    category: classroom.category,
    currentStage,
    teamMembers: team,
    mentor: classroom.teacher,
    createdBy: req.user._id,
  });

  res.status(201).json({ project });
});

const listByClassroom = asyncHandler(async (req, res) => {
  const classroom = await Classroom.findById(req.params.classroomId);
  if (!classroom) return res.status(404).json({ message: 'Classroom not found.' });
  if (!memberInfo(classroom, req.user).ok) {
    return res.status(403).json({ message: 'You are not a member of this classroom.' });
  }

  const projects = await Project.find({ classroom: classroom._id })
    .populate('teamMembers', 'name avatarColor')
    .populate('mentor', 'name')
    .sort({ createdAt: -1 });
  res.json({ projects });
});

const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('teamMembers', 'name email avatarColor')
    .populate('mentor', 'name email');
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const classroom = await Classroom.findById(project.classroom);
  if (!classroom || !memberInfo(classroom, req.user).ok) {
    return res.status(403).json({ message: 'You are not a member of this classroom.' });
  }
  res.json({ project });
});

const updateProjectStage = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const classroom = await Classroom.findById(project.classroom);
  const { isTeacher } = classroom ? memberInfo(classroom, req.user) : {};
  const onTeam = project.teamMembers.some((m) => m.equals(req.user._id)) || project.createdBy.equals(req.user._id);
  if (!isTeacher && !onTeam) {
    return res.status(403).json({ message: 'Only the mentor or a team member can update this project.' });
  }

  const { currentStage, status } = req.body;
  if (currentStage) {
    const stages = Assignment.STAGES_BY_CATEGORY[project.category] || [];
    if (!stages.includes(currentStage)) {
      return res.status(400).json({ message: `Stage must be one of: ${stages.join(', ')}.` });
    }
    project.currentStage = currentStage;
  }
  if (status) {
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${STATUSES.join(', ')}.` });
    }
    project.status = status;
  }
  await project.save();
  res.json({ project });
});

module.exports = { createProject, listByClassroom, getProject, updateProjectStage };
