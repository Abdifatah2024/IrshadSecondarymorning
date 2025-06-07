// // // // const ZKLib = require('node-zklib');
// // // // const axios = require('axios');

// // // // const zk = new ZKLib('192.168.1.201', 4370, 10000, 4000); // IP, port, timeout, inport

// // // // const syncAttendanceLogs = async () => {
// // // //   try {
// // // //     console.log('🔌 Connecting to fingerprint device...');
// // // //     await zk.createSocket();

// // // //     console.log('✅ Connected to device. Fetching attendance logs...');
// // // //     const logs = await zk.getAttendances();

// // // //     console.log('📦 Logs received:', logs.data);

// // // //     for (const log of logs.data) {
// // // //       try {
// // // //         const response = await axios.post('http://localhost:4000/student/attendance/fingerprint', {
// // // //           studentId: Number(log.userId), // device user ID = studentId
// // // //           timestamp: log.recordTime
// // // //         });

// // // //         console.log(`✅ Sent log for student ${log.userId}`, response.data);
// // // //       } catch (error) {
// // // //         console.error(`❌ Failed to send log for student ${log.userId}`, error.message);
// // // //       }
// // // //     }

// // // //     await zk.disconnect();
// // // //     console.log('🔌 Disconnected from device.');
// // // //   } catch (err) {
// // // //     console.error('❌ Error connecting to device or fetching logs:', err);
// // // //   }
// // // // };

// // // // // Run the sync immediately
// // // // syncAttendanceLogs();
// // // const ZKLib = require('node-zklib');
// // // const axios = require('axios');

// // // const zk = new ZKLib('192.168.1.201', 4370, 10000, 4000); // IP, port, timeout, inport

// // // const syncAttendanceLogs = async () => {
// // //   try {
// // //     console.log('🔌 Connecting to fingerprint device...');
// // //     await zk.createSocket();

// // //     console.log('✅ Connected to device. Fetching attendance logs...');
// // //     const logs = await zk.getAttendances();

// // //     console.log('📦 Logs received:', logs.data);

// // //     for (const log of logs.data) {
// // //       try {
// // //         const response = await axios.post('http://localhost:4000/student/attendance/fingerprint', {
// // //           studentId: Number(log.deviceUserId),  // ✅ Use the correct key
// // //           timestamp: log.recordTime
// // //         });

// // //         console.log(`✅ Sent log for student ${log.deviceUserId}`, response.data);
// // //       } catch (error) {
// // //         console.error(`❌ Failed to send log for student ${log.deviceUserId}`, error.message);
// // //       }
// // //     }

// // //     await zk.disconnect();
// // //     console.log('🔌 Disconnected from device.');
// // //   } catch (err) {
// // //     console.error('❌ Error connecting to device or fetching logs:', err);
// // //   }
// // // };

// // // syncAttendanceLogs();
// // const ZKLib = require('node-zklib');
// // const axios = require('axios');

// // const zk = new ZKLib('192.168.1.201', 4370, 10000, 4000); // IP, port, timeout, inport

// // const syncAttendanceLogs = async () => {
// //   try {
// //     console.log('🔌 Connecting to fingerprint device...');
// //     await zk.createSocket();

// //     console.log('✅ Connected to device. Fetching attendance logs...');
// //     const logs = await zk.getAttendances();

// //     const seen = new Set(); // To avoid duplicates: studentId-date


// //     console.log('📦 Logs received:', logs.data);

// //     for (const log of logs.data) {
// //       const studentId = Number(log.deviceUserId || log.userId); // fallback to userId if needed
// //       const date = new Date(log.recordTime).toISOString().split('T')[0];
// //       const key = `${studentId}-${date}`;

// //       if (seen.has(key)) continue;
// //       seen.add(key);

// //       try {
// //         const response = await axios.post('http://localhost:4000/student/attendance/fingerprint', {
// //           studentId,
// //           timestamp: log.recordTime
// //         });

// //         console.log(`✅ Sent log for student ${studentId}`, response.data);
// //       } catch (error) {
// //         console.error(`❌ Failed to send log for student ${studentId}`, error.response?.data || error.message);
// //       }
// //     }

// //     await zk.disconnect();
// //     console.log('🔌 Disconnected from device.');
// //   } catch (err) {
// //     console.error('❌ Error connecting to device or fetching logs:', err);
// //   }
// // };

// // syncAttendanceLogs();
// const ZKLib = require('node-zklib');
// const axios = require('axios');

// const zk = new ZKLib('192.168.1.201', 4370, 10000, 4000); // IP, port, timeout, inport

// // Function to sync logs from fingerprint device
// const syncAttendanceLogs = async () => {
//   try {
//     console.log('\n🔌 Connecting to fingerprint device...');
//     await zk.createSocket();

//     console.log('✅ Connected to device. Fetching attendance logs...');
//     const logs = await zk.getAttendances();
//     const seen = new Set(); // Track processed studentId-date pairs

//     console.log(`📦 Logs received: ${logs.data.length} entries`);

//     for (const log of logs.data) {
//       const studentId = Number(log.deviceUserId || log.userId);
//       const date = new Date(log.recordTime).toISOString().split('T')[0];
//       const key = `${studentId}-${date}`;

//       if (seen.has(key)) continue;
//       seen.add(key);

//       try {
//         const response = await axios.post('http://localhost:4000/student/attendance/fingerprint', {
//           studentId,
//           timestamp: log.recordTime
//         });

//         console.log(`✅ Synced student ${studentId}`, response.data);
//       } catch (error) {
//         console.error(`❌ Failed to sync student ${studentId}`, error.response?.data || error.message);
//       }
//     }

//     await zk.disconnect();
//     console.log('🔌 Disconnected from device.');
//   } catch (err) {
//     console.error('❌ Error connecting to device or fetching logs:', err.message || err);
//   }
// };

// // Run immediately
// syncAttendanceLogs();

// // 🔁 Auto-sync every 60 seconds
// setInterval(syncAttendanceLogs, 60 * 1000);
const ZKLib = require('node-zklib');
const axios = require('axios');

const zk = new ZKLib('192.168.1.201', 4370, 10000, 4000); // IP, port, timeout, inPort

const syncAttendanceLogs = async () => {
  try {
    console.log('\n🔌 Connecting to fingerprint device...');
    await zk.createSocket();
    console.log('✅ Connected to device. Fetching attendance logs...');

    const logs = await zk.getAttendances();
    const seen = new Set();

    console.log(`📦 Logs received: ${logs.data.length} entries`);

    for (const log of logs.data) {
      const studentId = Number(log.deviceUserId || log.userId);
      const date = new Date(log.recordTime).toISOString().split('T')[0];
      const key = `${studentId}-${date}`;

      if (seen.has(key)) continue;
      seen.add(key);

      try {
        const response = await axios.post('http://localhost:4000/student/attendance/fingerprint', {
          studentId,
          timestamp: log.recordTime
        });

        console.log(`✅ Synced student ${studentId}:`, response.data);
      } catch (error) {
        console.error(`❌ Failed to sync student ${studentId}:`, error.response?.data || error.message);
      }
    }

    await zk.disconnect();
    console.log('🔌 Disconnected from device.');
  } catch (err) {
    console.error('❌ Error:', err.message || err);
  }
};

// 🚀 Initial sync
syncAttendanceLogs();

// 🔁 Repeat every 60 seconds
setInterval(syncAttendanceLogs, 60 * 1000);
