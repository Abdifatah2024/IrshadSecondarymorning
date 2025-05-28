const ZKLib = require('node-zklib');
const axios = require('axios');

const zk = new ZKLib('192.168.1.201', 4370, 10000, 4000);

const pushUsersToDevice = async () => {
  try {
    await zk.createSocket();
    console.log('✅ Connected to device');

    const response = await axios.get('http://localhost:4000/students/device-list');
    const students = response.data.students;

    for (const student of students) {
      const userId = student.id;
      const name = student.fullname || `Student${userId}`;

      try {
        const result = await zk.setUser(userId, name, '', 0, 0);
        console.log(`✅ Pushed ${name} (ID: ${userId})`, result);
      } catch (err) {
        console.error(`❌ Failed to push ${name}`, err.message || err);
      }
    }

    await zk.disconnect();
    console.log('🔌 Disconnected from device');
  } catch (err) {
    console.error('❌ Error syncing users:', err.message || err);
  }
};

pushUsersToDevice();
