import {
  WithId,
  QueryKey,
  Query as FirestoreQuery,
  WhereFilterOp,
  FieldPath,
  OrderByDirection,
  DocumentSnapshot,
  QuerySnapshot
} from "./types";
import { Converter } from "./converter";
import { Context } from "./context";

export class Query<T extends WithId, S> {
  constructor(public converter: Converter<T, S>, public context: Context, public query: FirestoreQuery) {}

  public where(fieldPath: QueryKey<S>, opStr: WhereFilterOp, value: any): this {
    this.query = this.query.where(fieldPath as string | FieldPath, opStr, value);
    return this;
  }

  public orderBy(fieldPath: QueryKey<S>, directionStr?: OrderByDirection): this {
    this.query = this.query.orderBy(fieldPath as string | FieldPath, directionStr);
    return this;
  }

  public limit(limit: number): this {
    this.query = this.query.limit(limit);
    return this;
  }

  public startAt(snapshot: DocumentSnapshot): Query<T, S>;
  public startAt(...fieldValues: any[]): Query<T, S>;
  public startAt(snapshotOrValue: DocumentSnapshot | unknown, ...fieldValues: unknown[]): this {
    if (!this.query) throw new Error("no query statement before startAt()");

    this.query = this.query.startAt(snapshotOrValue, ...fieldValues);
    return this;
  }

  public startAfter(snapshot: DocumentSnapshot): Query<T, S>;
  public startAfter(...fieldValues: any[]): Query<T, S>;
  public startAfter(snapshotOrValue: DocumentSnapshot | unknown, ...fieldValues: unknown[]): this {
    if (!this.query) throw new Error("no query statement before startAfter()");

    this.query = this.query.startAfter(snapshotOrValue, ...fieldValues);
    return this;
  }

  public endAt(snapshot: DocumentSnapshot): Query<T, S>;
  endAt(...fieldValues: any[]): Query<T, S>;
  endAt(snapshotOrValue: DocumentSnapshot | unknown, ...fieldValues: unknown[]): this {
    if (!this.query) throw new Error("no query statement before endAt()");

    this.query = this.query.endAt(snapshotOrValue, ...fieldValues);
    return this;
  }

  public endBefore(snapshot: DocumentSnapshot): Query<T, S>;
  public endBefore(...fieldValues: any[]): Query<T, S>;
  public endBefore(snapshotOrValue: DocumentSnapshot | unknown, ...fieldValues: unknown[]): this {
    if (!this.query) throw new Error("no query statement before endBefore()");

    this.query = this.query.endBefore(snapshotOrValue, ...fieldValues);
    return this;
  }

  public async fetch(): Promise<T[]> {
    if (!this.query) throw new Error("no query statement before fetch()");

    const snapshot = this.context.transaction ? await this.context.transaction.get(this.query) : await this.query.get();
    const arr: T[] = [];

    snapshot.forEach((documentSnapshot) => {
      arr.push(this.converter.decode(documentSnapshot));
    });
    return arr;
  }

  public onSnapshot(
    callback: (querySnapshot: QuerySnapshot, toObject: (documentSnapshot: DocumentSnapshot) => T) => void
  ): () => void {
    if (!this.query) throw new Error("no query statement before onSnapshot()");
    return this.query.onSnapshot((_querySnapshot) => {
      callback(_querySnapshot, this.converter.decode.bind(this.converter));
    });
  }
}
