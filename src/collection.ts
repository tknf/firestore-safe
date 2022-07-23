import {
  WithId,
  OmitId,
  Encodable,
  Decodable,
  OptionalIdStorable,
  Storable,
  PartialStorable,
  QueryKey,
  CollectionReference,
  DocumentSnapshot,
  DocumentReference,
  QuerySnapshot
} from "./types";
import { Context } from "./context";
import { Converter } from "./converter";
import { Query } from "./query";

export class Collection<T extends WithId, S = OmitId<T>> {
  context: Context;
  collectionRef: CollectionReference;
  private converter: Converter<T, S>;

  constructor({
    context,
    path,
    encode,
    decode
  }: {
    context: Context;
    path: string;
    encode?: Encodable<T, S>;
    decode?: Decodable<T, S>;
  }) {
    this.context = context;
    this.collectionRef = context.firestore.collection(path);
    this.converter = new Converter({ encode, decode });
  }

  public toObject(documentSnapshot: DocumentSnapshot): T {
    return this.converter.decode(documentSnapshot);
  }

  public docRef(id?: string): DocumentReference {
    if (id) return this.collectionRef.doc(id);
    return this.collectionRef.doc();
  }

  public async fetch(id: string): Promise<T | undefined> {
    const docRef = this.docRef(id);
    const snapshot = this.context.transaction ? await this.context.transaction.get(docRef) : await docRef.get();
    if (!snapshot.exists) return undefined;

    return this.toObject(snapshot);
  }

  public async fetchAll(): Promise<T[]> {
    const snapshot = this.context.transaction
      ? await this.context.transaction.get(this.collectionRef)
      : await this.collectionRef.get();
    const arr: T[] = [];

    snapshot.forEach((documentSnapshot) => {
      arr.push(this.toObject(documentSnapshot));
    });
    return arr;
  }

  public async add(obj: OptionalIdStorable<T>): Promise<string> {
    let docRef: DocumentReference<S>;
    const doc = this.converter.encode(obj) as any;

    if (this.context.transaction) {
      docRef = this.docRef() as DocumentReference<S>;
      this.context.transaction.set(docRef, doc);
    } else if (this.context.batch) {
      docRef = this.docRef() as DocumentReference<S>;
      this.context.batch.set(docRef, doc);
    } else {
      docRef = (await this.collectionRef.add(doc)) as DocumentReference<S>;
    }
    return docRef.id;
  }

  public async set(obj: Storable<T>): Promise<string> {
    if (!obj.id) throw new Error('Argument object must have "id" property');

    const docRef = this.docRef(obj.id) as DocumentReference<S>;
    const setDoc = this.converter.encode(obj) as any;

    if (this.context.transaction) {
      this.context.transaction.set(docRef, setDoc);
    } else if (this.context.batch) {
      this.context.batch.set(docRef, setDoc);
    } else {
      await docRef.set(setDoc);
    }
    return obj.id;
  }

  public addOrSet(obj: OptionalIdStorable<T>): Promise<string> {
    if ("id" in obj) {
      return this.set(obj as Storable<T>);
    }
    return this.add(obj);
  }

  public async update(obj: PartialStorable<S & WithId>): Promise<string> {
    if (!obj.id) throw new Error('Argument object must have "id" property');

    const docRef = this.docRef(obj.id);
    // Copy obj with exclude 'id' key
    const { id, ...updateDoc } = { ...obj };

    if (this.context.transaction) {
      this.context.transaction.update(docRef, updateDoc);
    } else if (this.context.batch) {
      this.context.batch.update(docRef, updateDoc);
    } else {
      await docRef.update(updateDoc);
    }
    return obj.id;
  }

  public async delete(id: string): Promise<string> {
    const docRef = this.docRef(id);
    if (this.context.transaction) {
      this.context.transaction.delete(docRef);
    } else if (this.context.batch) {
      this.context.batch.delete(docRef);
    } else {
      await docRef.delete();
    }
    return id;
  }

  public async bulkAdd(objects: Array<OptionalIdStorable<T>>): Promise<FirebaseFirestore.WriteResult[]> {
    return this.context.runBatch(async () => {
      for (const obj of objects) {
        await this.add(obj);
      }
    });
  }

  public async bulkSet(objects: Array<Storable<T>>): Promise<FirebaseFirestore.WriteResult[]> {
    return this.context.runBatch(async () => {
      for (const obj of objects) {
        await this.set(obj);
      }
    });
  }

  public async bulkDelete(docIds: string[]): Promise<FirebaseFirestore.WriteResult[]> {
    return this.context.runBatch(async () => {
      for (const docId of docIds) {
        await this.delete(docId);
      }
    });
  }

  public where(fieldPath: QueryKey<S>, opStr: FirebaseFirestore.WhereFilterOp, value: any): Query<T, S> {
    const query = this.collectionRef.where(fieldPath as string | FirebaseFirestore.FieldPath, opStr, value);
    return new Query<T, S>(this.converter, this.context, query);
  }

  public orderBy(fieldPath: QueryKey<S>, directionStr?: FirebaseFirestore.OrderByDirection): Query<T, S> {
    const query = this.collectionRef.orderBy(fieldPath as string | FirebaseFirestore.FieldPath, directionStr);
    return new Query<T, S>(this.converter, this.context, query);
  }

  public limit(limit: number): Query<T, S> {
    const query = this.collectionRef.limit(limit);
    return new Query<T, S>(this.converter, this.context, query);
  }

  public onSnapshot(
    callback: (querySnapshot: QuerySnapshot, toObject: (documentSnapshot: DocumentSnapshot) => T) => void
  ): () => void {
    return this.collectionRef.onSnapshot((_querySnapshot) => {
      callback(_querySnapshot, this.toObject.bind(this));
    });
  }
}
