import admin from "firebase-admin";

import { FirestoreSafe } from "../src";

//
// Start Firestore local emulator in background before start this script.
// `npx firebase emulators:start --only firestore`
//

// hack for using local emulator
process.env.GCLOUD_PROJECT = "";
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
admin.initializeApp({});
const firestore = admin.firestore();

const ROOT_PATH = "example/admin_encode_decode";

class User {
  constructor(public id: string, public name: string, public created: Date, public updated?: Date) {}
}

const main = async () => {
  const firestoreSafe = new FirestoreSafe(firestore);
  const dao = firestoreSafe.collection<User>({
    path: `${ROOT_PATH}/user`,
    encode: (user) => {
      return {
        name: user.name,
        created: user.created,
        updated: admin.firestore.FieldValue.serverTimestamp() // Using Firebase server timestamp when set document
      };
    },
    decode: (doc) => {
      return new User(
        doc.id,
        doc.name,
        doc.created.toDate(), // Convert Firebase timestamp to js date object
        doc.updated.toDate()
      );
    }
  });

  let user: User | undefined;
  // add
  const userId = await dao.add({ name: "bob", created: new Date() });

  // fetch
  // 'updated' is added automatically.
  user = await dao.fetch(userId);
  console.log(user);
  // User {
  //   id: 'bSaICakQ59u62Qhsn2wA',
  //   name: 'bob',
  //   created: 2019-05-07T15:24:46.562Z,
  //   updated: 2019-05-07T15:24:47.185Z }
  if (!user) return;

  // set
  user.name = "alice";
  await dao.set(user);

  // fetch
  // 'updated' is updated automatically.
  user = await dao.fetch(userId);
  console.log(user);
  // User {
  //   id: 'bSaICakQ59u62Qhsn2wA',
  //   name: 'alice',
  //   created: 2019-05-07T15:24:46.562Z,
  //   updated: 2019-05-07T15:24:47.627Z }
  if (!user) return;

  await dao.delete(userId);
};

main();
