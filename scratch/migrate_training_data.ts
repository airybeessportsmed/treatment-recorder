import mysql from 'mysql2/promise';

const oldDbUrl = 'mysql://3wWusUPY7FKqAQS.root:hRtC9R44ZKsl43cWaV1A@gateway05.us-east-1.prod.aws.tidbcloud.com:4000/Wd3jRx8DMBsEi2YbyYmjv8?ssl={"rejectUnauthorized":true}';
const newDbUrl = 'mysql://3wWusUPY7FKqAQS.e1cb3a6ce36e:3uFWhpWZM7XN62AQ41WM@gateway05.us-east-1.prod.aws.tidbcloud.com:4000/GokYB7b6cAycMQ8z4eriap?ssl={"rejectUnauthorized":true}';

async function main() {
  console.log("[Migration] Starting data migration from old Training App to new Treatment App...");

  // URLのパース（mysql2が ssl パラメータでクラッシュするのを防ぐため、URLパラメータから削除）
  const oldUrlObj = new URL(oldDbUrl);
  oldUrlObj.searchParams.delete("ssl");
  const newUrlObj = new URL(newDbUrl);
  newUrlObj.searchParams.delete("ssl");

  const oldConn = await mysql.createConnection({
    uri: oldUrlObj.toString(),
    ssl: { rejectUnauthorized: true }
  });
  const newConn = await mysql.createConnection({
    uri: newUrlObj.toString(),
    ssl: { rejectUnauthorized: true }
  });

  console.log("[Migration] Connected to both databases successfully.");

  // 一時的に外部キー制約チェックを無効化して安全にバルクインサートする
  await newConn.query('SET FOREIGN_KEY_CHECKS = 0');

  try {
    // ---- 1. users ----
    console.log("[Migration] Migrating users...");
    const [oldUsers] = await oldConn.query('SELECT * FROM users') as any[];
    const userMap = new Map<number, number>(); // oldId -> newId

    for (const ou of oldUsers) {
      const [existing] = await newConn.query('SELECT id FROM users WHERE openId = ?', [ou.openId]) as any[];
      if (existing.length > 0) {
        userMap.set(ou.id, existing[0].id);
        // 新DBのユーザー情報を更新
        await newConn.query(
          'UPDATE users SET name = ?, email = ?, loginMethod = ?, role = ?, lastSignedIn = ? WHERE id = ?',
          [ou.name, ou.email, ou.loginMethod, ou.role, ou.lastSignedIn, existing[0].id]
        );
      } else {
        const [res] = await newConn.query(
          'INSERT INTO `users` (`openId`, `name`, `email`, `loginMethod`, `role`, `createdAt`, `updatedAt`, `lastSignedIn`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [ou.openId, ou.name, ou.email, ou.loginMethod, ou.role, ou.createdAt, ou.updatedAt, ou.lastSignedIn]
        ) as any;
        userMap.set(ou.id, res.insertId);
      }
    }
    console.log(`[Migration] Users migrated: ${userMap.size} users mapped.`);

    // ---- 2. athletes -> players ----
    console.log("[Migration] Migrating athletes to players...");
    const [oldAthletes] = await oldConn.query('SELECT * FROM athletes') as any[];
    const playerMap = new Map<number, number>(); // oldAthleteId -> newPlayerId

    for (const oa of oldAthletes) {
      const [existing] = await newConn.query('SELECT id, bodyWeight, notes FROM players WHERE name = ?', [oa.name]) as any[];
      if (existing.length > 0) {
        const newPlayerId = existing[0].id;
        playerMap.set(oa.id, newPlayerId);
        // 体重やメモ情報をマージ（新しい方が空の場合にのみ上書き）
        await newConn.query(
          'UPDATE players SET bodyWeight = COALESCE(bodyWeight, ?), notes = COALESCE(notes, ?) WHERE id = ?',
          [oa.bodyWeight, oa.notes, newPlayerId]
        );
      } else {
        // 新規選手として players テーブルへ追加
        const number = oa.number ?? 0;
        const position = oa.position ?? '';
        const createdBy = 1; // デフォルト管理者ID
        const [res] = await newConn.query(
          'INSERT INTO `players` (`name`, `number`, `position`, `bodyWeight`, `notes`, `isActive`, `createdBy`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)',
          [oa.name, number, position, oa.bodyWeight, oa.notes, createdBy, oa.createdAt, oa.updatedAt]
        ) as any;
        playerMap.set(oa.id, res.insertId);
      }
    }
    console.log(`[Migration] Athletes migrated to players: ${playerMap.size} mapped.`);

    // ---- 3. programs ----
    console.log("[Migration] Migrating programs...");
    const [oldPrograms] = await oldConn.query('SELECT * FROM programs') as any[];
    const programMap = new Map<number, number>(); // oldProgramId -> newProgramId

    for (const op of oldPrograms) {
      const newPlayerId = playerMap.get(op.athleteId);
      if (!newPlayerId) {
        console.warn(`[Migration] Warning: athleteId ${op.athleteId} not found in players. Skipping program ${op.id}`);
        continue;
      }
      const [res] = await newConn.query(
        'INSERT INTO `programs` (`athleteId`, `date`, `phase`, `periodCategory`, `goal`, `bodyWeight`, `totalSets`, `notes`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [newPlayerId, op.date, op.phase, op.periodCategory, op.goal, op.bodyWeight, op.totalSets, op.notes, op.createdAt, op.updatedAt]
      ) as any;
      programMap.set(op.id, res.insertId);
    }
    console.log(`[Migration] Programs migrated: ${programMap.size} programs.`);

    // ---- 4. sections ----
    console.log("[Migration] Migrating sections...");
    const [oldSections] = await oldConn.query('SELECT * FROM sections') as any[];
    const sectionMap = new Map<number, number>(); // oldSectionId -> newSectionId

    for (const os of oldSections) {
      const newProgId = programMap.get(os.programId);
      if (!newProgId) {
        console.warn(`[Migration] Warning: programId ${os.programId} not mapped. Skipping section ${os.id}`);
        continue;
      }
      const [res] = await newConn.query(
        'INSERT INTO `sections` (`programId`, `category`, `sortOrder`, `createdAt`) VALUES (?, ?, ?, ?)',
        [newProgId, os.category, os.sortOrder, os.createdAt]
      ) as any;
      sectionMap.set(os.id, res.insertId);
    }
    console.log(`[Migration] Sections migrated: ${sectionMap.size} sections.`);

    // ---- 5. exercises -> training_exercises ----
    console.log("[Migration] Migrating exercises (plans)...");
    const [oldExercises] = await oldConn.query('SELECT * FROM exercises') as any[];
    const exerciseMap = new Map<number, number>(); // oldExerciseId -> newExerciseId

    for (const oe of oldExercises) {
      const newSecId = sectionMap.get(oe.sectionId);
      if (!newSecId) {
        console.warn(`[Migration] Warning: sectionId ${oe.sectionId} not mapped. Skipping exercise ${oe.id}`);
        continue;
      }
      const [res] = await newConn.query(
        'INSERT INTO `training_exercises` (`sectionId`, `name`, `sets`, `reps`, `load`, `attention`, `sortOrder`, `createdAt`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [newSecId, oe.name, oe.sets, oe.reps, oe.load, oe.attention, oe.sortOrder, oe.createdAt]
      ) as any;
      exerciseMap.set(oe.id, res.insertId);
    }
    console.log(`[Migration] Exercises migrated: ${exerciseMap.size} items.`);

    // ---- 6. records ----
    console.log("[Migration] Migrating records (performance)...");
    const [oldRecords] = await oldConn.query('SELECT * FROM records') as any[];
    let recordsMigrated = 0;

    for (const or of oldRecords) {
      const newProgId = programMap.get(or.programId);
      const newExeId = exerciseMap.get(or.exerciseId);
      const newPlayerId = playerMap.get(or.athleteId);

      if (!newProgId || !newExeId || !newPlayerId) {
        console.warn(`[Migration] Warning: Missing mapping for record ${or.id} (prog:${newProgId}, exe:${newExeId}, player:${newPlayerId}). Skipping.`);
        continue;
      }

      await newConn.query(
        'INSERT INTO `records` (`programId`, `exerciseId`, `athleteId`, `date`, `actualSets`, `actualReps`, `actualLoad`, `notes`, `source`, `changeReason`, `changeNote`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [newProgId, newExeId, newPlayerId, or.date, or.actualSets, or.actualReps, or.actualLoad, or.notes, or.source, or.changeReason, or.changeNote, or.createdAt, or.updatedAt]
      );
      recordsMigrated++;
    }
    console.log(`[Migration] Records migrated: ${recordsMigrated} records.`);

    // ---- 7. photos ----
    console.log("[Migration] Migrating photos (OCR)...");
    const [oldPhotos] = await oldConn.query('SELECT * FROM photos') as any[];
    let photosMigrated = 0;

    for (const op of oldPhotos) {
      const newProgId = programMap.get(op.programId);
      const newPlayerId = playerMap.get(op.athleteId);

      if (!newProgId || !newPlayerId) {
        console.warn(`[Migration] Warning: Missing mapping for photo ${op.id} (prog:${newProgId}, player:${newPlayerId}). Skipping.`);
        continue;
      }

      const ocrParsedStr = op.ocrParsed ? (typeof op.ocrParsed === 'object' ? JSON.stringify(op.ocrParsed) : op.ocrParsed) : null;

      await newConn.query(
        'INSERT INTO `photos` (`programId`, `athleteId`, `date`, `fileUrl`, `fileKey`, `ocrRawResult`, `ocrParsed`, `status`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [newProgId, newPlayerId, op.date, op.fileUrl, op.fileKey, op.ocrRawResult, ocrParsedStr, op.status, op.createdAt, op.updatedAt]
      );
      photosMigrated++;
    }
    console.log(`[Migration] Photos migrated: ${photosMigrated} photos.`);

    // ---- 8. exercise_master ----
    console.log("[Migration] Migrating exercise_master...");
    const [oldExerciseMaster] = await oldConn.query('SELECT * FROM exercise_master') as any[];
    let masterMigrated = 0;

    for (const oem of oldExerciseMaster) {
      const [existing] = await newConn.query('SELECT id FROM exercise_master WHERE name = ?', [oem.name]) as any[];
      if (existing.length > 0) {
        await newConn.query('UPDATE exercise_master SET usageCount = usageCount + ? WHERE id = ?', [oem.usageCount, existing[0].id]);
      } else {
        await newConn.query(
          'INSERT INTO `exercise_master` (`name`, `category`, `defaultSets`, `defaultReps`, `defaultLoad`, `attention`, `usageCount`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [oem.name, oem.category, oem.defaultSets, oem.defaultReps, oem.defaultLoad, oem.attention, oem.usageCount, oem.createdAt, oem.updatedAt]
        );
        masterMigrated++;
      }
    }
    console.log(`[Migration] Exercise master migrated: ${masterMigrated} items.`);

    // ---- 9. user_approvals ----
    console.log("[Migration] Migrating user_approvals...");
    const [oldApprovals] = await oldConn.query('SELECT * FROM user_approvals') as any[];
    let approvalsMigrated = 0;

    for (const oa of oldApprovals) {
      const newUserId = userMap.get(oa.userId);
      const newApprovedBy = oa.approvedBy ? userMap.get(oa.approvedBy) : null;

      if (!newUserId) {
        console.warn(`[Migration] Warning: userId ${oa.userId} not mapped. Skipping approval ${oa.id}`);
        continue;
      }

      const [existing] = await newConn.query('SELECT id FROM user_approvals WHERE userId = ?', [newUserId]) as any[];
      if (existing.length > 0) {
        await newConn.query(
          'UPDATE user_approvals SET status = ?, approvedBy = ?, approvedAt = ?, note = ? WHERE id = ?',
          [oa.status, newApprovedBy, oa.approvedAt, oa.note, existing[0].id]
        );
      } else {
        await newConn.query(
          'INSERT INTO `user_approvals` (`userId`, `status`, `approvedBy`, `approvedAt`, `note`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [newUserId, oa.status, newApprovedBy, oa.approvedAt, oa.note, oa.createdAt, oa.updatedAt]
        );
        approvalsMigrated++;
      }
    }
    console.log(`[Migration] User approvals migrated: ${approvalsMigrated} approvals.`);

  } finally {
    // 外部キー制約チェックを元に戻す
    await newConn.query('SET FOREIGN_KEY_CHECKS = 1');
    await oldConn.end();
    await newConn.end();
  }

  console.log("[Migration] Data migration completed successfully!");
}

main().catch((err) => {
  console.error("[Migration] Migration failed:", err);
  process.exit(1);
});
