const { admin, db, auth } = require('./config/firebase');

async function seedUsers() {
    console.log("Starting user seed process...");
    const usersData = [
        {
            email: 'hod.cse@rgmcet.edu',
            password: 'HOD@123',
            name: 'Dr. HOD CSE',
            role: 'hod',
            department: 'CSE'
        },
        {
            email: 'faculty.cse@rgmcet.edu',
            password: 'Faculty@123',
            name: 'Faculty CSE',
            role: 'faculty',
            department: 'CSE'
        },
        {
            email: 'labadmin.cse@rgmcet.edu',
            password: 'Lab@123',
            name: 'Lab Admin CSE',
            role: 'labadmin',
            department: 'CSE'
        }
    ];

    for (const userData of usersData) {
        try {
            let userRecord;
            try {
                userRecord = await auth.getUserByEmail(userData.email);
                console.log(`User ${userData.email} already exists in Firebase Auth. Updating password.`);
                await auth.updateUser(userRecord.uid, { password: userData.password, displayName: userData.name });
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
                    userRecord = await auth.createUser({
                        email: userData.email,
                        password: userData.password,
                        displayName: userData.name
                    });
                    console.log(`Created new Firebase Auth user: ${userData.email}`);
                } else {
                    throw error;
                }
            }

            await db.collection('users').doc(userRecord.uid).set({
                uid: userRecord.uid,
                name: userData.name,
                email: userData.email,
                role: userData.role,
                department: userData.department,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            console.log(`Firestore document created/updated for ${userData.email} in 'users' collection`);

        } catch (err) {
            console.error(`Error processing ${userData.email}:`, err);
        }
    }
    console.log("Seeding complete.");
    process.exit(0);
}

seedUsers();
