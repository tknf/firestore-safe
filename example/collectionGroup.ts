import admin, { ServiceAccount } from "firebase-admin";
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

const ROOT_PATH = "example/admin_collection_group";

interface Review {
  id: string;
  userId: string;
  text: string;
  created: Date;
}

const userNames = ["alice", "bob", "john"];
const collectionId = "review";

const main = async (): Promise<void> => {
  // Prepare review documents
  await firestore
    .collection(`${ROOT_PATH}/user/alice/${collectionId}`)
    .add({ userId: "alice", text: "aaa", created: admin.firestore.FieldValue.serverTimestamp() });
  await firestore
    .collection(`${ROOT_PATH}/user/bob/${collectionId}`)
    .add({ userId: "bob", text: "bbb", created: admin.firestore.FieldValue.serverTimestamp() });
  await firestore
    .collection(`${ROOT_PATH}/user/john/${collectionId}`)
    .add({ userId: "john", text: "ccc", created: admin.firestore.FieldValue.serverTimestamp() });

  // Create CollectionGroup dao
  const firestoreSafe = new FirestoreSafe(firestore);
  const reviewCollectionGroup = firestoreSafe.collectionGroup<Review>({
    collectionId: "review",
    decode: (doc) => {
      return {
        id: doc.id,
        userId: doc.userId,
        text: doc.text,
        created: doc.created.toDate()
      };
    }
  });

  // Fetch CollectionGroup documents
  const reviews = await reviewCollectionGroup.fetch();
  console.dir(reviews);
  // [ { id: 'sElJjoIFDgjGy89izlnK',
  //   userId: 'alice',
  //   text: 'aaa',
  //   created: 2019-12-26T15:33:17.883Z },
  // { id: 'upM1SLLjkVTf8uWFuYPp',
  //   userId: 'bob',
  //   text: 'bbb',
  //   created: 2019-12-26T15:33:18.171Z },
  // { id: 'k7b4wBzGhzxjyXg8KmCK',
  //   userId: 'john',
  //   text: 'ccc',
  //   created: 2019-12-26T15:33:18.411Z } ]

  // Remove documents
  for (const user of userNames) {
    const userReivewDao = firestoreSafe.collection({ path: `${ROOT_PATH}/user/${user}/review` });
    const reviews = await userReivewDao.fetchAll();

    await userReivewDao.bulkDelete(reviews.map((review) => review.id));
  }
};
main();
