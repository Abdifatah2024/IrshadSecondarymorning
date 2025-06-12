// // const ZKLib = require('node-zklib');
// // const axios = require('axios');

// // const zk = new ZKLib('192.168.1.201', 4370, 10000, 4000); // IP, port, timeout, inPort

// // const syncAttendanceLogs = async () => {
// //   try {
// //     console.log('🔌 Connecting to fingerprint device...');
// //     await zk.createSocket();
// //     console.log('✅ Connected to device. Fetching attendance logs...');

// //     const logs = await zk.getAttendances(); // or use getRealTimeLogs() if needed
// //     if (!logs || !logs.data || logs.data.length === 0) {
// //       console.log('❌ No valid logs received.');
// //       await zk.disconnect();
// //       return;
// //     }

// //     console.log(`📦 Total logs received: ${logs.data.length}`);

// //     const seen = new Set();
// //     const uniqueLogs = [];

// //     for (const log of logs.data) {
// //       const studentId = Number(log.deviceUserId || log.userId);
// //       const date = new Date(log.recordTime).toISOString().split('T')[0];
// //       const key = `${studentId}-${date}`;

// //       if (!seen.has(key)) {
// //         seen.add(key);
// //         uniqueLogs.push({
// //           studentId,
// //           timestamp: log.recordTime
// //         });
// //       }
// //     }

// //     console.log(`✅ Unique logs after removing duplicates: ${uniqueLogs.length}`);
// //     console.log('📝 Logs:', uniqueLogs);

// //     // Create attendance by sending to your backend
// //     for (const record of uniqueLogs) {
// //       try {
// //         const response = await axios.post('http://localhost:4000/student/attendance/fingerprint', record);
// //         console.log(`✅ Synced student ${record.studentId}:`, response.data);
// //       } catch (error) {
// //         console.error(`❌ Failed to sync student ${record.studentId}:`, error.response?.data || error.message);
// //       }
// //     }

// //     await zk.disconnect();
// //     console.log('🔌 Disconnected from device.');
// //   } catch (err) {
// //     console.error('❌ Error:', err.message || err);
// //   }
// // };

// // syncAttendanceLogs();
// const ZKLib = require('node-zklib');
// const axios = require('axios');

// const zk = new ZKLib('192.168.1.201', 4370, 10000, 4000); // IP, port, timeout, inPort

// const syncAttendanceLogs = async () => {
//   try {
//     console.log('🔌 Connecting to fingerprint device...');
//     await zk.createSocket();
//     console.log('✅ Connected to device. Fetching attendance logs...');

//    logs = await zk.getAttendances();



//     // Defensive check for invalid response
//     if (!logs || !logs.data || !Array.isArray(logs.data) || logs.data.length === 0) {
//       console.log('❌ No valid logs received.');
//       await zk.disconnect();
//       return;
//     }

//     console.log(`📦 Total logs received: ${logs.data.length}`);

//     const seen = new Set();
//     const uniqueLogs = [];

//     for (const log of logs.data) {
//       const studentId = Number(log.deviceUserId || log.userId);
//       const date = new Date(log.recordTime).toISOString().split('T')[0];
//       const key = `${studentId}-${date}`;

//       if (!seen.has(key)) {
//         seen.add(key);
//         uniqueLogs.push({
//           studentId,
//           timestamp: log.recordTime
//         });
//       }
//     }

//     console.log(`✅ Unique logs after removing duplicates: ${uniqueLogs.length}`);

//     let syncSuccess = false;

//     for (const record of uniqueLogs) {
//       try {
//         const res = await axios.post(
//           'http://localhost:4000/student/attendance/fingerprint',
//           record
//         );
//         console.log(`✅ Synced student ${record.studentId}`, res.data);
//         syncSuccess = true;
//       } catch (err) {
//         console.error(`❌ Sync failed for student ${record.studentId}:`, err.response?.data || err.message);
//       }
//     }

//     if (syncSuccess) {
//       await zk.clearAttendanceLog();
//       console.log('🧹 Cleared logs after successful sync.');
//     } else {
//       console.log('⚠️ Logs NOT cleared. All sync attempts failed.');
//     }

//     await zk.disconnect();
//     console.log('🔌 Disconnected from device.');
//   } catch (err) {
//     console.error('❌ Error:', err.message || err);
//   }
// };

// syncAttendanceLogs();
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const ZKLib = require('node-zklib');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();
const zk = new ZKLib('192.168.1.201', 4370, 10000, 4000); // IP, port, timeout, inPort

const syncAttendanceLogs = async () => {
  try {
    console.log('\n🔌 Connecting to fingerprint device...');
    await zk.createSocket();
    console.log('✅ Connected to fingerprint device.');

    const logs = await zk.getAttendances();

    if (!logs || !logs.data || logs.data.length === 0) {
      console.log('❌ No valid logs received.');
      await zk.disconnect();
      return;
    }

    console.log(`📥 Total logs received: ${logs.data.length}`);

    const seen = new Set();
    const uniqueLogs = [];

    for (const log of logs.data) {
      const studentId = Number(log.deviceUserId || log.userId);
      const date = new Date(log.recordTime).toISOString().split('T')[0];
      const key = `${studentId}-${date}`;

      if (!seen.has(key)) {
        seen.add(key);
        uniqueLogs.push({ studentId, timestamp: log.recordTime });
      }
    }

    console.log(`✅ Unique logs to sync: ${uniqueLogs.length}`);

    let syncSuccess = false;

    for (const record of uniqueLogs) {
      try {
        const res = await axios.post(
          'http://localhost:4000/student/attendance/fingerprint',
          record
        );
        console.log(`✅ Attendance synced: Student ${record.studentId}`, res.data);
        syncSuccess = true;
      } catch (err) {
        console.error(`❌ Sync failed for student ${record.studentId}:`, err.response?.data || err.message);
      }
    }

    if (syncSuccess) {
      await zk.clearAttendanceLog();
      console.log('🧹 Logs cleared from device.');
    } else {
      console.log('⚠️ No logs cleared. All sync attempts failed.');
    }

    await zk.disconnect();
    console.log('🔌 Disconnected from device.');
  } catch (err) {
    console.error('❌ General Error:', err.message || err);
    try {
      await zk.disconnect();
    } catch (_) {}
  } finally {
    await prisma.$disconnect();
  }
};

syncAttendanceLogs();

