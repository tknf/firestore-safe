import type {
  DocumentData,
  FieldPath,
  FieldValue,
  Firestore,
  DocumentReference,
  CollectionReference,
  DocumentSnapshot,
  QuerySnapshot,
  Transaction,
  WriteBatch,
  WriteResult,
  Query,
  WhereFilterOp,
  OrderByDirection
} from "firebase-admin/firestore";
import type { Optional } from "utility-types";

export type WithId = { id: string };

export type WithIdObject = { id: string; [key: string]: any };

export type Storable<T> = {
  [P in keyof T]: P extends "id" ? T[P] : T[P] | FieldValue;
};

export type OptionalIdStorable<T extends WithId> = Optional<Storable<T>, "id">;

export type PartialStorable<T extends WithId> = Partial<Storable<T>> & WithId;

type HasSameKeyObject<T> = { [P in keyof T]: any };
export type QueryKey<T> = { [K in keyof T]: K }[keyof T] | FieldPath;
export type OmitId<T> = Omit<T, "id">;
export type Encodable<T extends WithId, S = DocumentData> = (obj: OptionalIdStorable<T>) => Storable<S>;
export type Decodable<T extends WithId, S = WithIdObject> = (doc: HasSameKeyObject<S> & WithId) => T;

export {
  Firestore,
  DocumentReference,
  DocumentData,
  CollectionReference,
  DocumentSnapshot,
  QuerySnapshot,
  Transaction,
  WriteBatch,
  WriteResult,
  Query,
  WhereFilterOp,
  FieldPath,
  OrderByDirection
};
