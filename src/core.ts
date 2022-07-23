import { getFirestore } from "firebase-admin/firestore";
import type { Decodable, Encodable, Firestore, OmitId, WithId } from "./types";
import { Context } from "./context";
import { Collection } from "./collection";
import { Converter } from "./converter";
import { Query } from "./query";

export class FirestoreSafe {
  public context: Context;
  constructor(firestore?: Firestore) {
    if (firestore) {
      this.context = new Context(firestore);
    } else {
      this.context = new Context(getFirestore());
    }
  }

  public collection<T extends WithId, S = OmitId<T>>({
    path,
    encode,
    decode
  }: {
    path: string;
    encode?: Encodable<T, S>;
    decode?: Decodable<T, S>;
  }): Collection<T, S> {
    const factory = new CollectionFactory<T, S>({
      context: this.context,
      encode,
      decode
    });
    return factory.create(path);
  }

  public collectionFactory<T extends WithId, S = OmitId<T>>({
    encode,
    decode
  }: {
    encode?: Encodable<T, S>;
    decode?: Decodable<T, S>;
  }): CollectionFactory<T, S> {
    return new CollectionFactory<T, S>({
      context: this.context,
      encode,
      decode
    });
  }

  public collectionGroup<T extends WithId, S = OmitId<T>>({
    collectionId,
    decode
  }: {
    collectionId: string;
    decode?: Decodable<T, S>;
  }): Query<T, S> {
    const query = this.context.firestore.collectionGroup(collectionId);
    const converter = new Converter({ decode });
    return new Query<T, S>(converter, this.context, query);
  }

  public async runTransaction(updateFunction: (tx: FirebaseFirestore.Transaction) => Promise<void>): Promise<void> {
    return this.context.runTransaction(updateFunction);
  }

  public async runBatch(
    updateFunction: (batch: FirebaseFirestore.WriteBatch) => Promise<void>
  ): Promise<FirebaseFirestore.WriteResult[]> {
    return this.context.runBatch(updateFunction);
  }
}

class CollectionFactory<T extends WithId, S = OmitId<T>> {
  public context: Context;
  public encode?: Encodable<T, S>;
  public decode?: Decodable<T, S>;

  constructor({ context, encode, decode }: { context: Context; encode?: Encodable<T, S>; decode?: Decodable<T, S> }) {
    this.context = context;
    this.encode = encode;
    this.decode = decode;
  }

  public create(path: string): Collection<T, S> {
    return new Collection<T, S>({
      context: this.context,
      path,
      encode: this.encode,
      decode: this.decode
    });
  }
}
