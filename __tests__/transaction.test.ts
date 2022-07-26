import { FirestoreSafe, Collection } from "../src";
import { AdminFirestoreTestUtil, createRandomCollectionName } from "./util";

const util = new AdminFirestoreTestUtil();
const firestore = util.adminFirestore;
const collectionPath = util.collectionPath;

type TestDoc = {
  id: string;
  title: string;
};

describe("transaction", () => {
  let firestoreSafe: FirestoreSafe;
  let txFirestoreSafe: FirestoreSafe;
  let dao: Collection<TestDoc>;
  let txDao: Collection<TestDoc>;

  beforeEach(async () => {
    firestoreSafe = new FirestoreSafe(firestore);
    txFirestoreSafe = new FirestoreSafe(firestore);
    dao = firestoreSafe.collection<TestDoc>({ path: collectionPath });
    txDao = txFirestoreSafe.collection<TestDoc>({ path: collectionPath });
  });

  afterAll(async () => {
    await util.deleteApps();
  });

  afterEach(async () => {
    await util.deleteCollection();
  });

  describe("context.transaction", () => {
    it("should be undefined before transaction", async () => {
      expect(txFirestoreSafe.context.transaction).toBeUndefined();
    });

    it("should be assigned in transaction", async () => {
      await txFirestoreSafe.runTransaction(async (tx) => {
        expect(txFirestoreSafe.context.transaction).toBe(tx);
      });
    });

    it("should be undefined after transaction", async () => {
      await txFirestoreSafe.runTransaction(async (_tx) => {
        expect(txFirestoreSafe.context.transaction).not.toBeUndefined();
      });

      expect(txFirestoreSafe.context.transaction).toBeUndefined();
    });

    it("should be error nesting transaction", async () => {
      await txFirestoreSafe.runTransaction(async (_tx) => {
        expect(
          txFirestoreSafe.runTransaction(async (_tx) => {
            dao.add({ title: "test" });
          })
        ).rejects.toThrow();
      });
    });

    it("should be error runBatch in transaction", async () => {
      await txFirestoreSafe.runTransaction(async (_tx) => {
        expect(
          txFirestoreSafe.runBatch(async (_batch) => {
            dao.add({ title: "test" });
          })
        ).rejects.toThrow();
      });
    });

    it("should be undefined when throw some error in transaction", async () => {
      try {
        await txFirestoreSafe.runTransaction(async (_tx) => {
          await txDao.add({ title: undefined } as any); // invalid value
        });
      } catch {}

      expect(txFirestoreSafe.context.transaction).toBeUndefined();
    });
  });

  describe("Collection", () => {
    describe("write method", () => {
      it("set", async () => {
        const doc = { id: "test1", title: "aaa" };
        const updatedDoc = { id: "test1", title: "bbb" };
        await dao.set(doc);

        await txFirestoreSafe.runTransaction(async () => {
          await txDao.set(updatedDoc);

          // Set document can't see outside transaction
          const outTxFetched = await dao.fetch(doc.id);
          expect(outTxFetched).toEqual(doc);
        });

        // Set document can see after transaction
        const fetched = await dao.fetch(doc.id);
        expect(fetched).toEqual(updatedDoc);
      });

      it("delete", async () => {
        const doc = { id: "test1", title: "aaa" };
        await dao.set(doc);

        await txFirestoreSafe.runTransaction(async () => {
          await txDao.delete(doc.id);

          // Deleted document can't see outside transaction
          const outTxFetched = await dao.fetch(doc.id);
          expect(outTxFetched).toEqual(doc);
        });

        // Deleted document can see after transaction
        const fetched = await dao.fetch(doc.id);
        expect(fetched).toBeUndefined();
      });

      it("add", async () => {
        let newId: string | undefined;
        const doc = { title: "aaa" };

        await txFirestoreSafe.runTransaction(async () => {
          newId = await txDao.add(doc);

          // Added document can't see outside transaction
          const outTxFetched = await dao.fetch(newId);
          expect(outTxFetched).toBeUndefined();
        });

        if (!newId) return;
        // Added document can see after transaction
        const fetched = await dao.fetch(newId);
        expect(fetched).not.toBeUndefined();
      });

      it("update", async () => {
        const updatedTitle = "update";
        const doc = { id: "test2", title: "aaa" };
        await dao.set(doc);

        await txFirestoreSafe.runTransaction(async () => {
          await txDao.update({ id: doc.id, title: updatedTitle });

          // Updated document can't see outside transaction
          const outTxFetched = await dao.fetch(doc.id);
          expect(outTxFetched!.title).toEqual(doc.title);
        });

        // Updated document can see after transaction
        const fetched = await dao.fetch(doc.id);
        expect(fetched!.title).toEqual(updatedTitle);
      });

      it("should not be commited when throw error in runTransaction", async () => {
        const doc = { id: "test1", title: "aaa" };
        const updatedDoc = { id: "test1", title: "bbb" };
        await dao.set(doc);

        try {
          await txFirestoreSafe.runTransaction(async () => {
            await txDao.set(updatedDoc);
            await txDao.set({ id: "test1", title: undefined } as any); // invalid value!
          });
        } catch {}

        // Update should not be commited
        const fetched = await dao.fetch(doc.id);
        expect(fetched).toEqual(doc);
      });
    });

    describe("read method", () => {
      it("fetch after set in transaction should be error", async () => {
        const doc = { id: "test1", title: "aaa" };
        const updatedDoc = { id: "test1", title: "bbb" };
        await dao.set(doc);

        await txFirestoreSafe.runTransaction(async () => {
          await txDao.set(updatedDoc);

          // Firestore throw error READ after WRITE in same transaction.
          // To show txDao.fetch() is inside transaction, assert transaction error.
          await expect(txDao.fetch(doc.id)).rejects.toThrow(
            "Firestore transactions require all reads to be executed before all writes."
          );
        });
      });

      it("fetchAll after set in transaction should be error", async () => {
        const doc = { id: "test1", title: "aaa" };
        const updatedDoc = { id: "test1", title: "bbb" };
        await dao.set(doc);

        await txFirestoreSafe.runTransaction(async () => {
          await txDao.set(updatedDoc);

          // Firestore throw error READ after WRITE in same transaction.
          // To show txDao.fetchAll() is inside transaction, assert transaction error.
          await expect(txDao.fetchAll()).rejects.toThrow(
            "Firestore transactions require all reads to be executed before all writes."
          );
        });
      });

      it("query after set in transaction should be error", async () => {
        const doc = { id: "test1", title: "aaa" };
        const updatedDoc = { id: "test1", title: "bbb" };
        await dao.set(doc);

        await txFirestoreSafe.runTransaction(async () => {
          await txDao.set(updatedDoc);

          // Firestore throw error READ after WRITE in same transaction.
          // To show txDao.where().fetch() is inside transaction, assert transaction error.
          await expect(txDao.where("title", "==", "bbb").fetch()).rejects.toThrow(
            "Firestore transactions require all reads to be executed before all writes."
          );
        });
      });
    });
  });

  describe("Collection.context.transaction", () => {
    const anotherCollectionPath = createRandomCollectionName();
    let txAnotherDao: Collection<TestDoc>;

    beforeEach(async () => {
      txAnotherDao = txFirestoreSafe.collection<TestDoc>({ path: anotherCollectionPath });
    });

    it("each collections share same transaction context", async () => {
      await txFirestoreSafe.runTransaction(async (tx) => {
        expect(txDao.context.transaction).toBe(tx);
        expect(txAnotherDao.context.transaction).toBe(tx);
      });
    });

    it("transaction enables across each collections", async () => {
      const anotherDao = firestoreSafe.collection<TestDoc>({ path: anotherCollectionPath });

      const doc = { id: "test1", title: "aaa" };
      await dao.set(doc);
      const anotherDoc = { id: "test1", title: "another" };
      await anotherDao.set(anotherDoc);

      const updatedDoc = { id: "test1", title: "bbb" };
      const updatedAnotherDoc = { id: "test1", title: "another_bbb" };

      await txFirestoreSafe.runTransaction(async () => {
        await txDao.set(updatedDoc);
        await txAnotherDao.set(updatedAnotherDoc);

        // Updated document can't see outside transaction
        const outTxFetched = await dao.fetch(doc.id);
        expect(outTxFetched).toEqual(doc);
        const outTxAnotherFetched = await anotherDao.fetch(anotherDoc.id);
        expect(outTxAnotherFetched).toEqual(anotherDoc);
      });

      // Updated document can see after transaction
      const fetched = await dao.fetch(doc.id);
      expect(fetched).toEqual(updatedDoc);
      const anotherFetched = await anotherDao.fetch(anotherDoc.id);
      expect(anotherFetched).toEqual(updatedAnotherDoc);
    });
  });
});
