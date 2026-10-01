const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0, I/1 to avoid ambiguity

function generateClassCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

async function generateUniqueClassCode(Classroom) {
  let code;
  let exists = true;
  while (exists) {
    code = generateClassCode();
    exists = await Classroom.exists({ code });
  }
  return code;
}

module.exports = { generateClassCode, generateUniqueClassCode };
