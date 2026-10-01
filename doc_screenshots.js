const { chromium } = require('playwright');
const SHOT_DIR = 'C:\\Users\\kamra\\AppData\\Local\\Temp\\claude\\c--Kamran-Btech-Sem-5-CNT-Assigment-4-website\\675362df-2fd0-447e-844e-09b258b63082\\scratchpad\\docshots';
require('fs').mkdirSync(SHOT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. Landing page
  await page.goto('http://localhost:5000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOT_DIR}/01-landing.png` });

  // 2. Landing - categories section
  await page.evaluate(() => document.querySelector('#categories').scrollIntoView());
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOT_DIR}/02-categories.png` });

  // 3. Register page
  await page.goto('http://localhost:5000/register.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOT_DIR}/03-register.png` });

  // 4. Login page
  await page.goto('http://localhost:5000/login.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOT_DIR}/04-login.png` });

  // 5. Teacher dashboard
  await page.fill('#email', 'teacher@vit.edu');
  await page.fill('#password', 'password123');
  await page.click('#submitBtn');
  await page.waitForURL('**/teacher-dashboard.html', { timeout: 8000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOT_DIR}/05-teacher-dashboard.png`, fullPage: true });

  // 6. Classroom - stream tab
  await page.click('#classroomGrid a, #classroomGrid .card-app');
  await page.waitForURL('**/classroom.html*', { timeout: 8000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOT_DIR}/06-classroom-stream.png`, fullPage: true });

  // 7. Classroom - assignments tab
  await page.click('button[data-bs-target="#tab-assignments"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOT_DIR}/07-classroom-assignments.png`, fullPage: true });

  // 8. Classroom - people tab
  await page.click('button[data-bs-target="#tab-people"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOT_DIR}/08-classroom-people.png`, fullPage: true });

  // 9. Assignment detail / grading roster (teacher view)
  await page.click('button[data-bs-target="#tab-assignments"]');
  await page.waitForTimeout(300);
  await page.click('#tab-assignments .card-app');
  await page.waitForURL('**/assignment.html*', { timeout: 8000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOT_DIR}/09-assignment-roster.png`, fullPage: true });

  // 10. Submission grading page
  const gradeBtn = await page.$('#rosterBody a.btn');
  if (gradeBtn) {
    await gradeBtn.click();
    await page.waitForURL('**/submission.html*', { timeout: 8000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOT_DIR}/10-submission-grading.png`, fullPage: true });
  }

  // Logout, then student flow
  await page.evaluate(() => { localStorage.clear(); });

  // 11. Student dashboard
  await page.goto('http://localhost:5000/login.html', { waitUntil: 'networkidle' });
  await page.fill('#email', 'arjun.mehta2023@vit.edu');
  await page.fill('#password', 'password123');
  await page.click('#submitBtn');
  await page.waitForURL('**/student-dashboard.html', { timeout: 8000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOT_DIR}/11-student-dashboard.png`, fullPage: true });

  // 12. Student - graded assignment view
  const gradedRow = await page.$('#assignmentTableBody tr');
  if (gradedRow) {
    await gradedRow.click();
    await page.waitForURL('**/assignment.html*', { timeout: 8000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${SHOT_DIR}/12-student-assignment.png`, fullPage: true });
  }

  await browser.close();
  console.log('SCREENSHOTS_DONE');
})().catch((err) => { console.error('FAILED:', err.message); process.exit(1); });
