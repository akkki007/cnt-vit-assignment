require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { generateUniqueClassCode } = require('./generateCode');

const User = require('../models/User');
const Classroom = require('../models/Classroom');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Resource = require('../models/Resource');
const Project = require('../models/Project');
const Notification = require('../models/Notification');

const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

async function seed() {
  await connectDB();
  console.log('[seed] clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Classroom.deleteMany({}),
    Assignment.deleteMany({}),
    Submission.deleteMany({}),
    Resource.deleteMany({}),
    Project.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  console.log('[seed] creating users...');
  const teacher = await User.create({
    name: 'Dr. Anjali Rao',
    email: 'teacher@vit.edu',
    password: 'password123',
    role: 'teacher',
    department: 'Computer Science',
  });

  const teacher2 = await User.create({
    name: 'Prof. Suresh Iyer',
    email: 'suresh.iyer@vit.edu',
    password: 'password123',
    role: 'teacher',
    department: 'Mechanical Engineering',
  });

  const studentData = [
    ['Arjun Mehta', 'arjun.mehta2023@vit.edu', '21510101'],
    ['Priya Sharma', 'priya.sharma2023@vit.edu', '21510102'],
    ['Karthik Nair', 'karthik.nair2023@vit.edu', '21510103'],
    ['Sneha Reddy', 'sneha.reddy2023@vit.edu', '21510104'],
    ['Rohan Gupta', 'rohan.gupta2023@vit.edu', '21510105'],
    ['Divya Menon', 'divya.menon2023@vit.edu', '21510106'],
  ];

  const students = [];
  for (const [name, email, regNo] of studentData) {
    const student = await User.create({
      name,
      email,
      password: 'password123',
      role: 'student',
      regNo,
      department: 'Computer Science',
    });
    students.push(student);
  }

  console.log('[seed] creating classrooms...');
  const classroomDefs = [
    {
      name: 'Software Development Project - Batch A',
      subject: 'CSE3999',
      category: 'SDP',
      description: 'End-to-end software product development following the SDLC.',
      coverColor: '#4f46e5',
      teacher,
      members: [0, 1, 2, 3],
    },
    {
      name: 'Engineering Design & Innovation',
      subject: 'ENG1002',
      category: 'EDI',
      description: 'Cross-disciplinary innovation projects solving real-world engineering problems.',
      coverColor: '#0ea5e9',
      teacher: teacher2,
      members: [1, 2, 4, 5],
    },
    {
      name: 'Design Thinking Studio',
      subject: 'HUM1001',
      category: 'DT',
      description: 'Human-centered design practice: empathize, define, ideate, prototype, test.',
      coverColor: '#10b981',
      teacher,
      members: [0, 3, 4, 5],
    },
    {
      name: 'Data Structures - Course Projects',
      subject: 'CSE2001',
      category: 'Course Project',
      description: 'Applied mini-projects reinforcing core data structures & algorithms concepts.',
      coverColor: '#f59e0b',
      teacher: teacher2,
      members: [0, 1, 2, 3, 4, 5],
    },
  ];

  const classrooms = [];
  for (const def of classroomDefs) {
    const code = await generateUniqueClassCode(Classroom);
    const classroom = await Classroom.create({
      name: def.name,
      subject: def.subject,
      category: def.category,
      description: def.description,
      coverColor: def.coverColor,
      code,
      teacher: def.teacher._id,
      students: def.members.map((i) => students[i]._id),
    });
    classrooms.push(classroom);
  }

  const [sdp, edi, dt, course] = classrooms;

  console.log('[seed] creating assignments...');
  const assignmentDefs = [
    // SDP
    { c: sdp, title: 'Requirements Specification Document', stage: 'Requirements', maxMarks: 50, deadline: daysFromNow(-10), desc: 'Prepare a detailed SRS covering functional and non-functional requirements for your chosen product idea.' },
    { c: sdp, title: 'System Design & Architecture', stage: 'Design', maxMarks: 50, deadline: daysFromNow(-3), desc: 'Submit high-level and low-level design diagrams, ER diagrams, and API contracts.' },
    { c: sdp, title: 'Sprint 1 Development Build', stage: 'Development', maxMarks: 100, deadline: daysFromNow(5), desc: 'Submit your first working sprint build with source code and a demo video link.' },
    { c: sdp, title: 'Test Plan & QA Report', stage: 'Testing', maxMarks: 50, deadline: daysFromNow(14), desc: 'Prepare unit/integration test plans and a bug tracking report.' },
    // EDI
    { c: edi, title: 'Problem Research Report', stage: 'Research', maxMarks: 40, deadline: daysFromNow(-7), desc: 'Identify a real-world engineering problem and document background research with citations.' },
    { c: edi, title: 'Ideation Canvas', stage: 'Ideation', maxMarks: 30, deadline: daysFromNow(-1), desc: 'Brainstorm and document at least 5 candidate solutions using the ideation canvas template.' },
    { c: edi, title: 'Concept Design Document', stage: 'Design', maxMarks: 60, deadline: daysFromNow(7), desc: 'Detail your chosen concept with CAD sketches / block diagrams and material selection.' },
    { c: edi, title: 'Working Prototype Submission', stage: 'Prototype', maxMarks: 100, deadline: daysFromNow(21), desc: 'Submit prototype photos/videos, BOM, and a working demonstration.' },
    // DT
    { c: dt, title: 'Empathy Map & User Interviews', stage: 'Empathize', maxMarks: 30, deadline: daysFromNow(-5), desc: 'Conduct 5 user interviews and build an empathy map for your target persona.' },
    { c: dt, title: 'Problem Definition Statement', stage: 'Define', maxMarks: 20, deadline: daysFromNow(2), desc: 'Craft a clear point-of-view / "How Might We" problem statement.' },
    { c: dt, title: 'Ideation Workshop Output', stage: 'Ideate', maxMarks: 30, deadline: daysFromNow(9), desc: 'Document your brainstorming session output with at least 10 ideas, dot-voted.' },
    // Course Project
    { c: course, title: 'Mini Project: Custom Data Structure Library', stage: 'Assignment', maxMarks: 100, deadline: daysFromNow(4), desc: 'Implement a small library (stack, queue, linked list, BST) in a language of your choice with test cases.' },
    { c: course, title: 'Algorithm Complexity Analysis Report', stage: 'Assignment', maxMarks: 40, deadline: daysFromNow(-2), desc: 'Analyze time/space complexity of 3 sorting algorithms with benchmarks.' },
  ];

  const assignments = [];
  for (const def of assignmentDefs) {
    const a = await Assignment.create({
      classroom: def.c._id,
      title: def.title,
      description: def.desc,
      category: def.c.category,
      stage: def.stage,
      maxMarks: def.maxMarks,
      deadline: def.deadline,
      createdBy: def.c.teacher,
    });
    assignments.push(a);
  }

  console.log('[seed] creating sample submissions...');
  const gradedFeedback = [
    'Solid work overall — well structured and covers the key requirements. Improve citation formatting next time.',
    'Good effort. The design choices are reasonable but consider edge cases more carefully.',
    'Excellent documentation and clarity. Keep up the great work!',
  ];

  const pastAssignments = assignments.filter((a) => new Date(a.deadline) < new Date());
  for (const a of pastAssignments) {
    const classroom = classrooms.find((c) => c._id.equals(a.classroom));
    const enrolled = classroom.students;
    for (let i = 0; i < enrolled.length; i++) {
      const shouldSubmit = Math.random() > 0.25;
      if (!shouldSubmit) continue;
      const graded = Math.random() > 0.4;
      await Submission.create({
        assignment: a._id,
        classroom: classroom._id,
        student: enrolled[i],
        files: [
          {
            originalName: `${a.title.replace(/\s+/g, '_')}.pdf`,
            filename: `demo-${a._id}-${i}.pdf`,
            path: `/uploads/submissions/demo-placeholder.pdf`,
            mimetype: 'application/pdf',
            size: 245760,
          },
        ],
        note: 'Please find attached my submission for this task.',
        status: graded ? 'graded' : 'submitted',
        submittedAt: new Date(new Date(a.deadline).getTime() - 2 * 60 * 60 * 1000),
        marks: graded ? Math.round(a.maxMarks * (0.65 + Math.random() * 0.35)) : null,
        feedback: graded ? gradedFeedback[Math.floor(Math.random() * gradedFeedback.length)] : '',
        gradedBy: graded ? a.createdBy : null,
        gradedAt: graded ? new Date() : null,
      });
    }
  }

  console.log('[seed] creating resources...');
  await Resource.create([
    {
      classroom: sdp._id,
      title: 'SRS Template (IEEE 830)',
      description: 'Standard template to structure your requirements document.',
      file: { originalName: 'srs-template.pdf', filename: 'srs-template.pdf', path: '/uploads/resources/demo-placeholder.pdf', mimetype: 'application/pdf', size: 102400 },
      uploadedBy: sdp.teacher,
    },
    {
      classroom: edi._id,
      title: 'Ideation Canvas Template',
      description: 'Use this canvas to structure your brainstorming session.',
      file: { originalName: 'ideation-canvas.pdf', filename: 'ideation-canvas.pdf', path: '/uploads/resources/demo-placeholder.pdf', mimetype: 'application/pdf', size: 87040 },
      uploadedBy: edi.teacher,
    },
    {
      classroom: dt._id,
      title: 'Empathy Map Worksheet',
      description: 'Worksheet to capture what users say, think, feel, and do.',
      file: { originalName: 'empathy-map.pdf', filename: 'empathy-map.pdf', path: '/uploads/resources/demo-placeholder.pdf', mimetype: 'application/pdf', size: 64000 },
      uploadedBy: dt.teacher,
    },
    {
      classroom: course._id,
      title: 'Big-O Cheat Sheet',
      description: 'Quick reference for time/space complexity of common algorithms.',
      file: { originalName: 'big-o-cheatsheet.pdf', filename: 'big-o-cheatsheet.pdf', path: '/uploads/resources/demo-placeholder.pdf', mimetype: 'application/pdf', size: 51200 },
      uploadedBy: course.teacher,
    },
  ]);

  console.log('[seed] creating sample projects...');
  await Project.create([
    {
      classroom: sdp._id,
      title: 'CampusEats - Food Ordering Platform',
      problemStatement: 'Students struggle with long queues at campus food courts during peak hours.',
      category: 'SDP',
      currentStage: 'Development',
      teamMembers: [students[0]._id, students[1]._id],
      mentor: sdp.teacher,
      createdBy: students[0]._id,
    },
    {
      classroom: edi._id,
      title: 'Smart Irrigation Controller',
      problemStatement: 'Small-scale farmers lack affordable automated irrigation solutions.',
      category: 'EDI',
      currentStage: 'Prototype',
      teamMembers: [students[1]._id, students[4]._id],
      mentor: edi.teacher,
      createdBy: students[1]._id,
    },
  ]);

  console.log('[seed] creating notifications...');
  await Notification.create(
    students.slice(0, 3).map((s) => ({
      user: s._id,
      message: 'Welcome to VIT ProjectHub! Explore your classrooms to get started.',
      type: 'general',
      link: '/student-dashboard.html',
    }))
  );

  console.log('\n[seed] Done! Demo credentials (password: password123):');
  console.log('  Teacher: teacher@vit.edu');
  console.log('  Teacher: suresh.iyer@vit.edu');
  studentData.forEach(([, email]) => console.log(`  Student: ${email}`));

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
