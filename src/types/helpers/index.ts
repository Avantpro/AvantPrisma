type Primitives = number | string | Date | boolean | null | undefined;

type Optional<T> = {
  [P in keyof T]?: T[P];
};

type Binary<T> = {
  [P in keyof T]?: boolean;
};

type OneRequired<T> = {
  [P in keyof T]: { [L in P]: T[L] } & { [L in Exclude<keyof T, P>]?: T[L] };
}[keyof T];

type OmitNever<T> = { [P in keyof T as T[P] extends never ? never : P]: T[P] };

type parseRelations<T> = {
  [P in keyof T]:
    | {
        select: Binary<OmitRelations<P>>;
      }
    | boolean;
};

type Relations<T> = Binary<
  OmitNever<{
    [P in keyof T]-?: T[P] extends Primitives ? never : T[P];
  }>
>;

type OmitRelations<T> = Omit<T, keyof Relations<T>>;

type genericFilters<T> = {
  equals: T;
  not: T;
  in: T[];
  notIn: T[];
};

type dateFilters<T> = {
  lt: Date;
  lte: Date;
  gt: Date;
  gte: Date;
  between: [Date, Date];
} & genericFilters<T>;

type numberFilters<T> = {
  lt: number;
  lte: number;
  gt: number;
  gte: number;
  between: [number, number];
} & genericFilters<T>;

type textFilters<T> = {
  contains: string;
  startsWith: string;
  endsWith: string;
} & genericFilters<T>;

type Mandatory<T> = Required<NonNullable<T>>;

type parseFilters<T> = {
  [P in keyof T]?:
    | OneRequired<
        Mandatory<T[P]> extends number
          ? numberFilters<T[P]>
          : Mandatory<T[P]> extends Date
          ? dateFilters<T[P]>
          : textFilters<T[P]>
      >
    | T[P];
};

type WhereFilters<T> = parseFilters<OmitRelations<T>>;

type Filter =
  | "equals"
  | "not"
  | "in"
  | "notIn"
  | "lt"
  | "lte"
  | "gt"
  | "gte"
  | "between"
  | "contains"
  | "startsWith"
  | "endsWith";

type genericOrder = {
  sort: "asc" | "desc";
  nulls: "first" | "lest";
};

type OrderFilters<T> = {
  [P in keyof T]?: OneRequired<genericOrder> | string;
};

type Order = "sort" | "nulls";

export {
  Optional,
  Binary,
  OneRequired,
  WhereFilters,
  Filter,
  Relations,
  OmitRelations,
  OrderFilters,
  Order,
};
