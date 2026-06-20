import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const newDbUrl = process.env.DATABASE_URL;

async function main() {
  if (!newDbUrl) {
    console.error("Error: DATABASE_URL environment variable is not defined!");
    process.exit(1);
  }
  console.log("[Merge] Connecting to database...");
  const urlObj = new URL(newDbUrl);
  urlObj.searchParams.delete("ssl");

  const conn = await mysql.createConnection({
    uri: urlObj.toString(),
    ssl: { rejectUnauthorized: true }
  });

  console.log("[Merge] Starting transaction...");
  await conn.query('START TRANSACTION');
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');

  // 統合ペア：[ oldId, newId, name ]
  const pairs = [
    [1, 90002, "山下 晴奈 (#1)"],
    [90001, 60009, "野田 祐希 (#16)"],
    [60010, 90003, "イェー モン ミャ (#17)"]
  ];

  try {
    for (const [oldId, newId, label] of pairs) {
      console.log(`[Merge] Merging duplicate data for: ${label} (ID: ${oldId} ➔ ${newId})...`);

      // 1. treatments
      const [resTreatments] = await conn.query(
        'UPDATE `treatments` SET `playerId` = ? WHERE `playerId` = ?',
        [newId, oldId]
      ) as any;
      console.log(`  - treatments updated: ${resTreatments.affectedRows} rows`);

      // 2. exercises (セルフケア)
      const [resExercises] = await conn.query(
        'UPDATE `exercises` SET `playerId` = ? WHERE `playerId` = ?',
        [newId, oldId]
      ) as any;
      console.log(`  - exercises updated: ${resExercises.affectedRows} rows`);

      // 3. programs
      const [resPrograms] = await conn.query(
        'UPDATE `programs` SET `athleteId` = ? WHERE `athleteId` = ?',
        [newId, oldId]
      ) as any;
      console.log(`  - programs updated: ${resPrograms.affectedRows} rows`);

      // 4. records
      const [resRecords] = await conn.query(
        'UPDATE `records` SET `athleteId` = ? WHERE `athleteId` = ?',
        [newId, oldId]
      ) as any;
      console.log(`  - records updated: ${resRecords.affectedRows} rows`);

      // 5. photos
      const [resPhotos] = await conn.query(
        'UPDATE `photos` SET `athleteId` = ? WHERE `athleteId` = ?',
        [newId, oldId]
      ) as any;
      console.log(`  - photos updated: ${resPhotos.affectedRows} rows`);

      // 6. delete old player master
      const [resDelete] = await conn.query(
        'DELETE FROM `players` WHERE `id` = ?',
        [oldId]
      ) as any;
      console.log(`  - old player deleted: ${resDelete.affectedRows} row`);
    }

    console.log("[Merge] Committing transaction...");
    await conn.query('COMMIT');
    console.log("[Merge] Duplicate players successfully merged and cleaned up!");
  } catch (error) {
    console.error("[Merge] Error occurred during merging, rolling back transaction...", error);
    await conn.query('ROLLBACK');
    throw error;
  } finally {
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    await conn.end();
  }
}

main().catch(console.error);
