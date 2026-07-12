
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model cuentascompartidas
 * 
 */
export type cuentascompartidas = $Result.DefaultSelection<Prisma.$cuentascompartidasPayload>
/**
 * Model cuentascompletas
 * 
 */
export type cuentascompletas = $Result.DefaultSelection<Prisma.$cuentascompletasPayload>
/**
 * Model pantallas
 * 
 */
export type pantallas = $Result.DefaultSelection<Prisma.$pantallasPayload>
/**
 * Model plataformas
 * 
 */
export type plataformas = $Result.DefaultSelection<Prisma.$plataformasPayload>
/**
 * Model usuarios
 * 
 */
export type usuarios = $Result.DefaultSelection<Prisma.$usuariosPayload>
/**
 * Model wa_notificaciones
 * 
 */
export type wa_notificaciones = $Result.DefaultSelection<Prisma.$wa_notificacionesPayload>
/**
 * Model wa_logs
 * 
 */
export type wa_logs = $Result.DefaultSelection<Prisma.$wa_logsPayload>
/**
 * Model inventario
 * 
 */
export type inventario = $Result.DefaultSelection<Prisma.$inventarioPayload>
/**
 * Model metricasmensuales
 * 
 */
export type metricasmensuales = $Result.DefaultSelection<Prisma.$metricasmensualesPayload>
/**
 * Model admin
 * 
 */
export type admin = $Result.DefaultSelection<Prisma.$adminPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const LogStatus: {
  OK: 'OK',
  FALLBACK: 'FALLBACK',
  ERROR: 'ERROR'
};

export type LogStatus = (typeof LogStatus)[keyof typeof LogStatus]

}

export type LogStatus = $Enums.LogStatus

export const LogStatus: typeof $Enums.LogStatus

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Cuentascompartidas
 * const cuentascompartidas = await prisma.cuentascompartidas.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Cuentascompartidas
   * const cuentascompartidas = await prisma.cuentascompartidas.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.cuentascompartidas`: Exposes CRUD operations for the **cuentascompartidas** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Cuentascompartidas
    * const cuentascompartidas = await prisma.cuentascompartidas.findMany()
    * ```
    */
  get cuentascompartidas(): Prisma.cuentascompartidasDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.cuentascompletas`: Exposes CRUD operations for the **cuentascompletas** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Cuentascompletas
    * const cuentascompletas = await prisma.cuentascompletas.findMany()
    * ```
    */
  get cuentascompletas(): Prisma.cuentascompletasDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.pantallas`: Exposes CRUD operations for the **pantallas** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Pantallas
    * const pantallas = await prisma.pantallas.findMany()
    * ```
    */
  get pantallas(): Prisma.pantallasDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.plataformas`: Exposes CRUD operations for the **plataformas** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Plataformas
    * const plataformas = await prisma.plataformas.findMany()
    * ```
    */
  get plataformas(): Prisma.plataformasDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.usuarios`: Exposes CRUD operations for the **usuarios** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Usuarios
    * const usuarios = await prisma.usuarios.findMany()
    * ```
    */
  get usuarios(): Prisma.usuariosDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.wa_notificaciones`: Exposes CRUD operations for the **wa_notificaciones** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Wa_notificaciones
    * const wa_notificaciones = await prisma.wa_notificaciones.findMany()
    * ```
    */
  get wa_notificaciones(): Prisma.wa_notificacionesDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.wa_logs`: Exposes CRUD operations for the **wa_logs** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Wa_logs
    * const wa_logs = await prisma.wa_logs.findMany()
    * ```
    */
  get wa_logs(): Prisma.wa_logsDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.inventario`: Exposes CRUD operations for the **inventario** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Inventarios
    * const inventarios = await prisma.inventario.findMany()
    * ```
    */
  get inventario(): Prisma.inventarioDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.metricasmensuales`: Exposes CRUD operations for the **metricasmensuales** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Metricasmensuales
    * const metricasmensuales = await prisma.metricasmensuales.findMany()
    * ```
    */
  get metricasmensuales(): Prisma.metricasmensualesDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.admin`: Exposes CRUD operations for the **admin** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Admins
    * const admins = await prisma.admin.findMany()
    * ```
    */
  get admin(): Prisma.adminDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.19.3
   * Query Engine version: c2990dca591cba766e3b7ef5d9e8a84796e47ab7
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    cuentascompartidas: 'cuentascompartidas',
    cuentascompletas: 'cuentascompletas',
    pantallas: 'pantallas',
    plataformas: 'plataformas',
    usuarios: 'usuarios',
    wa_notificaciones: 'wa_notificaciones',
    wa_logs: 'wa_logs',
    inventario: 'inventario',
    metricasmensuales: 'metricasmensuales',
    admin: 'admin'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "cuentascompartidas" | "cuentascompletas" | "pantallas" | "plataformas" | "usuarios" | "wa_notificaciones" | "wa_logs" | "inventario" | "metricasmensuales" | "admin"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      cuentascompartidas: {
        payload: Prisma.$cuentascompartidasPayload<ExtArgs>
        fields: Prisma.cuentascompartidasFieldRefs
        operations: {
          findUnique: {
            args: Prisma.cuentascompartidasFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cuentascompartidasPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.cuentascompartidasFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cuentascompartidasPayload>
          }
          findFirst: {
            args: Prisma.cuentascompartidasFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cuentascompartidasPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.cuentascompartidasFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cuentascompartidasPayload>
          }
          findMany: {
            args: Prisma.cuentascompartidasFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cuentascompartidasPayload>[]
          }
          create: {
            args: Prisma.cuentascompartidasCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cuentascompartidasPayload>
          }
          createMany: {
            args: Prisma.cuentascompartidasCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.cuentascompartidasDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cuentascompartidasPayload>
          }
          update: {
            args: Prisma.cuentascompartidasUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cuentascompartidasPayload>
          }
          deleteMany: {
            args: Prisma.cuentascompartidasDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.cuentascompartidasUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.cuentascompartidasUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cuentascompartidasPayload>
          }
          aggregate: {
            args: Prisma.CuentascompartidasAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCuentascompartidas>
          }
          groupBy: {
            args: Prisma.cuentascompartidasGroupByArgs<ExtArgs>
            result: $Utils.Optional<CuentascompartidasGroupByOutputType>[]
          }
          count: {
            args: Prisma.cuentascompartidasCountArgs<ExtArgs>
            result: $Utils.Optional<CuentascompartidasCountAggregateOutputType> | number
          }
        }
      }
      cuentascompletas: {
        payload: Prisma.$cuentascompletasPayload<ExtArgs>
        fields: Prisma.cuentascompletasFieldRefs
        operations: {
          findUnique: {
            args: Prisma.cuentascompletasFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cuentascompletasPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.cuentascompletasFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cuentascompletasPayload>
          }
          findFirst: {
            args: Prisma.cuentascompletasFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cuentascompletasPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.cuentascompletasFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cuentascompletasPayload>
          }
          findMany: {
            args: Prisma.cuentascompletasFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cuentascompletasPayload>[]
          }
          create: {
            args: Prisma.cuentascompletasCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cuentascompletasPayload>
          }
          createMany: {
            args: Prisma.cuentascompletasCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.cuentascompletasDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cuentascompletasPayload>
          }
          update: {
            args: Prisma.cuentascompletasUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cuentascompletasPayload>
          }
          deleteMany: {
            args: Prisma.cuentascompletasDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.cuentascompletasUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.cuentascompletasUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$cuentascompletasPayload>
          }
          aggregate: {
            args: Prisma.CuentascompletasAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCuentascompletas>
          }
          groupBy: {
            args: Prisma.cuentascompletasGroupByArgs<ExtArgs>
            result: $Utils.Optional<CuentascompletasGroupByOutputType>[]
          }
          count: {
            args: Prisma.cuentascompletasCountArgs<ExtArgs>
            result: $Utils.Optional<CuentascompletasCountAggregateOutputType> | number
          }
        }
      }
      pantallas: {
        payload: Prisma.$pantallasPayload<ExtArgs>
        fields: Prisma.pantallasFieldRefs
        operations: {
          findUnique: {
            args: Prisma.pantallasFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$pantallasPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.pantallasFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$pantallasPayload>
          }
          findFirst: {
            args: Prisma.pantallasFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$pantallasPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.pantallasFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$pantallasPayload>
          }
          findMany: {
            args: Prisma.pantallasFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$pantallasPayload>[]
          }
          create: {
            args: Prisma.pantallasCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$pantallasPayload>
          }
          createMany: {
            args: Prisma.pantallasCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.pantallasDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$pantallasPayload>
          }
          update: {
            args: Prisma.pantallasUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$pantallasPayload>
          }
          deleteMany: {
            args: Prisma.pantallasDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.pantallasUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.pantallasUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$pantallasPayload>
          }
          aggregate: {
            args: Prisma.PantallasAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePantallas>
          }
          groupBy: {
            args: Prisma.pantallasGroupByArgs<ExtArgs>
            result: $Utils.Optional<PantallasGroupByOutputType>[]
          }
          count: {
            args: Prisma.pantallasCountArgs<ExtArgs>
            result: $Utils.Optional<PantallasCountAggregateOutputType> | number
          }
        }
      }
      plataformas: {
        payload: Prisma.$plataformasPayload<ExtArgs>
        fields: Prisma.plataformasFieldRefs
        operations: {
          findUnique: {
            args: Prisma.plataformasFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$plataformasPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.plataformasFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$plataformasPayload>
          }
          findFirst: {
            args: Prisma.plataformasFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$plataformasPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.plataformasFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$plataformasPayload>
          }
          findMany: {
            args: Prisma.plataformasFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$plataformasPayload>[]
          }
          create: {
            args: Prisma.plataformasCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$plataformasPayload>
          }
          createMany: {
            args: Prisma.plataformasCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.plataformasDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$plataformasPayload>
          }
          update: {
            args: Prisma.plataformasUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$plataformasPayload>
          }
          deleteMany: {
            args: Prisma.plataformasDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.plataformasUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.plataformasUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$plataformasPayload>
          }
          aggregate: {
            args: Prisma.PlataformasAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePlataformas>
          }
          groupBy: {
            args: Prisma.plataformasGroupByArgs<ExtArgs>
            result: $Utils.Optional<PlataformasGroupByOutputType>[]
          }
          count: {
            args: Prisma.plataformasCountArgs<ExtArgs>
            result: $Utils.Optional<PlataformasCountAggregateOutputType> | number
          }
        }
      }
      usuarios: {
        payload: Prisma.$usuariosPayload<ExtArgs>
        fields: Prisma.usuariosFieldRefs
        operations: {
          findUnique: {
            args: Prisma.usuariosFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usuariosPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.usuariosFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usuariosPayload>
          }
          findFirst: {
            args: Prisma.usuariosFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usuariosPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.usuariosFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usuariosPayload>
          }
          findMany: {
            args: Prisma.usuariosFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usuariosPayload>[]
          }
          create: {
            args: Prisma.usuariosCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usuariosPayload>
          }
          createMany: {
            args: Prisma.usuariosCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.usuariosDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usuariosPayload>
          }
          update: {
            args: Prisma.usuariosUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usuariosPayload>
          }
          deleteMany: {
            args: Prisma.usuariosDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.usuariosUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.usuariosUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usuariosPayload>
          }
          aggregate: {
            args: Prisma.UsuariosAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUsuarios>
          }
          groupBy: {
            args: Prisma.usuariosGroupByArgs<ExtArgs>
            result: $Utils.Optional<UsuariosGroupByOutputType>[]
          }
          count: {
            args: Prisma.usuariosCountArgs<ExtArgs>
            result: $Utils.Optional<UsuariosCountAggregateOutputType> | number
          }
        }
      }
      wa_notificaciones: {
        payload: Prisma.$wa_notificacionesPayload<ExtArgs>
        fields: Prisma.wa_notificacionesFieldRefs
        operations: {
          findUnique: {
            args: Prisma.wa_notificacionesFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$wa_notificacionesPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.wa_notificacionesFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$wa_notificacionesPayload>
          }
          findFirst: {
            args: Prisma.wa_notificacionesFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$wa_notificacionesPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.wa_notificacionesFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$wa_notificacionesPayload>
          }
          findMany: {
            args: Prisma.wa_notificacionesFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$wa_notificacionesPayload>[]
          }
          create: {
            args: Prisma.wa_notificacionesCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$wa_notificacionesPayload>
          }
          createMany: {
            args: Prisma.wa_notificacionesCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.wa_notificacionesDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$wa_notificacionesPayload>
          }
          update: {
            args: Prisma.wa_notificacionesUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$wa_notificacionesPayload>
          }
          deleteMany: {
            args: Prisma.wa_notificacionesDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.wa_notificacionesUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.wa_notificacionesUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$wa_notificacionesPayload>
          }
          aggregate: {
            args: Prisma.Wa_notificacionesAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateWa_notificaciones>
          }
          groupBy: {
            args: Prisma.wa_notificacionesGroupByArgs<ExtArgs>
            result: $Utils.Optional<Wa_notificacionesGroupByOutputType>[]
          }
          count: {
            args: Prisma.wa_notificacionesCountArgs<ExtArgs>
            result: $Utils.Optional<Wa_notificacionesCountAggregateOutputType> | number
          }
        }
      }
      wa_logs: {
        payload: Prisma.$wa_logsPayload<ExtArgs>
        fields: Prisma.wa_logsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.wa_logsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$wa_logsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.wa_logsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$wa_logsPayload>
          }
          findFirst: {
            args: Prisma.wa_logsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$wa_logsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.wa_logsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$wa_logsPayload>
          }
          findMany: {
            args: Prisma.wa_logsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$wa_logsPayload>[]
          }
          create: {
            args: Prisma.wa_logsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$wa_logsPayload>
          }
          createMany: {
            args: Prisma.wa_logsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.wa_logsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$wa_logsPayload>
          }
          update: {
            args: Prisma.wa_logsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$wa_logsPayload>
          }
          deleteMany: {
            args: Prisma.wa_logsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.wa_logsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.wa_logsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$wa_logsPayload>
          }
          aggregate: {
            args: Prisma.Wa_logsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateWa_logs>
          }
          groupBy: {
            args: Prisma.wa_logsGroupByArgs<ExtArgs>
            result: $Utils.Optional<Wa_logsGroupByOutputType>[]
          }
          count: {
            args: Prisma.wa_logsCountArgs<ExtArgs>
            result: $Utils.Optional<Wa_logsCountAggregateOutputType> | number
          }
        }
      }
      inventario: {
        payload: Prisma.$inventarioPayload<ExtArgs>
        fields: Prisma.inventarioFieldRefs
        operations: {
          findUnique: {
            args: Prisma.inventarioFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$inventarioPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.inventarioFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$inventarioPayload>
          }
          findFirst: {
            args: Prisma.inventarioFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$inventarioPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.inventarioFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$inventarioPayload>
          }
          findMany: {
            args: Prisma.inventarioFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$inventarioPayload>[]
          }
          create: {
            args: Prisma.inventarioCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$inventarioPayload>
          }
          createMany: {
            args: Prisma.inventarioCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.inventarioDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$inventarioPayload>
          }
          update: {
            args: Prisma.inventarioUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$inventarioPayload>
          }
          deleteMany: {
            args: Prisma.inventarioDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.inventarioUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.inventarioUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$inventarioPayload>
          }
          aggregate: {
            args: Prisma.InventarioAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateInventario>
          }
          groupBy: {
            args: Prisma.inventarioGroupByArgs<ExtArgs>
            result: $Utils.Optional<InventarioGroupByOutputType>[]
          }
          count: {
            args: Prisma.inventarioCountArgs<ExtArgs>
            result: $Utils.Optional<InventarioCountAggregateOutputType> | number
          }
        }
      }
      metricasmensuales: {
        payload: Prisma.$metricasmensualesPayload<ExtArgs>
        fields: Prisma.metricasmensualesFieldRefs
        operations: {
          findUnique: {
            args: Prisma.metricasmensualesFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$metricasmensualesPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.metricasmensualesFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$metricasmensualesPayload>
          }
          findFirst: {
            args: Prisma.metricasmensualesFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$metricasmensualesPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.metricasmensualesFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$metricasmensualesPayload>
          }
          findMany: {
            args: Prisma.metricasmensualesFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$metricasmensualesPayload>[]
          }
          create: {
            args: Prisma.metricasmensualesCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$metricasmensualesPayload>
          }
          createMany: {
            args: Prisma.metricasmensualesCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.metricasmensualesDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$metricasmensualesPayload>
          }
          update: {
            args: Prisma.metricasmensualesUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$metricasmensualesPayload>
          }
          deleteMany: {
            args: Prisma.metricasmensualesDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.metricasmensualesUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.metricasmensualesUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$metricasmensualesPayload>
          }
          aggregate: {
            args: Prisma.MetricasmensualesAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMetricasmensuales>
          }
          groupBy: {
            args: Prisma.metricasmensualesGroupByArgs<ExtArgs>
            result: $Utils.Optional<MetricasmensualesGroupByOutputType>[]
          }
          count: {
            args: Prisma.metricasmensualesCountArgs<ExtArgs>
            result: $Utils.Optional<MetricasmensualesCountAggregateOutputType> | number
          }
        }
      }
      admin: {
        payload: Prisma.$adminPayload<ExtArgs>
        fields: Prisma.adminFieldRefs
        operations: {
          findUnique: {
            args: Prisma.adminFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$adminPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.adminFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$adminPayload>
          }
          findFirst: {
            args: Prisma.adminFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$adminPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.adminFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$adminPayload>
          }
          findMany: {
            args: Prisma.adminFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$adminPayload>[]
          }
          create: {
            args: Prisma.adminCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$adminPayload>
          }
          createMany: {
            args: Prisma.adminCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.adminDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$adminPayload>
          }
          update: {
            args: Prisma.adminUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$adminPayload>
          }
          deleteMany: {
            args: Prisma.adminDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.adminUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.adminUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$adminPayload>
          }
          aggregate: {
            args: Prisma.AdminAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAdmin>
          }
          groupBy: {
            args: Prisma.adminGroupByArgs<ExtArgs>
            result: $Utils.Optional<AdminGroupByOutputType>[]
          }
          count: {
            args: Prisma.adminCountArgs<ExtArgs>
            result: $Utils.Optional<AdminCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory | null
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    cuentascompartidas?: cuentascompartidasOmit
    cuentascompletas?: cuentascompletasOmit
    pantallas?: pantallasOmit
    plataformas?: plataformasOmit
    usuarios?: usuariosOmit
    wa_notificaciones?: wa_notificacionesOmit
    wa_logs?: wa_logsOmit
    inventario?: inventarioOmit
    metricasmensuales?: metricasmensualesOmit
    admin?: adminOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type CuentascompartidasCountOutputType
   */

  export type CuentascompartidasCountOutputType = {
    pantallas: number
  }

  export type CuentascompartidasCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    pantallas?: boolean | CuentascompartidasCountOutputTypeCountPantallasArgs
  }

  // Custom InputTypes
  /**
   * CuentascompartidasCountOutputType without action
   */
  export type CuentascompartidasCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CuentascompartidasCountOutputType
     */
    select?: CuentascompartidasCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * CuentascompartidasCountOutputType without action
   */
  export type CuentascompartidasCountOutputTypeCountPantallasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: pantallasWhereInput
  }


  /**
   * Count Type PlataformasCountOutputType
   */

  export type PlataformasCountOutputType = {
    cuentascompartidas: number
    cuentascompletas: number
    inventario: number
  }

  export type PlataformasCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cuentascompartidas?: boolean | PlataformasCountOutputTypeCountCuentascompartidasArgs
    cuentascompletas?: boolean | PlataformasCountOutputTypeCountCuentascompletasArgs
    inventario?: boolean | PlataformasCountOutputTypeCountInventarioArgs
  }

  // Custom InputTypes
  /**
   * PlataformasCountOutputType without action
   */
  export type PlataformasCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlataformasCountOutputType
     */
    select?: PlataformasCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * PlataformasCountOutputType without action
   */
  export type PlataformasCountOutputTypeCountCuentascompartidasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: cuentascompartidasWhereInput
  }

  /**
   * PlataformasCountOutputType without action
   */
  export type PlataformasCountOutputTypeCountCuentascompletasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: cuentascompletasWhereInput
  }

  /**
   * PlataformasCountOutputType without action
   */
  export type PlataformasCountOutputTypeCountInventarioArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: inventarioWhereInput
  }


  /**
   * Count Type UsuariosCountOutputType
   */

  export type UsuariosCountOutputType = {
    cuentascompletas: number
    pantallas: number
  }

  export type UsuariosCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cuentascompletas?: boolean | UsuariosCountOutputTypeCountCuentascompletasArgs
    pantallas?: boolean | UsuariosCountOutputTypeCountPantallasArgs
  }

  // Custom InputTypes
  /**
   * UsuariosCountOutputType without action
   */
  export type UsuariosCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UsuariosCountOutputType
     */
    select?: UsuariosCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UsuariosCountOutputType without action
   */
  export type UsuariosCountOutputTypeCountCuentascompletasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: cuentascompletasWhereInput
  }

  /**
   * UsuariosCountOutputType without action
   */
  export type UsuariosCountOutputTypeCountPantallasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: pantallasWhereInput
  }


  /**
   * Models
   */

  /**
   * Model cuentascompartidas
   */

  export type AggregateCuentascompartidas = {
    _count: CuentascompartidasCountAggregateOutputType | null
    _avg: CuentascompartidasAvgAggregateOutputType | null
    _sum: CuentascompartidasSumAggregateOutputType | null
    _min: CuentascompartidasMinAggregateOutputType | null
    _max: CuentascompartidasMaxAggregateOutputType | null
  }

  export type CuentascompartidasAvgAggregateOutputType = {
    id: number | null
    plataforma_id: number | null
  }

  export type CuentascompartidasSumAggregateOutputType = {
    id: number | null
    plataforma_id: number | null
  }

  export type CuentascompartidasMinAggregateOutputType = {
    id: number | null
    correo: string | null
    contrasena: string | null
    proveedor: string | null
    plataforma_id: number | null
    cuenta_caida: boolean | null
  }

  export type CuentascompartidasMaxAggregateOutputType = {
    id: number | null
    correo: string | null
    contrasena: string | null
    proveedor: string | null
    plataforma_id: number | null
    cuenta_caida: boolean | null
  }

  export type CuentascompartidasCountAggregateOutputType = {
    id: number
    correo: number
    contrasena: number
    proveedor: number
    plataforma_id: number
    cuenta_caida: number
    _all: number
  }


  export type CuentascompartidasAvgAggregateInputType = {
    id?: true
    plataforma_id?: true
  }

  export type CuentascompartidasSumAggregateInputType = {
    id?: true
    plataforma_id?: true
  }

  export type CuentascompartidasMinAggregateInputType = {
    id?: true
    correo?: true
    contrasena?: true
    proveedor?: true
    plataforma_id?: true
    cuenta_caida?: true
  }

  export type CuentascompartidasMaxAggregateInputType = {
    id?: true
    correo?: true
    contrasena?: true
    proveedor?: true
    plataforma_id?: true
    cuenta_caida?: true
  }

  export type CuentascompartidasCountAggregateInputType = {
    id?: true
    correo?: true
    contrasena?: true
    proveedor?: true
    plataforma_id?: true
    cuenta_caida?: true
    _all?: true
  }

  export type CuentascompartidasAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which cuentascompartidas to aggregate.
     */
    where?: cuentascompartidasWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of cuentascompartidas to fetch.
     */
    orderBy?: cuentascompartidasOrderByWithRelationInput | cuentascompartidasOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: cuentascompartidasWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` cuentascompartidas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` cuentascompartidas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned cuentascompartidas
    **/
    _count?: true | CuentascompartidasCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CuentascompartidasAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CuentascompartidasSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CuentascompartidasMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CuentascompartidasMaxAggregateInputType
  }

  export type GetCuentascompartidasAggregateType<T extends CuentascompartidasAggregateArgs> = {
        [P in keyof T & keyof AggregateCuentascompartidas]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCuentascompartidas[P]>
      : GetScalarType<T[P], AggregateCuentascompartidas[P]>
  }




  export type cuentascompartidasGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: cuentascompartidasWhereInput
    orderBy?: cuentascompartidasOrderByWithAggregationInput | cuentascompartidasOrderByWithAggregationInput[]
    by: CuentascompartidasScalarFieldEnum[] | CuentascompartidasScalarFieldEnum
    having?: cuentascompartidasScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CuentascompartidasCountAggregateInputType | true
    _avg?: CuentascompartidasAvgAggregateInputType
    _sum?: CuentascompartidasSumAggregateInputType
    _min?: CuentascompartidasMinAggregateInputType
    _max?: CuentascompartidasMaxAggregateInputType
  }

  export type CuentascompartidasGroupByOutputType = {
    id: number
    correo: string
    contrasena: string
    proveedor: string | null
    plataforma_id: number | null
    cuenta_caida: boolean
    _count: CuentascompartidasCountAggregateOutputType | null
    _avg: CuentascompartidasAvgAggregateOutputType | null
    _sum: CuentascompartidasSumAggregateOutputType | null
    _min: CuentascompartidasMinAggregateOutputType | null
    _max: CuentascompartidasMaxAggregateOutputType | null
  }

  type GetCuentascompartidasGroupByPayload<T extends cuentascompartidasGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CuentascompartidasGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CuentascompartidasGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CuentascompartidasGroupByOutputType[P]>
            : GetScalarType<T[P], CuentascompartidasGroupByOutputType[P]>
        }
      >
    >


  export type cuentascompartidasSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    correo?: boolean
    contrasena?: boolean
    proveedor?: boolean
    plataforma_id?: boolean
    cuenta_caida?: boolean
    plataformas?: boolean | cuentascompartidas$plataformasArgs<ExtArgs>
    pantallas?: boolean | cuentascompartidas$pantallasArgs<ExtArgs>
    _count?: boolean | CuentascompartidasCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["cuentascompartidas"]>



  export type cuentascompartidasSelectScalar = {
    id?: boolean
    correo?: boolean
    contrasena?: boolean
    proveedor?: boolean
    plataforma_id?: boolean
    cuenta_caida?: boolean
  }

  export type cuentascompartidasOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "correo" | "contrasena" | "proveedor" | "plataforma_id" | "cuenta_caida", ExtArgs["result"]["cuentascompartidas"]>
  export type cuentascompartidasInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    plataformas?: boolean | cuentascompartidas$plataformasArgs<ExtArgs>
    pantallas?: boolean | cuentascompartidas$pantallasArgs<ExtArgs>
    _count?: boolean | CuentascompartidasCountOutputTypeDefaultArgs<ExtArgs>
  }

  export type $cuentascompartidasPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "cuentascompartidas"
    objects: {
      plataformas: Prisma.$plataformasPayload<ExtArgs> | null
      pantallas: Prisma.$pantallasPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      correo: string
      contrasena: string
      proveedor: string | null
      plataforma_id: number | null
      cuenta_caida: boolean
    }, ExtArgs["result"]["cuentascompartidas"]>
    composites: {}
  }

  type cuentascompartidasGetPayload<S extends boolean | null | undefined | cuentascompartidasDefaultArgs> = $Result.GetResult<Prisma.$cuentascompartidasPayload, S>

  type cuentascompartidasCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<cuentascompartidasFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CuentascompartidasCountAggregateInputType | true
    }

  export interface cuentascompartidasDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['cuentascompartidas'], meta: { name: 'cuentascompartidas' } }
    /**
     * Find zero or one Cuentascompartidas that matches the filter.
     * @param {cuentascompartidasFindUniqueArgs} args - Arguments to find a Cuentascompartidas
     * @example
     * // Get one Cuentascompartidas
     * const cuentascompartidas = await prisma.cuentascompartidas.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends cuentascompartidasFindUniqueArgs>(args: SelectSubset<T, cuentascompartidasFindUniqueArgs<ExtArgs>>): Prisma__cuentascompartidasClient<$Result.GetResult<Prisma.$cuentascompartidasPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Cuentascompartidas that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {cuentascompartidasFindUniqueOrThrowArgs} args - Arguments to find a Cuentascompartidas
     * @example
     * // Get one Cuentascompartidas
     * const cuentascompartidas = await prisma.cuentascompartidas.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends cuentascompartidasFindUniqueOrThrowArgs>(args: SelectSubset<T, cuentascompartidasFindUniqueOrThrowArgs<ExtArgs>>): Prisma__cuentascompartidasClient<$Result.GetResult<Prisma.$cuentascompartidasPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Cuentascompartidas that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {cuentascompartidasFindFirstArgs} args - Arguments to find a Cuentascompartidas
     * @example
     * // Get one Cuentascompartidas
     * const cuentascompartidas = await prisma.cuentascompartidas.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends cuentascompartidasFindFirstArgs>(args?: SelectSubset<T, cuentascompartidasFindFirstArgs<ExtArgs>>): Prisma__cuentascompartidasClient<$Result.GetResult<Prisma.$cuentascompartidasPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Cuentascompartidas that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {cuentascompartidasFindFirstOrThrowArgs} args - Arguments to find a Cuentascompartidas
     * @example
     * // Get one Cuentascompartidas
     * const cuentascompartidas = await prisma.cuentascompartidas.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends cuentascompartidasFindFirstOrThrowArgs>(args?: SelectSubset<T, cuentascompartidasFindFirstOrThrowArgs<ExtArgs>>): Prisma__cuentascompartidasClient<$Result.GetResult<Prisma.$cuentascompartidasPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Cuentascompartidas that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {cuentascompartidasFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Cuentascompartidas
     * const cuentascompartidas = await prisma.cuentascompartidas.findMany()
     * 
     * // Get first 10 Cuentascompartidas
     * const cuentascompartidas = await prisma.cuentascompartidas.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const cuentascompartidasWithIdOnly = await prisma.cuentascompartidas.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends cuentascompartidasFindManyArgs>(args?: SelectSubset<T, cuentascompartidasFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$cuentascompartidasPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Cuentascompartidas.
     * @param {cuentascompartidasCreateArgs} args - Arguments to create a Cuentascompartidas.
     * @example
     * // Create one Cuentascompartidas
     * const Cuentascompartidas = await prisma.cuentascompartidas.create({
     *   data: {
     *     // ... data to create a Cuentascompartidas
     *   }
     * })
     * 
     */
    create<T extends cuentascompartidasCreateArgs>(args: SelectSubset<T, cuentascompartidasCreateArgs<ExtArgs>>): Prisma__cuentascompartidasClient<$Result.GetResult<Prisma.$cuentascompartidasPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Cuentascompartidas.
     * @param {cuentascompartidasCreateManyArgs} args - Arguments to create many Cuentascompartidas.
     * @example
     * // Create many Cuentascompartidas
     * const cuentascompartidas = await prisma.cuentascompartidas.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends cuentascompartidasCreateManyArgs>(args?: SelectSubset<T, cuentascompartidasCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Cuentascompartidas.
     * @param {cuentascompartidasDeleteArgs} args - Arguments to delete one Cuentascompartidas.
     * @example
     * // Delete one Cuentascompartidas
     * const Cuentascompartidas = await prisma.cuentascompartidas.delete({
     *   where: {
     *     // ... filter to delete one Cuentascompartidas
     *   }
     * })
     * 
     */
    delete<T extends cuentascompartidasDeleteArgs>(args: SelectSubset<T, cuentascompartidasDeleteArgs<ExtArgs>>): Prisma__cuentascompartidasClient<$Result.GetResult<Prisma.$cuentascompartidasPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Cuentascompartidas.
     * @param {cuentascompartidasUpdateArgs} args - Arguments to update one Cuentascompartidas.
     * @example
     * // Update one Cuentascompartidas
     * const cuentascompartidas = await prisma.cuentascompartidas.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends cuentascompartidasUpdateArgs>(args: SelectSubset<T, cuentascompartidasUpdateArgs<ExtArgs>>): Prisma__cuentascompartidasClient<$Result.GetResult<Prisma.$cuentascompartidasPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Cuentascompartidas.
     * @param {cuentascompartidasDeleteManyArgs} args - Arguments to filter Cuentascompartidas to delete.
     * @example
     * // Delete a few Cuentascompartidas
     * const { count } = await prisma.cuentascompartidas.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends cuentascompartidasDeleteManyArgs>(args?: SelectSubset<T, cuentascompartidasDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Cuentascompartidas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {cuentascompartidasUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Cuentascompartidas
     * const cuentascompartidas = await prisma.cuentascompartidas.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends cuentascompartidasUpdateManyArgs>(args: SelectSubset<T, cuentascompartidasUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Cuentascompartidas.
     * @param {cuentascompartidasUpsertArgs} args - Arguments to update or create a Cuentascompartidas.
     * @example
     * // Update or create a Cuentascompartidas
     * const cuentascompartidas = await prisma.cuentascompartidas.upsert({
     *   create: {
     *     // ... data to create a Cuentascompartidas
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Cuentascompartidas we want to update
     *   }
     * })
     */
    upsert<T extends cuentascompartidasUpsertArgs>(args: SelectSubset<T, cuentascompartidasUpsertArgs<ExtArgs>>): Prisma__cuentascompartidasClient<$Result.GetResult<Prisma.$cuentascompartidasPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Cuentascompartidas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {cuentascompartidasCountArgs} args - Arguments to filter Cuentascompartidas to count.
     * @example
     * // Count the number of Cuentascompartidas
     * const count = await prisma.cuentascompartidas.count({
     *   where: {
     *     // ... the filter for the Cuentascompartidas we want to count
     *   }
     * })
    **/
    count<T extends cuentascompartidasCountArgs>(
      args?: Subset<T, cuentascompartidasCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CuentascompartidasCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Cuentascompartidas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CuentascompartidasAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CuentascompartidasAggregateArgs>(args: Subset<T, CuentascompartidasAggregateArgs>): Prisma.PrismaPromise<GetCuentascompartidasAggregateType<T>>

    /**
     * Group by Cuentascompartidas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {cuentascompartidasGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends cuentascompartidasGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: cuentascompartidasGroupByArgs['orderBy'] }
        : { orderBy?: cuentascompartidasGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, cuentascompartidasGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCuentascompartidasGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the cuentascompartidas model
   */
  readonly fields: cuentascompartidasFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for cuentascompartidas.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__cuentascompartidasClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    plataformas<T extends cuentascompartidas$plataformasArgs<ExtArgs> = {}>(args?: Subset<T, cuentascompartidas$plataformasArgs<ExtArgs>>): Prisma__plataformasClient<$Result.GetResult<Prisma.$plataformasPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    pantallas<T extends cuentascompartidas$pantallasArgs<ExtArgs> = {}>(args?: Subset<T, cuentascompartidas$pantallasArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$pantallasPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the cuentascompartidas model
   */
  interface cuentascompartidasFieldRefs {
    readonly id: FieldRef<"cuentascompartidas", 'Int'>
    readonly correo: FieldRef<"cuentascompartidas", 'String'>
    readonly contrasena: FieldRef<"cuentascompartidas", 'String'>
    readonly proveedor: FieldRef<"cuentascompartidas", 'String'>
    readonly plataforma_id: FieldRef<"cuentascompartidas", 'Int'>
    readonly cuenta_caida: FieldRef<"cuentascompartidas", 'Boolean'>
  }
    

  // Custom InputTypes
  /**
   * cuentascompartidas findUnique
   */
  export type cuentascompartidasFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cuentascompartidas
     */
    select?: cuentascompartidasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cuentascompartidas
     */
    omit?: cuentascompartidasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: cuentascompartidasInclude<ExtArgs> | null
    /**
     * Filter, which cuentascompartidas to fetch.
     */
    where: cuentascompartidasWhereUniqueInput
  }

  /**
   * cuentascompartidas findUniqueOrThrow
   */
  export type cuentascompartidasFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cuentascompartidas
     */
    select?: cuentascompartidasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cuentascompartidas
     */
    omit?: cuentascompartidasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: cuentascompartidasInclude<ExtArgs> | null
    /**
     * Filter, which cuentascompartidas to fetch.
     */
    where: cuentascompartidasWhereUniqueInput
  }

  /**
   * cuentascompartidas findFirst
   */
  export type cuentascompartidasFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cuentascompartidas
     */
    select?: cuentascompartidasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cuentascompartidas
     */
    omit?: cuentascompartidasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: cuentascompartidasInclude<ExtArgs> | null
    /**
     * Filter, which cuentascompartidas to fetch.
     */
    where?: cuentascompartidasWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of cuentascompartidas to fetch.
     */
    orderBy?: cuentascompartidasOrderByWithRelationInput | cuentascompartidasOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for cuentascompartidas.
     */
    cursor?: cuentascompartidasWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` cuentascompartidas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` cuentascompartidas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of cuentascompartidas.
     */
    distinct?: CuentascompartidasScalarFieldEnum | CuentascompartidasScalarFieldEnum[]
  }

  /**
   * cuentascompartidas findFirstOrThrow
   */
  export type cuentascompartidasFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cuentascompartidas
     */
    select?: cuentascompartidasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cuentascompartidas
     */
    omit?: cuentascompartidasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: cuentascompartidasInclude<ExtArgs> | null
    /**
     * Filter, which cuentascompartidas to fetch.
     */
    where?: cuentascompartidasWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of cuentascompartidas to fetch.
     */
    orderBy?: cuentascompartidasOrderByWithRelationInput | cuentascompartidasOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for cuentascompartidas.
     */
    cursor?: cuentascompartidasWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` cuentascompartidas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` cuentascompartidas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of cuentascompartidas.
     */
    distinct?: CuentascompartidasScalarFieldEnum | CuentascompartidasScalarFieldEnum[]
  }

  /**
   * cuentascompartidas findMany
   */
  export type cuentascompartidasFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cuentascompartidas
     */
    select?: cuentascompartidasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cuentascompartidas
     */
    omit?: cuentascompartidasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: cuentascompartidasInclude<ExtArgs> | null
    /**
     * Filter, which cuentascompartidas to fetch.
     */
    where?: cuentascompartidasWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of cuentascompartidas to fetch.
     */
    orderBy?: cuentascompartidasOrderByWithRelationInput | cuentascompartidasOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing cuentascompartidas.
     */
    cursor?: cuentascompartidasWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` cuentascompartidas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` cuentascompartidas.
     */
    skip?: number
    distinct?: CuentascompartidasScalarFieldEnum | CuentascompartidasScalarFieldEnum[]
  }

  /**
   * cuentascompartidas create
   */
  export type cuentascompartidasCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cuentascompartidas
     */
    select?: cuentascompartidasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cuentascompartidas
     */
    omit?: cuentascompartidasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: cuentascompartidasInclude<ExtArgs> | null
    /**
     * The data needed to create a cuentascompartidas.
     */
    data: XOR<cuentascompartidasCreateInput, cuentascompartidasUncheckedCreateInput>
  }

  /**
   * cuentascompartidas createMany
   */
  export type cuentascompartidasCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many cuentascompartidas.
     */
    data: cuentascompartidasCreateManyInput | cuentascompartidasCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * cuentascompartidas update
   */
  export type cuentascompartidasUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cuentascompartidas
     */
    select?: cuentascompartidasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cuentascompartidas
     */
    omit?: cuentascompartidasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: cuentascompartidasInclude<ExtArgs> | null
    /**
     * The data needed to update a cuentascompartidas.
     */
    data: XOR<cuentascompartidasUpdateInput, cuentascompartidasUncheckedUpdateInput>
    /**
     * Choose, which cuentascompartidas to update.
     */
    where: cuentascompartidasWhereUniqueInput
  }

  /**
   * cuentascompartidas updateMany
   */
  export type cuentascompartidasUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update cuentascompartidas.
     */
    data: XOR<cuentascompartidasUpdateManyMutationInput, cuentascompartidasUncheckedUpdateManyInput>
    /**
     * Filter which cuentascompartidas to update
     */
    where?: cuentascompartidasWhereInput
    /**
     * Limit how many cuentascompartidas to update.
     */
    limit?: number
  }

  /**
   * cuentascompartidas upsert
   */
  export type cuentascompartidasUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cuentascompartidas
     */
    select?: cuentascompartidasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cuentascompartidas
     */
    omit?: cuentascompartidasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: cuentascompartidasInclude<ExtArgs> | null
    /**
     * The filter to search for the cuentascompartidas to update in case it exists.
     */
    where: cuentascompartidasWhereUniqueInput
    /**
     * In case the cuentascompartidas found by the `where` argument doesn't exist, create a new cuentascompartidas with this data.
     */
    create: XOR<cuentascompartidasCreateInput, cuentascompartidasUncheckedCreateInput>
    /**
     * In case the cuentascompartidas was found with the provided `where` argument, update it with this data.
     */
    update: XOR<cuentascompartidasUpdateInput, cuentascompartidasUncheckedUpdateInput>
  }

  /**
   * cuentascompartidas delete
   */
  export type cuentascompartidasDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cuentascompartidas
     */
    select?: cuentascompartidasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cuentascompartidas
     */
    omit?: cuentascompartidasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: cuentascompartidasInclude<ExtArgs> | null
    /**
     * Filter which cuentascompartidas to delete.
     */
    where: cuentascompartidasWhereUniqueInput
  }

  /**
   * cuentascompartidas deleteMany
   */
  export type cuentascompartidasDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which cuentascompartidas to delete
     */
    where?: cuentascompartidasWhereInput
    /**
     * Limit how many cuentascompartidas to delete.
     */
    limit?: number
  }

  /**
   * cuentascompartidas.plataformas
   */
  export type cuentascompartidas$plataformasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the plataformas
     */
    select?: plataformasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the plataformas
     */
    omit?: plataformasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: plataformasInclude<ExtArgs> | null
    where?: plataformasWhereInput
  }

  /**
   * cuentascompartidas.pantallas
   */
  export type cuentascompartidas$pantallasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the pantallas
     */
    select?: pantallasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the pantallas
     */
    omit?: pantallasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: pantallasInclude<ExtArgs> | null
    where?: pantallasWhereInput
    orderBy?: pantallasOrderByWithRelationInput | pantallasOrderByWithRelationInput[]
    cursor?: pantallasWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PantallasScalarFieldEnum | PantallasScalarFieldEnum[]
  }

  /**
   * cuentascompartidas without action
   */
  export type cuentascompartidasDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cuentascompartidas
     */
    select?: cuentascompartidasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cuentascompartidas
     */
    omit?: cuentascompartidasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: cuentascompartidasInclude<ExtArgs> | null
  }


  /**
   * Model cuentascompletas
   */

  export type AggregateCuentascompletas = {
    _count: CuentascompletasCountAggregateOutputType | null
    _avg: CuentascompletasAvgAggregateOutputType | null
    _sum: CuentascompletasSumAggregateOutputType | null
    _min: CuentascompletasMinAggregateOutputType | null
    _max: CuentascompletasMaxAggregateOutputType | null
  }

  export type CuentascompletasAvgAggregateOutputType = {
    id: number | null
    plataforma_id: number | null
    meses_pagados: number | null
    total_pagado_completa: Decimal | null
    total_ganado: Decimal | null
    total_pagado_proveedor_completa: Decimal | null
  }

  export type CuentascompletasSumAggregateOutputType = {
    id: bigint | null
    plataforma_id: number | null
    meses_pagados: number | null
    total_pagado_completa: Decimal | null
    total_ganado: Decimal | null
    total_pagado_proveedor_completa: Decimal | null
  }

  export type CuentascompletasMinAggregateOutputType = {
    id: bigint | null
    contacto: string | null
    plataforma_id: number | null
    proveedor: string | null
    fecha_compra: Date | null
    fecha_vencimiento: Date | null
    meses_pagados: number | null
    total_pagado_completa: Decimal | null
    estado: string | null
    comentario: string | null
    contrasena: string | null
    correo: string | null
    total_ganado: Decimal | null
    total_pagado_proveedor_completa: Decimal | null
  }

  export type CuentascompletasMaxAggregateOutputType = {
    id: bigint | null
    contacto: string | null
    plataforma_id: number | null
    proveedor: string | null
    fecha_compra: Date | null
    fecha_vencimiento: Date | null
    meses_pagados: number | null
    total_pagado_completa: Decimal | null
    estado: string | null
    comentario: string | null
    contrasena: string | null
    correo: string | null
    total_ganado: Decimal | null
    total_pagado_proveedor_completa: Decimal | null
  }

  export type CuentascompletasCountAggregateOutputType = {
    id: number
    contacto: number
    plataforma_id: number
    proveedor: number
    fecha_compra: number
    fecha_vencimiento: number
    meses_pagados: number
    total_pagado_completa: number
    estado: number
    comentario: number
    contrasena: number
    correo: number
    total_ganado: number
    total_pagado_proveedor_completa: number
    _all: number
  }


  export type CuentascompletasAvgAggregateInputType = {
    id?: true
    plataforma_id?: true
    meses_pagados?: true
    total_pagado_completa?: true
    total_ganado?: true
    total_pagado_proveedor_completa?: true
  }

  export type CuentascompletasSumAggregateInputType = {
    id?: true
    plataforma_id?: true
    meses_pagados?: true
    total_pagado_completa?: true
    total_ganado?: true
    total_pagado_proveedor_completa?: true
  }

  export type CuentascompletasMinAggregateInputType = {
    id?: true
    contacto?: true
    plataforma_id?: true
    proveedor?: true
    fecha_compra?: true
    fecha_vencimiento?: true
    meses_pagados?: true
    total_pagado_completa?: true
    estado?: true
    comentario?: true
    contrasena?: true
    correo?: true
    total_ganado?: true
    total_pagado_proveedor_completa?: true
  }

  export type CuentascompletasMaxAggregateInputType = {
    id?: true
    contacto?: true
    plataforma_id?: true
    proveedor?: true
    fecha_compra?: true
    fecha_vencimiento?: true
    meses_pagados?: true
    total_pagado_completa?: true
    estado?: true
    comentario?: true
    contrasena?: true
    correo?: true
    total_ganado?: true
    total_pagado_proveedor_completa?: true
  }

  export type CuentascompletasCountAggregateInputType = {
    id?: true
    contacto?: true
    plataforma_id?: true
    proveedor?: true
    fecha_compra?: true
    fecha_vencimiento?: true
    meses_pagados?: true
    total_pagado_completa?: true
    estado?: true
    comentario?: true
    contrasena?: true
    correo?: true
    total_ganado?: true
    total_pagado_proveedor_completa?: true
    _all?: true
  }

  export type CuentascompletasAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which cuentascompletas to aggregate.
     */
    where?: cuentascompletasWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of cuentascompletas to fetch.
     */
    orderBy?: cuentascompletasOrderByWithRelationInput | cuentascompletasOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: cuentascompletasWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` cuentascompletas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` cuentascompletas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned cuentascompletas
    **/
    _count?: true | CuentascompletasCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CuentascompletasAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CuentascompletasSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CuentascompletasMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CuentascompletasMaxAggregateInputType
  }

  export type GetCuentascompletasAggregateType<T extends CuentascompletasAggregateArgs> = {
        [P in keyof T & keyof AggregateCuentascompletas]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCuentascompletas[P]>
      : GetScalarType<T[P], AggregateCuentascompletas[P]>
  }




  export type cuentascompletasGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: cuentascompletasWhereInput
    orderBy?: cuentascompletasOrderByWithAggregationInput | cuentascompletasOrderByWithAggregationInput[]
    by: CuentascompletasScalarFieldEnum[] | CuentascompletasScalarFieldEnum
    having?: cuentascompletasScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CuentascompletasCountAggregateInputType | true
    _avg?: CuentascompletasAvgAggregateInputType
    _sum?: CuentascompletasSumAggregateInputType
    _min?: CuentascompletasMinAggregateInputType
    _max?: CuentascompletasMaxAggregateInputType
  }

  export type CuentascompletasGroupByOutputType = {
    id: bigint
    contacto: string
    plataforma_id: number
    proveedor: string | null
    fecha_compra: Date | null
    fecha_vencimiento: Date | null
    meses_pagados: number | null
    total_pagado_completa: Decimal | null
    estado: string | null
    comentario: string | null
    contrasena: string
    correo: string
    total_ganado: Decimal | null
    total_pagado_proveedor_completa: Decimal | null
    _count: CuentascompletasCountAggregateOutputType | null
    _avg: CuentascompletasAvgAggregateOutputType | null
    _sum: CuentascompletasSumAggregateOutputType | null
    _min: CuentascompletasMinAggregateOutputType | null
    _max: CuentascompletasMaxAggregateOutputType | null
  }

  type GetCuentascompletasGroupByPayload<T extends cuentascompletasGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CuentascompletasGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CuentascompletasGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CuentascompletasGroupByOutputType[P]>
            : GetScalarType<T[P], CuentascompletasGroupByOutputType[P]>
        }
      >
    >


  export type cuentascompletasSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    contacto?: boolean
    plataforma_id?: boolean
    proveedor?: boolean
    fecha_compra?: boolean
    fecha_vencimiento?: boolean
    meses_pagados?: boolean
    total_pagado_completa?: boolean
    estado?: boolean
    comentario?: boolean
    contrasena?: boolean
    correo?: boolean
    total_ganado?: boolean
    total_pagado_proveedor_completa?: boolean
    plataformas?: boolean | plataformasDefaultArgs<ExtArgs>
    usuarios?: boolean | usuariosDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["cuentascompletas"]>



  export type cuentascompletasSelectScalar = {
    id?: boolean
    contacto?: boolean
    plataforma_id?: boolean
    proveedor?: boolean
    fecha_compra?: boolean
    fecha_vencimiento?: boolean
    meses_pagados?: boolean
    total_pagado_completa?: boolean
    estado?: boolean
    comentario?: boolean
    contrasena?: boolean
    correo?: boolean
    total_ganado?: boolean
    total_pagado_proveedor_completa?: boolean
  }

  export type cuentascompletasOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "contacto" | "plataforma_id" | "proveedor" | "fecha_compra" | "fecha_vencimiento" | "meses_pagados" | "total_pagado_completa" | "estado" | "comentario" | "contrasena" | "correo" | "total_ganado" | "total_pagado_proveedor_completa", ExtArgs["result"]["cuentascompletas"]>
  export type cuentascompletasInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    plataformas?: boolean | plataformasDefaultArgs<ExtArgs>
    usuarios?: boolean | usuariosDefaultArgs<ExtArgs>
  }

  export type $cuentascompletasPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "cuentascompletas"
    objects: {
      plataformas: Prisma.$plataformasPayload<ExtArgs>
      usuarios: Prisma.$usuariosPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      contacto: string
      plataforma_id: number
      proveedor: string | null
      fecha_compra: Date | null
      fecha_vencimiento: Date | null
      meses_pagados: number | null
      total_pagado_completa: Prisma.Decimal | null
      estado: string | null
      comentario: string | null
      contrasena: string
      correo: string
      total_ganado: Prisma.Decimal | null
      total_pagado_proveedor_completa: Prisma.Decimal | null
    }, ExtArgs["result"]["cuentascompletas"]>
    composites: {}
  }

  type cuentascompletasGetPayload<S extends boolean | null | undefined | cuentascompletasDefaultArgs> = $Result.GetResult<Prisma.$cuentascompletasPayload, S>

  type cuentascompletasCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<cuentascompletasFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CuentascompletasCountAggregateInputType | true
    }

  export interface cuentascompletasDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['cuentascompletas'], meta: { name: 'cuentascompletas' } }
    /**
     * Find zero or one Cuentascompletas that matches the filter.
     * @param {cuentascompletasFindUniqueArgs} args - Arguments to find a Cuentascompletas
     * @example
     * // Get one Cuentascompletas
     * const cuentascompletas = await prisma.cuentascompletas.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends cuentascompletasFindUniqueArgs>(args: SelectSubset<T, cuentascompletasFindUniqueArgs<ExtArgs>>): Prisma__cuentascompletasClient<$Result.GetResult<Prisma.$cuentascompletasPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Cuentascompletas that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {cuentascompletasFindUniqueOrThrowArgs} args - Arguments to find a Cuentascompletas
     * @example
     * // Get one Cuentascompletas
     * const cuentascompletas = await prisma.cuentascompletas.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends cuentascompletasFindUniqueOrThrowArgs>(args: SelectSubset<T, cuentascompletasFindUniqueOrThrowArgs<ExtArgs>>): Prisma__cuentascompletasClient<$Result.GetResult<Prisma.$cuentascompletasPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Cuentascompletas that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {cuentascompletasFindFirstArgs} args - Arguments to find a Cuentascompletas
     * @example
     * // Get one Cuentascompletas
     * const cuentascompletas = await prisma.cuentascompletas.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends cuentascompletasFindFirstArgs>(args?: SelectSubset<T, cuentascompletasFindFirstArgs<ExtArgs>>): Prisma__cuentascompletasClient<$Result.GetResult<Prisma.$cuentascompletasPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Cuentascompletas that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {cuentascompletasFindFirstOrThrowArgs} args - Arguments to find a Cuentascompletas
     * @example
     * // Get one Cuentascompletas
     * const cuentascompletas = await prisma.cuentascompletas.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends cuentascompletasFindFirstOrThrowArgs>(args?: SelectSubset<T, cuentascompletasFindFirstOrThrowArgs<ExtArgs>>): Prisma__cuentascompletasClient<$Result.GetResult<Prisma.$cuentascompletasPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Cuentascompletas that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {cuentascompletasFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Cuentascompletas
     * const cuentascompletas = await prisma.cuentascompletas.findMany()
     * 
     * // Get first 10 Cuentascompletas
     * const cuentascompletas = await prisma.cuentascompletas.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const cuentascompletasWithIdOnly = await prisma.cuentascompletas.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends cuentascompletasFindManyArgs>(args?: SelectSubset<T, cuentascompletasFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$cuentascompletasPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Cuentascompletas.
     * @param {cuentascompletasCreateArgs} args - Arguments to create a Cuentascompletas.
     * @example
     * // Create one Cuentascompletas
     * const Cuentascompletas = await prisma.cuentascompletas.create({
     *   data: {
     *     // ... data to create a Cuentascompletas
     *   }
     * })
     * 
     */
    create<T extends cuentascompletasCreateArgs>(args: SelectSubset<T, cuentascompletasCreateArgs<ExtArgs>>): Prisma__cuentascompletasClient<$Result.GetResult<Prisma.$cuentascompletasPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Cuentascompletas.
     * @param {cuentascompletasCreateManyArgs} args - Arguments to create many Cuentascompletas.
     * @example
     * // Create many Cuentascompletas
     * const cuentascompletas = await prisma.cuentascompletas.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends cuentascompletasCreateManyArgs>(args?: SelectSubset<T, cuentascompletasCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Cuentascompletas.
     * @param {cuentascompletasDeleteArgs} args - Arguments to delete one Cuentascompletas.
     * @example
     * // Delete one Cuentascompletas
     * const Cuentascompletas = await prisma.cuentascompletas.delete({
     *   where: {
     *     // ... filter to delete one Cuentascompletas
     *   }
     * })
     * 
     */
    delete<T extends cuentascompletasDeleteArgs>(args: SelectSubset<T, cuentascompletasDeleteArgs<ExtArgs>>): Prisma__cuentascompletasClient<$Result.GetResult<Prisma.$cuentascompletasPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Cuentascompletas.
     * @param {cuentascompletasUpdateArgs} args - Arguments to update one Cuentascompletas.
     * @example
     * // Update one Cuentascompletas
     * const cuentascompletas = await prisma.cuentascompletas.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends cuentascompletasUpdateArgs>(args: SelectSubset<T, cuentascompletasUpdateArgs<ExtArgs>>): Prisma__cuentascompletasClient<$Result.GetResult<Prisma.$cuentascompletasPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Cuentascompletas.
     * @param {cuentascompletasDeleteManyArgs} args - Arguments to filter Cuentascompletas to delete.
     * @example
     * // Delete a few Cuentascompletas
     * const { count } = await prisma.cuentascompletas.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends cuentascompletasDeleteManyArgs>(args?: SelectSubset<T, cuentascompletasDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Cuentascompletas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {cuentascompletasUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Cuentascompletas
     * const cuentascompletas = await prisma.cuentascompletas.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends cuentascompletasUpdateManyArgs>(args: SelectSubset<T, cuentascompletasUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Cuentascompletas.
     * @param {cuentascompletasUpsertArgs} args - Arguments to update or create a Cuentascompletas.
     * @example
     * // Update or create a Cuentascompletas
     * const cuentascompletas = await prisma.cuentascompletas.upsert({
     *   create: {
     *     // ... data to create a Cuentascompletas
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Cuentascompletas we want to update
     *   }
     * })
     */
    upsert<T extends cuentascompletasUpsertArgs>(args: SelectSubset<T, cuentascompletasUpsertArgs<ExtArgs>>): Prisma__cuentascompletasClient<$Result.GetResult<Prisma.$cuentascompletasPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Cuentascompletas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {cuentascompletasCountArgs} args - Arguments to filter Cuentascompletas to count.
     * @example
     * // Count the number of Cuentascompletas
     * const count = await prisma.cuentascompletas.count({
     *   where: {
     *     // ... the filter for the Cuentascompletas we want to count
     *   }
     * })
    **/
    count<T extends cuentascompletasCountArgs>(
      args?: Subset<T, cuentascompletasCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CuentascompletasCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Cuentascompletas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CuentascompletasAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CuentascompletasAggregateArgs>(args: Subset<T, CuentascompletasAggregateArgs>): Prisma.PrismaPromise<GetCuentascompletasAggregateType<T>>

    /**
     * Group by Cuentascompletas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {cuentascompletasGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends cuentascompletasGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: cuentascompletasGroupByArgs['orderBy'] }
        : { orderBy?: cuentascompletasGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, cuentascompletasGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCuentascompletasGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the cuentascompletas model
   */
  readonly fields: cuentascompletasFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for cuentascompletas.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__cuentascompletasClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    plataformas<T extends plataformasDefaultArgs<ExtArgs> = {}>(args?: Subset<T, plataformasDefaultArgs<ExtArgs>>): Prisma__plataformasClient<$Result.GetResult<Prisma.$plataformasPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    usuarios<T extends usuariosDefaultArgs<ExtArgs> = {}>(args?: Subset<T, usuariosDefaultArgs<ExtArgs>>): Prisma__usuariosClient<$Result.GetResult<Prisma.$usuariosPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the cuentascompletas model
   */
  interface cuentascompletasFieldRefs {
    readonly id: FieldRef<"cuentascompletas", 'BigInt'>
    readonly contacto: FieldRef<"cuentascompletas", 'String'>
    readonly plataforma_id: FieldRef<"cuentascompletas", 'Int'>
    readonly proveedor: FieldRef<"cuentascompletas", 'String'>
    readonly fecha_compra: FieldRef<"cuentascompletas", 'DateTime'>
    readonly fecha_vencimiento: FieldRef<"cuentascompletas", 'DateTime'>
    readonly meses_pagados: FieldRef<"cuentascompletas", 'Int'>
    readonly total_pagado_completa: FieldRef<"cuentascompletas", 'Decimal'>
    readonly estado: FieldRef<"cuentascompletas", 'String'>
    readonly comentario: FieldRef<"cuentascompletas", 'String'>
    readonly contrasena: FieldRef<"cuentascompletas", 'String'>
    readonly correo: FieldRef<"cuentascompletas", 'String'>
    readonly total_ganado: FieldRef<"cuentascompletas", 'Decimal'>
    readonly total_pagado_proveedor_completa: FieldRef<"cuentascompletas", 'Decimal'>
  }
    

  // Custom InputTypes
  /**
   * cuentascompletas findUnique
   */
  export type cuentascompletasFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cuentascompletas
     */
    select?: cuentascompletasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cuentascompletas
     */
    omit?: cuentascompletasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: cuentascompletasInclude<ExtArgs> | null
    /**
     * Filter, which cuentascompletas to fetch.
     */
    where: cuentascompletasWhereUniqueInput
  }

  /**
   * cuentascompletas findUniqueOrThrow
   */
  export type cuentascompletasFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cuentascompletas
     */
    select?: cuentascompletasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cuentascompletas
     */
    omit?: cuentascompletasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: cuentascompletasInclude<ExtArgs> | null
    /**
     * Filter, which cuentascompletas to fetch.
     */
    where: cuentascompletasWhereUniqueInput
  }

  /**
   * cuentascompletas findFirst
   */
  export type cuentascompletasFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cuentascompletas
     */
    select?: cuentascompletasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cuentascompletas
     */
    omit?: cuentascompletasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: cuentascompletasInclude<ExtArgs> | null
    /**
     * Filter, which cuentascompletas to fetch.
     */
    where?: cuentascompletasWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of cuentascompletas to fetch.
     */
    orderBy?: cuentascompletasOrderByWithRelationInput | cuentascompletasOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for cuentascompletas.
     */
    cursor?: cuentascompletasWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` cuentascompletas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` cuentascompletas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of cuentascompletas.
     */
    distinct?: CuentascompletasScalarFieldEnum | CuentascompletasScalarFieldEnum[]
  }

  /**
   * cuentascompletas findFirstOrThrow
   */
  export type cuentascompletasFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cuentascompletas
     */
    select?: cuentascompletasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cuentascompletas
     */
    omit?: cuentascompletasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: cuentascompletasInclude<ExtArgs> | null
    /**
     * Filter, which cuentascompletas to fetch.
     */
    where?: cuentascompletasWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of cuentascompletas to fetch.
     */
    orderBy?: cuentascompletasOrderByWithRelationInput | cuentascompletasOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for cuentascompletas.
     */
    cursor?: cuentascompletasWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` cuentascompletas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` cuentascompletas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of cuentascompletas.
     */
    distinct?: CuentascompletasScalarFieldEnum | CuentascompletasScalarFieldEnum[]
  }

  /**
   * cuentascompletas findMany
   */
  export type cuentascompletasFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cuentascompletas
     */
    select?: cuentascompletasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cuentascompletas
     */
    omit?: cuentascompletasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: cuentascompletasInclude<ExtArgs> | null
    /**
     * Filter, which cuentascompletas to fetch.
     */
    where?: cuentascompletasWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of cuentascompletas to fetch.
     */
    orderBy?: cuentascompletasOrderByWithRelationInput | cuentascompletasOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing cuentascompletas.
     */
    cursor?: cuentascompletasWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` cuentascompletas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` cuentascompletas.
     */
    skip?: number
    distinct?: CuentascompletasScalarFieldEnum | CuentascompletasScalarFieldEnum[]
  }

  /**
   * cuentascompletas create
   */
  export type cuentascompletasCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cuentascompletas
     */
    select?: cuentascompletasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cuentascompletas
     */
    omit?: cuentascompletasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: cuentascompletasInclude<ExtArgs> | null
    /**
     * The data needed to create a cuentascompletas.
     */
    data: XOR<cuentascompletasCreateInput, cuentascompletasUncheckedCreateInput>
  }

  /**
   * cuentascompletas createMany
   */
  export type cuentascompletasCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many cuentascompletas.
     */
    data: cuentascompletasCreateManyInput | cuentascompletasCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * cuentascompletas update
   */
  export type cuentascompletasUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cuentascompletas
     */
    select?: cuentascompletasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cuentascompletas
     */
    omit?: cuentascompletasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: cuentascompletasInclude<ExtArgs> | null
    /**
     * The data needed to update a cuentascompletas.
     */
    data: XOR<cuentascompletasUpdateInput, cuentascompletasUncheckedUpdateInput>
    /**
     * Choose, which cuentascompletas to update.
     */
    where: cuentascompletasWhereUniqueInput
  }

  /**
   * cuentascompletas updateMany
   */
  export type cuentascompletasUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update cuentascompletas.
     */
    data: XOR<cuentascompletasUpdateManyMutationInput, cuentascompletasUncheckedUpdateManyInput>
    /**
     * Filter which cuentascompletas to update
     */
    where?: cuentascompletasWhereInput
    /**
     * Limit how many cuentascompletas to update.
     */
    limit?: number
  }

  /**
   * cuentascompletas upsert
   */
  export type cuentascompletasUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cuentascompletas
     */
    select?: cuentascompletasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cuentascompletas
     */
    omit?: cuentascompletasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: cuentascompletasInclude<ExtArgs> | null
    /**
     * The filter to search for the cuentascompletas to update in case it exists.
     */
    where: cuentascompletasWhereUniqueInput
    /**
     * In case the cuentascompletas found by the `where` argument doesn't exist, create a new cuentascompletas with this data.
     */
    create: XOR<cuentascompletasCreateInput, cuentascompletasUncheckedCreateInput>
    /**
     * In case the cuentascompletas was found with the provided `where` argument, update it with this data.
     */
    update: XOR<cuentascompletasUpdateInput, cuentascompletasUncheckedUpdateInput>
  }

  /**
   * cuentascompletas delete
   */
  export type cuentascompletasDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cuentascompletas
     */
    select?: cuentascompletasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cuentascompletas
     */
    omit?: cuentascompletasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: cuentascompletasInclude<ExtArgs> | null
    /**
     * Filter which cuentascompletas to delete.
     */
    where: cuentascompletasWhereUniqueInput
  }

  /**
   * cuentascompletas deleteMany
   */
  export type cuentascompletasDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which cuentascompletas to delete
     */
    where?: cuentascompletasWhereInput
    /**
     * Limit how many cuentascompletas to delete.
     */
    limit?: number
  }

  /**
   * cuentascompletas without action
   */
  export type cuentascompletasDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cuentascompletas
     */
    select?: cuentascompletasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cuentascompletas
     */
    omit?: cuentascompletasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: cuentascompletasInclude<ExtArgs> | null
  }


  /**
   * Model pantallas
   */

  export type AggregatePantallas = {
    _count: PantallasCountAggregateOutputType | null
    _avg: PantallasAvgAggregateOutputType | null
    _sum: PantallasSumAggregateOutputType | null
    _min: PantallasMinAggregateOutputType | null
    _max: PantallasMaxAggregateOutputType | null
  }

  export type PantallasAvgAggregateOutputType = {
    id: number | null
    cuenta_id: number | null
    meses_pagados: number | null
    total_pagado: Decimal | null
    total_ganado: Decimal | null
    total_pagado_proveedor: Decimal | null
  }

  export type PantallasSumAggregateOutputType = {
    id: number | null
    cuenta_id: number | null
    meses_pagados: number | null
    total_pagado: Decimal | null
    total_ganado: Decimal | null
    total_pagado_proveedor: Decimal | null
  }

  export type PantallasMinAggregateOutputType = {
    id: number | null
    cuenta_id: number | null
    contacto: string | null
    nro_pantalla: string | null
    fecha_compra: Date | null
    fecha_vencimiento: Date | null
    meses_pagados: number | null
    total_pagado: Decimal | null
    estado: string | null
    comentario: string | null
    total_ganado: Decimal | null
    total_pagado_proveedor: Decimal | null
  }

  export type PantallasMaxAggregateOutputType = {
    id: number | null
    cuenta_id: number | null
    contacto: string | null
    nro_pantalla: string | null
    fecha_compra: Date | null
    fecha_vencimiento: Date | null
    meses_pagados: number | null
    total_pagado: Decimal | null
    estado: string | null
    comentario: string | null
    total_ganado: Decimal | null
    total_pagado_proveedor: Decimal | null
  }

  export type PantallasCountAggregateOutputType = {
    id: number
    cuenta_id: number
    contacto: number
    nro_pantalla: number
    fecha_compra: number
    fecha_vencimiento: number
    meses_pagados: number
    total_pagado: number
    estado: number
    comentario: number
    total_ganado: number
    total_pagado_proveedor: number
    _all: number
  }


  export type PantallasAvgAggregateInputType = {
    id?: true
    cuenta_id?: true
    meses_pagados?: true
    total_pagado?: true
    total_ganado?: true
    total_pagado_proveedor?: true
  }

  export type PantallasSumAggregateInputType = {
    id?: true
    cuenta_id?: true
    meses_pagados?: true
    total_pagado?: true
    total_ganado?: true
    total_pagado_proveedor?: true
  }

  export type PantallasMinAggregateInputType = {
    id?: true
    cuenta_id?: true
    contacto?: true
    nro_pantalla?: true
    fecha_compra?: true
    fecha_vencimiento?: true
    meses_pagados?: true
    total_pagado?: true
    estado?: true
    comentario?: true
    total_ganado?: true
    total_pagado_proveedor?: true
  }

  export type PantallasMaxAggregateInputType = {
    id?: true
    cuenta_id?: true
    contacto?: true
    nro_pantalla?: true
    fecha_compra?: true
    fecha_vencimiento?: true
    meses_pagados?: true
    total_pagado?: true
    estado?: true
    comentario?: true
    total_ganado?: true
    total_pagado_proveedor?: true
  }

  export type PantallasCountAggregateInputType = {
    id?: true
    cuenta_id?: true
    contacto?: true
    nro_pantalla?: true
    fecha_compra?: true
    fecha_vencimiento?: true
    meses_pagados?: true
    total_pagado?: true
    estado?: true
    comentario?: true
    total_ganado?: true
    total_pagado_proveedor?: true
    _all?: true
  }

  export type PantallasAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which pantallas to aggregate.
     */
    where?: pantallasWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of pantallas to fetch.
     */
    orderBy?: pantallasOrderByWithRelationInput | pantallasOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: pantallasWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` pantallas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` pantallas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned pantallas
    **/
    _count?: true | PantallasCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: PantallasAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: PantallasSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PantallasMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PantallasMaxAggregateInputType
  }

  export type GetPantallasAggregateType<T extends PantallasAggregateArgs> = {
        [P in keyof T & keyof AggregatePantallas]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePantallas[P]>
      : GetScalarType<T[P], AggregatePantallas[P]>
  }




  export type pantallasGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: pantallasWhereInput
    orderBy?: pantallasOrderByWithAggregationInput | pantallasOrderByWithAggregationInput[]
    by: PantallasScalarFieldEnum[] | PantallasScalarFieldEnum
    having?: pantallasScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PantallasCountAggregateInputType | true
    _avg?: PantallasAvgAggregateInputType
    _sum?: PantallasSumAggregateInputType
    _min?: PantallasMinAggregateInputType
    _max?: PantallasMaxAggregateInputType
  }

  export type PantallasGroupByOutputType = {
    id: number
    cuenta_id: number
    contacto: string
    nro_pantalla: string
    fecha_compra: Date
    fecha_vencimiento: Date
    meses_pagados: number | null
    total_pagado: Decimal | null
    estado: string
    comentario: string | null
    total_ganado: Decimal | null
    total_pagado_proveedor: Decimal | null
    _count: PantallasCountAggregateOutputType | null
    _avg: PantallasAvgAggregateOutputType | null
    _sum: PantallasSumAggregateOutputType | null
    _min: PantallasMinAggregateOutputType | null
    _max: PantallasMaxAggregateOutputType | null
  }

  type GetPantallasGroupByPayload<T extends pantallasGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PantallasGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PantallasGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PantallasGroupByOutputType[P]>
            : GetScalarType<T[P], PantallasGroupByOutputType[P]>
        }
      >
    >


  export type pantallasSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    cuenta_id?: boolean
    contacto?: boolean
    nro_pantalla?: boolean
    fecha_compra?: boolean
    fecha_vencimiento?: boolean
    meses_pagados?: boolean
    total_pagado?: boolean
    estado?: boolean
    comentario?: boolean
    total_ganado?: boolean
    total_pagado_proveedor?: boolean
    usuarios?: boolean | usuariosDefaultArgs<ExtArgs>
    cuentascompartidas?: boolean | cuentascompartidasDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["pantallas"]>



  export type pantallasSelectScalar = {
    id?: boolean
    cuenta_id?: boolean
    contacto?: boolean
    nro_pantalla?: boolean
    fecha_compra?: boolean
    fecha_vencimiento?: boolean
    meses_pagados?: boolean
    total_pagado?: boolean
    estado?: boolean
    comentario?: boolean
    total_ganado?: boolean
    total_pagado_proveedor?: boolean
  }

  export type pantallasOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "cuenta_id" | "contacto" | "nro_pantalla" | "fecha_compra" | "fecha_vencimiento" | "meses_pagados" | "total_pagado" | "estado" | "comentario" | "total_ganado" | "total_pagado_proveedor", ExtArgs["result"]["pantallas"]>
  export type pantallasInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    usuarios?: boolean | usuariosDefaultArgs<ExtArgs>
    cuentascompartidas?: boolean | cuentascompartidasDefaultArgs<ExtArgs>
  }

  export type $pantallasPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "pantallas"
    objects: {
      usuarios: Prisma.$usuariosPayload<ExtArgs>
      cuentascompartidas: Prisma.$cuentascompartidasPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      cuenta_id: number
      contacto: string
      nro_pantalla: string
      fecha_compra: Date
      fecha_vencimiento: Date
      meses_pagados: number | null
      total_pagado: Prisma.Decimal | null
      estado: string
      comentario: string | null
      total_ganado: Prisma.Decimal | null
      total_pagado_proveedor: Prisma.Decimal | null
    }, ExtArgs["result"]["pantallas"]>
    composites: {}
  }

  type pantallasGetPayload<S extends boolean | null | undefined | pantallasDefaultArgs> = $Result.GetResult<Prisma.$pantallasPayload, S>

  type pantallasCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<pantallasFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: PantallasCountAggregateInputType | true
    }

  export interface pantallasDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['pantallas'], meta: { name: 'pantallas' } }
    /**
     * Find zero or one Pantallas that matches the filter.
     * @param {pantallasFindUniqueArgs} args - Arguments to find a Pantallas
     * @example
     * // Get one Pantallas
     * const pantallas = await prisma.pantallas.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends pantallasFindUniqueArgs>(args: SelectSubset<T, pantallasFindUniqueArgs<ExtArgs>>): Prisma__pantallasClient<$Result.GetResult<Prisma.$pantallasPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Pantallas that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {pantallasFindUniqueOrThrowArgs} args - Arguments to find a Pantallas
     * @example
     * // Get one Pantallas
     * const pantallas = await prisma.pantallas.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends pantallasFindUniqueOrThrowArgs>(args: SelectSubset<T, pantallasFindUniqueOrThrowArgs<ExtArgs>>): Prisma__pantallasClient<$Result.GetResult<Prisma.$pantallasPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Pantallas that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {pantallasFindFirstArgs} args - Arguments to find a Pantallas
     * @example
     * // Get one Pantallas
     * const pantallas = await prisma.pantallas.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends pantallasFindFirstArgs>(args?: SelectSubset<T, pantallasFindFirstArgs<ExtArgs>>): Prisma__pantallasClient<$Result.GetResult<Prisma.$pantallasPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Pantallas that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {pantallasFindFirstOrThrowArgs} args - Arguments to find a Pantallas
     * @example
     * // Get one Pantallas
     * const pantallas = await prisma.pantallas.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends pantallasFindFirstOrThrowArgs>(args?: SelectSubset<T, pantallasFindFirstOrThrowArgs<ExtArgs>>): Prisma__pantallasClient<$Result.GetResult<Prisma.$pantallasPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Pantallas that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {pantallasFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Pantallas
     * const pantallas = await prisma.pantallas.findMany()
     * 
     * // Get first 10 Pantallas
     * const pantallas = await prisma.pantallas.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const pantallasWithIdOnly = await prisma.pantallas.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends pantallasFindManyArgs>(args?: SelectSubset<T, pantallasFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$pantallasPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Pantallas.
     * @param {pantallasCreateArgs} args - Arguments to create a Pantallas.
     * @example
     * // Create one Pantallas
     * const Pantallas = await prisma.pantallas.create({
     *   data: {
     *     // ... data to create a Pantallas
     *   }
     * })
     * 
     */
    create<T extends pantallasCreateArgs>(args: SelectSubset<T, pantallasCreateArgs<ExtArgs>>): Prisma__pantallasClient<$Result.GetResult<Prisma.$pantallasPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Pantallas.
     * @param {pantallasCreateManyArgs} args - Arguments to create many Pantallas.
     * @example
     * // Create many Pantallas
     * const pantallas = await prisma.pantallas.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends pantallasCreateManyArgs>(args?: SelectSubset<T, pantallasCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Pantallas.
     * @param {pantallasDeleteArgs} args - Arguments to delete one Pantallas.
     * @example
     * // Delete one Pantallas
     * const Pantallas = await prisma.pantallas.delete({
     *   where: {
     *     // ... filter to delete one Pantallas
     *   }
     * })
     * 
     */
    delete<T extends pantallasDeleteArgs>(args: SelectSubset<T, pantallasDeleteArgs<ExtArgs>>): Prisma__pantallasClient<$Result.GetResult<Prisma.$pantallasPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Pantallas.
     * @param {pantallasUpdateArgs} args - Arguments to update one Pantallas.
     * @example
     * // Update one Pantallas
     * const pantallas = await prisma.pantallas.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends pantallasUpdateArgs>(args: SelectSubset<T, pantallasUpdateArgs<ExtArgs>>): Prisma__pantallasClient<$Result.GetResult<Prisma.$pantallasPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Pantallas.
     * @param {pantallasDeleteManyArgs} args - Arguments to filter Pantallas to delete.
     * @example
     * // Delete a few Pantallas
     * const { count } = await prisma.pantallas.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends pantallasDeleteManyArgs>(args?: SelectSubset<T, pantallasDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Pantallas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {pantallasUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Pantallas
     * const pantallas = await prisma.pantallas.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends pantallasUpdateManyArgs>(args: SelectSubset<T, pantallasUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Pantallas.
     * @param {pantallasUpsertArgs} args - Arguments to update or create a Pantallas.
     * @example
     * // Update or create a Pantallas
     * const pantallas = await prisma.pantallas.upsert({
     *   create: {
     *     // ... data to create a Pantallas
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Pantallas we want to update
     *   }
     * })
     */
    upsert<T extends pantallasUpsertArgs>(args: SelectSubset<T, pantallasUpsertArgs<ExtArgs>>): Prisma__pantallasClient<$Result.GetResult<Prisma.$pantallasPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Pantallas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {pantallasCountArgs} args - Arguments to filter Pantallas to count.
     * @example
     * // Count the number of Pantallas
     * const count = await prisma.pantallas.count({
     *   where: {
     *     // ... the filter for the Pantallas we want to count
     *   }
     * })
    **/
    count<T extends pantallasCountArgs>(
      args?: Subset<T, pantallasCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PantallasCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Pantallas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PantallasAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PantallasAggregateArgs>(args: Subset<T, PantallasAggregateArgs>): Prisma.PrismaPromise<GetPantallasAggregateType<T>>

    /**
     * Group by Pantallas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {pantallasGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends pantallasGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: pantallasGroupByArgs['orderBy'] }
        : { orderBy?: pantallasGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, pantallasGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPantallasGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the pantallas model
   */
  readonly fields: pantallasFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for pantallas.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__pantallasClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    usuarios<T extends usuariosDefaultArgs<ExtArgs> = {}>(args?: Subset<T, usuariosDefaultArgs<ExtArgs>>): Prisma__usuariosClient<$Result.GetResult<Prisma.$usuariosPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    cuentascompartidas<T extends cuentascompartidasDefaultArgs<ExtArgs> = {}>(args?: Subset<T, cuentascompartidasDefaultArgs<ExtArgs>>): Prisma__cuentascompartidasClient<$Result.GetResult<Prisma.$cuentascompartidasPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the pantallas model
   */
  interface pantallasFieldRefs {
    readonly id: FieldRef<"pantallas", 'Int'>
    readonly cuenta_id: FieldRef<"pantallas", 'Int'>
    readonly contacto: FieldRef<"pantallas", 'String'>
    readonly nro_pantalla: FieldRef<"pantallas", 'String'>
    readonly fecha_compra: FieldRef<"pantallas", 'DateTime'>
    readonly fecha_vencimiento: FieldRef<"pantallas", 'DateTime'>
    readonly meses_pagados: FieldRef<"pantallas", 'Int'>
    readonly total_pagado: FieldRef<"pantallas", 'Decimal'>
    readonly estado: FieldRef<"pantallas", 'String'>
    readonly comentario: FieldRef<"pantallas", 'String'>
    readonly total_ganado: FieldRef<"pantallas", 'Decimal'>
    readonly total_pagado_proveedor: FieldRef<"pantallas", 'Decimal'>
  }
    

  // Custom InputTypes
  /**
   * pantallas findUnique
   */
  export type pantallasFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the pantallas
     */
    select?: pantallasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the pantallas
     */
    omit?: pantallasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: pantallasInclude<ExtArgs> | null
    /**
     * Filter, which pantallas to fetch.
     */
    where: pantallasWhereUniqueInput
  }

  /**
   * pantallas findUniqueOrThrow
   */
  export type pantallasFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the pantallas
     */
    select?: pantallasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the pantallas
     */
    omit?: pantallasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: pantallasInclude<ExtArgs> | null
    /**
     * Filter, which pantallas to fetch.
     */
    where: pantallasWhereUniqueInput
  }

  /**
   * pantallas findFirst
   */
  export type pantallasFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the pantallas
     */
    select?: pantallasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the pantallas
     */
    omit?: pantallasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: pantallasInclude<ExtArgs> | null
    /**
     * Filter, which pantallas to fetch.
     */
    where?: pantallasWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of pantallas to fetch.
     */
    orderBy?: pantallasOrderByWithRelationInput | pantallasOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for pantallas.
     */
    cursor?: pantallasWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` pantallas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` pantallas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of pantallas.
     */
    distinct?: PantallasScalarFieldEnum | PantallasScalarFieldEnum[]
  }

  /**
   * pantallas findFirstOrThrow
   */
  export type pantallasFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the pantallas
     */
    select?: pantallasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the pantallas
     */
    omit?: pantallasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: pantallasInclude<ExtArgs> | null
    /**
     * Filter, which pantallas to fetch.
     */
    where?: pantallasWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of pantallas to fetch.
     */
    orderBy?: pantallasOrderByWithRelationInput | pantallasOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for pantallas.
     */
    cursor?: pantallasWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` pantallas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` pantallas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of pantallas.
     */
    distinct?: PantallasScalarFieldEnum | PantallasScalarFieldEnum[]
  }

  /**
   * pantallas findMany
   */
  export type pantallasFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the pantallas
     */
    select?: pantallasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the pantallas
     */
    omit?: pantallasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: pantallasInclude<ExtArgs> | null
    /**
     * Filter, which pantallas to fetch.
     */
    where?: pantallasWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of pantallas to fetch.
     */
    orderBy?: pantallasOrderByWithRelationInput | pantallasOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing pantallas.
     */
    cursor?: pantallasWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` pantallas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` pantallas.
     */
    skip?: number
    distinct?: PantallasScalarFieldEnum | PantallasScalarFieldEnum[]
  }

  /**
   * pantallas create
   */
  export type pantallasCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the pantallas
     */
    select?: pantallasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the pantallas
     */
    omit?: pantallasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: pantallasInclude<ExtArgs> | null
    /**
     * The data needed to create a pantallas.
     */
    data: XOR<pantallasCreateInput, pantallasUncheckedCreateInput>
  }

  /**
   * pantallas createMany
   */
  export type pantallasCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many pantallas.
     */
    data: pantallasCreateManyInput | pantallasCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * pantallas update
   */
  export type pantallasUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the pantallas
     */
    select?: pantallasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the pantallas
     */
    omit?: pantallasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: pantallasInclude<ExtArgs> | null
    /**
     * The data needed to update a pantallas.
     */
    data: XOR<pantallasUpdateInput, pantallasUncheckedUpdateInput>
    /**
     * Choose, which pantallas to update.
     */
    where: pantallasWhereUniqueInput
  }

  /**
   * pantallas updateMany
   */
  export type pantallasUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update pantallas.
     */
    data: XOR<pantallasUpdateManyMutationInput, pantallasUncheckedUpdateManyInput>
    /**
     * Filter which pantallas to update
     */
    where?: pantallasWhereInput
    /**
     * Limit how many pantallas to update.
     */
    limit?: number
  }

  /**
   * pantallas upsert
   */
  export type pantallasUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the pantallas
     */
    select?: pantallasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the pantallas
     */
    omit?: pantallasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: pantallasInclude<ExtArgs> | null
    /**
     * The filter to search for the pantallas to update in case it exists.
     */
    where: pantallasWhereUniqueInput
    /**
     * In case the pantallas found by the `where` argument doesn't exist, create a new pantallas with this data.
     */
    create: XOR<pantallasCreateInput, pantallasUncheckedCreateInput>
    /**
     * In case the pantallas was found with the provided `where` argument, update it with this data.
     */
    update: XOR<pantallasUpdateInput, pantallasUncheckedUpdateInput>
  }

  /**
   * pantallas delete
   */
  export type pantallasDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the pantallas
     */
    select?: pantallasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the pantallas
     */
    omit?: pantallasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: pantallasInclude<ExtArgs> | null
    /**
     * Filter which pantallas to delete.
     */
    where: pantallasWhereUniqueInput
  }

  /**
   * pantallas deleteMany
   */
  export type pantallasDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which pantallas to delete
     */
    where?: pantallasWhereInput
    /**
     * Limit how many pantallas to delete.
     */
    limit?: number
  }

  /**
   * pantallas without action
   */
  export type pantallasDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the pantallas
     */
    select?: pantallasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the pantallas
     */
    omit?: pantallasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: pantallasInclude<ExtArgs> | null
  }


  /**
   * Model plataformas
   */

  export type AggregatePlataformas = {
    _count: PlataformasCountAggregateOutputType | null
    _avg: PlataformasAvgAggregateOutputType | null
    _sum: PlataformasSumAggregateOutputType | null
    _min: PlataformasMinAggregateOutputType | null
    _max: PlataformasMaxAggregateOutputType | null
  }

  export type PlataformasAvgAggregateOutputType = {
    id: number | null
    cantidad_pantallas: number | null
    total_pagado_proveedor: Decimal | null
    total_pagado: Decimal | null
    total_pagado_completa: Decimal | null
    total_pagado_proveedor_completa: Decimal | null
  }

  export type PlataformasSumAggregateOutputType = {
    id: number | null
    cantidad_pantallas: number | null
    total_pagado_proveedor: Decimal | null
    total_pagado: Decimal | null
    total_pagado_completa: Decimal | null
    total_pagado_proveedor_completa: Decimal | null
  }

  export type PlataformasMinAggregateOutputType = {
    id: number | null
    nombre: string | null
    cantidad_pantallas: number | null
    total_pagado_proveedor: Decimal | null
    total_pagado: Decimal | null
    total_pagado_completa: Decimal | null
    total_pagado_proveedor_completa: Decimal | null
  }

  export type PlataformasMaxAggregateOutputType = {
    id: number | null
    nombre: string | null
    cantidad_pantallas: number | null
    total_pagado_proveedor: Decimal | null
    total_pagado: Decimal | null
    total_pagado_completa: Decimal | null
    total_pagado_proveedor_completa: Decimal | null
  }

  export type PlataformasCountAggregateOutputType = {
    id: number
    nombre: number
    cantidad_pantallas: number
    total_pagado_proveedor: number
    total_pagado: number
    total_pagado_completa: number
    total_pagado_proveedor_completa: number
    _all: number
  }


  export type PlataformasAvgAggregateInputType = {
    id?: true
    cantidad_pantallas?: true
    total_pagado_proveedor?: true
    total_pagado?: true
    total_pagado_completa?: true
    total_pagado_proveedor_completa?: true
  }

  export type PlataformasSumAggregateInputType = {
    id?: true
    cantidad_pantallas?: true
    total_pagado_proveedor?: true
    total_pagado?: true
    total_pagado_completa?: true
    total_pagado_proveedor_completa?: true
  }

  export type PlataformasMinAggregateInputType = {
    id?: true
    nombre?: true
    cantidad_pantallas?: true
    total_pagado_proveedor?: true
    total_pagado?: true
    total_pagado_completa?: true
    total_pagado_proveedor_completa?: true
  }

  export type PlataformasMaxAggregateInputType = {
    id?: true
    nombre?: true
    cantidad_pantallas?: true
    total_pagado_proveedor?: true
    total_pagado?: true
    total_pagado_completa?: true
    total_pagado_proveedor_completa?: true
  }

  export type PlataformasCountAggregateInputType = {
    id?: true
    nombre?: true
    cantidad_pantallas?: true
    total_pagado_proveedor?: true
    total_pagado?: true
    total_pagado_completa?: true
    total_pagado_proveedor_completa?: true
    _all?: true
  }

  export type PlataformasAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which plataformas to aggregate.
     */
    where?: plataformasWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of plataformas to fetch.
     */
    orderBy?: plataformasOrderByWithRelationInput | plataformasOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: plataformasWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` plataformas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` plataformas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned plataformas
    **/
    _count?: true | PlataformasCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: PlataformasAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: PlataformasSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PlataformasMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PlataformasMaxAggregateInputType
  }

  export type GetPlataformasAggregateType<T extends PlataformasAggregateArgs> = {
        [P in keyof T & keyof AggregatePlataformas]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePlataformas[P]>
      : GetScalarType<T[P], AggregatePlataformas[P]>
  }




  export type plataformasGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: plataformasWhereInput
    orderBy?: plataformasOrderByWithAggregationInput | plataformasOrderByWithAggregationInput[]
    by: PlataformasScalarFieldEnum[] | PlataformasScalarFieldEnum
    having?: plataformasScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PlataformasCountAggregateInputType | true
    _avg?: PlataformasAvgAggregateInputType
    _sum?: PlataformasSumAggregateInputType
    _min?: PlataformasMinAggregateInputType
    _max?: PlataformasMaxAggregateInputType
  }

  export type PlataformasGroupByOutputType = {
    id: number
    nombre: string
    cantidad_pantallas: number
    total_pagado_proveedor: Decimal | null
    total_pagado: Decimal | null
    total_pagado_completa: Decimal | null
    total_pagado_proveedor_completa: Decimal | null
    _count: PlataformasCountAggregateOutputType | null
    _avg: PlataformasAvgAggregateOutputType | null
    _sum: PlataformasSumAggregateOutputType | null
    _min: PlataformasMinAggregateOutputType | null
    _max: PlataformasMaxAggregateOutputType | null
  }

  type GetPlataformasGroupByPayload<T extends plataformasGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PlataformasGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PlataformasGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PlataformasGroupByOutputType[P]>
            : GetScalarType<T[P], PlataformasGroupByOutputType[P]>
        }
      >
    >


  export type plataformasSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    nombre?: boolean
    cantidad_pantallas?: boolean
    total_pagado_proveedor?: boolean
    total_pagado?: boolean
    total_pagado_completa?: boolean
    total_pagado_proveedor_completa?: boolean
    cuentascompartidas?: boolean | plataformas$cuentascompartidasArgs<ExtArgs>
    cuentascompletas?: boolean | plataformas$cuentascompletasArgs<ExtArgs>
    inventario?: boolean | plataformas$inventarioArgs<ExtArgs>
    _count?: boolean | PlataformasCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["plataformas"]>



  export type plataformasSelectScalar = {
    id?: boolean
    nombre?: boolean
    cantidad_pantallas?: boolean
    total_pagado_proveedor?: boolean
    total_pagado?: boolean
    total_pagado_completa?: boolean
    total_pagado_proveedor_completa?: boolean
  }

  export type plataformasOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "nombre" | "cantidad_pantallas" | "total_pagado_proveedor" | "total_pagado" | "total_pagado_completa" | "total_pagado_proveedor_completa", ExtArgs["result"]["plataformas"]>
  export type plataformasInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cuentascompartidas?: boolean | plataformas$cuentascompartidasArgs<ExtArgs>
    cuentascompletas?: boolean | plataformas$cuentascompletasArgs<ExtArgs>
    inventario?: boolean | plataformas$inventarioArgs<ExtArgs>
    _count?: boolean | PlataformasCountOutputTypeDefaultArgs<ExtArgs>
  }

  export type $plataformasPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "plataformas"
    objects: {
      cuentascompartidas: Prisma.$cuentascompartidasPayload<ExtArgs>[]
      cuentascompletas: Prisma.$cuentascompletasPayload<ExtArgs>[]
      inventario: Prisma.$inventarioPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      nombre: string
      cantidad_pantallas: number
      total_pagado_proveedor: Prisma.Decimal | null
      total_pagado: Prisma.Decimal | null
      total_pagado_completa: Prisma.Decimal | null
      total_pagado_proveedor_completa: Prisma.Decimal | null
    }, ExtArgs["result"]["plataformas"]>
    composites: {}
  }

  type plataformasGetPayload<S extends boolean | null | undefined | plataformasDefaultArgs> = $Result.GetResult<Prisma.$plataformasPayload, S>

  type plataformasCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<plataformasFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: PlataformasCountAggregateInputType | true
    }

  export interface plataformasDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['plataformas'], meta: { name: 'plataformas' } }
    /**
     * Find zero or one Plataformas that matches the filter.
     * @param {plataformasFindUniqueArgs} args - Arguments to find a Plataformas
     * @example
     * // Get one Plataformas
     * const plataformas = await prisma.plataformas.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends plataformasFindUniqueArgs>(args: SelectSubset<T, plataformasFindUniqueArgs<ExtArgs>>): Prisma__plataformasClient<$Result.GetResult<Prisma.$plataformasPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Plataformas that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {plataformasFindUniqueOrThrowArgs} args - Arguments to find a Plataformas
     * @example
     * // Get one Plataformas
     * const plataformas = await prisma.plataformas.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends plataformasFindUniqueOrThrowArgs>(args: SelectSubset<T, plataformasFindUniqueOrThrowArgs<ExtArgs>>): Prisma__plataformasClient<$Result.GetResult<Prisma.$plataformasPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Plataformas that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {plataformasFindFirstArgs} args - Arguments to find a Plataformas
     * @example
     * // Get one Plataformas
     * const plataformas = await prisma.plataformas.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends plataformasFindFirstArgs>(args?: SelectSubset<T, plataformasFindFirstArgs<ExtArgs>>): Prisma__plataformasClient<$Result.GetResult<Prisma.$plataformasPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Plataformas that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {plataformasFindFirstOrThrowArgs} args - Arguments to find a Plataformas
     * @example
     * // Get one Plataformas
     * const plataformas = await prisma.plataformas.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends plataformasFindFirstOrThrowArgs>(args?: SelectSubset<T, plataformasFindFirstOrThrowArgs<ExtArgs>>): Prisma__plataformasClient<$Result.GetResult<Prisma.$plataformasPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Plataformas that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {plataformasFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Plataformas
     * const plataformas = await prisma.plataformas.findMany()
     * 
     * // Get first 10 Plataformas
     * const plataformas = await prisma.plataformas.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const plataformasWithIdOnly = await prisma.plataformas.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends plataformasFindManyArgs>(args?: SelectSubset<T, plataformasFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$plataformasPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Plataformas.
     * @param {plataformasCreateArgs} args - Arguments to create a Plataformas.
     * @example
     * // Create one Plataformas
     * const Plataformas = await prisma.plataformas.create({
     *   data: {
     *     // ... data to create a Plataformas
     *   }
     * })
     * 
     */
    create<T extends plataformasCreateArgs>(args: SelectSubset<T, plataformasCreateArgs<ExtArgs>>): Prisma__plataformasClient<$Result.GetResult<Prisma.$plataformasPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Plataformas.
     * @param {plataformasCreateManyArgs} args - Arguments to create many Plataformas.
     * @example
     * // Create many Plataformas
     * const plataformas = await prisma.plataformas.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends plataformasCreateManyArgs>(args?: SelectSubset<T, plataformasCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Plataformas.
     * @param {plataformasDeleteArgs} args - Arguments to delete one Plataformas.
     * @example
     * // Delete one Plataformas
     * const Plataformas = await prisma.plataformas.delete({
     *   where: {
     *     // ... filter to delete one Plataformas
     *   }
     * })
     * 
     */
    delete<T extends plataformasDeleteArgs>(args: SelectSubset<T, plataformasDeleteArgs<ExtArgs>>): Prisma__plataformasClient<$Result.GetResult<Prisma.$plataformasPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Plataformas.
     * @param {plataformasUpdateArgs} args - Arguments to update one Plataformas.
     * @example
     * // Update one Plataformas
     * const plataformas = await prisma.plataformas.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends plataformasUpdateArgs>(args: SelectSubset<T, plataformasUpdateArgs<ExtArgs>>): Prisma__plataformasClient<$Result.GetResult<Prisma.$plataformasPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Plataformas.
     * @param {plataformasDeleteManyArgs} args - Arguments to filter Plataformas to delete.
     * @example
     * // Delete a few Plataformas
     * const { count } = await prisma.plataformas.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends plataformasDeleteManyArgs>(args?: SelectSubset<T, plataformasDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Plataformas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {plataformasUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Plataformas
     * const plataformas = await prisma.plataformas.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends plataformasUpdateManyArgs>(args: SelectSubset<T, plataformasUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Plataformas.
     * @param {plataformasUpsertArgs} args - Arguments to update or create a Plataformas.
     * @example
     * // Update or create a Plataformas
     * const plataformas = await prisma.plataformas.upsert({
     *   create: {
     *     // ... data to create a Plataformas
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Plataformas we want to update
     *   }
     * })
     */
    upsert<T extends plataformasUpsertArgs>(args: SelectSubset<T, plataformasUpsertArgs<ExtArgs>>): Prisma__plataformasClient<$Result.GetResult<Prisma.$plataformasPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Plataformas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {plataformasCountArgs} args - Arguments to filter Plataformas to count.
     * @example
     * // Count the number of Plataformas
     * const count = await prisma.plataformas.count({
     *   where: {
     *     // ... the filter for the Plataformas we want to count
     *   }
     * })
    **/
    count<T extends plataformasCountArgs>(
      args?: Subset<T, plataformasCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PlataformasCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Plataformas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlataformasAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PlataformasAggregateArgs>(args: Subset<T, PlataformasAggregateArgs>): Prisma.PrismaPromise<GetPlataformasAggregateType<T>>

    /**
     * Group by Plataformas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {plataformasGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends plataformasGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: plataformasGroupByArgs['orderBy'] }
        : { orderBy?: plataformasGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, plataformasGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPlataformasGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the plataformas model
   */
  readonly fields: plataformasFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for plataformas.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__plataformasClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    cuentascompartidas<T extends plataformas$cuentascompartidasArgs<ExtArgs> = {}>(args?: Subset<T, plataformas$cuentascompartidasArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$cuentascompartidasPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    cuentascompletas<T extends plataformas$cuentascompletasArgs<ExtArgs> = {}>(args?: Subset<T, plataformas$cuentascompletasArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$cuentascompletasPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    inventario<T extends plataformas$inventarioArgs<ExtArgs> = {}>(args?: Subset<T, plataformas$inventarioArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$inventarioPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the plataformas model
   */
  interface plataformasFieldRefs {
    readonly id: FieldRef<"plataformas", 'Int'>
    readonly nombre: FieldRef<"plataformas", 'String'>
    readonly cantidad_pantallas: FieldRef<"plataformas", 'Int'>
    readonly total_pagado_proveedor: FieldRef<"plataformas", 'Decimal'>
    readonly total_pagado: FieldRef<"plataformas", 'Decimal'>
    readonly total_pagado_completa: FieldRef<"plataformas", 'Decimal'>
    readonly total_pagado_proveedor_completa: FieldRef<"plataformas", 'Decimal'>
  }
    

  // Custom InputTypes
  /**
   * plataformas findUnique
   */
  export type plataformasFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the plataformas
     */
    select?: plataformasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the plataformas
     */
    omit?: plataformasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: plataformasInclude<ExtArgs> | null
    /**
     * Filter, which plataformas to fetch.
     */
    where: plataformasWhereUniqueInput
  }

  /**
   * plataformas findUniqueOrThrow
   */
  export type plataformasFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the plataformas
     */
    select?: plataformasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the plataformas
     */
    omit?: plataformasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: plataformasInclude<ExtArgs> | null
    /**
     * Filter, which plataformas to fetch.
     */
    where: plataformasWhereUniqueInput
  }

  /**
   * plataformas findFirst
   */
  export type plataformasFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the plataformas
     */
    select?: plataformasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the plataformas
     */
    omit?: plataformasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: plataformasInclude<ExtArgs> | null
    /**
     * Filter, which plataformas to fetch.
     */
    where?: plataformasWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of plataformas to fetch.
     */
    orderBy?: plataformasOrderByWithRelationInput | plataformasOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for plataformas.
     */
    cursor?: plataformasWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` plataformas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` plataformas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of plataformas.
     */
    distinct?: PlataformasScalarFieldEnum | PlataformasScalarFieldEnum[]
  }

  /**
   * plataformas findFirstOrThrow
   */
  export type plataformasFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the plataformas
     */
    select?: plataformasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the plataformas
     */
    omit?: plataformasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: plataformasInclude<ExtArgs> | null
    /**
     * Filter, which plataformas to fetch.
     */
    where?: plataformasWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of plataformas to fetch.
     */
    orderBy?: plataformasOrderByWithRelationInput | plataformasOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for plataformas.
     */
    cursor?: plataformasWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` plataformas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` plataformas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of plataformas.
     */
    distinct?: PlataformasScalarFieldEnum | PlataformasScalarFieldEnum[]
  }

  /**
   * plataformas findMany
   */
  export type plataformasFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the plataformas
     */
    select?: plataformasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the plataformas
     */
    omit?: plataformasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: plataformasInclude<ExtArgs> | null
    /**
     * Filter, which plataformas to fetch.
     */
    where?: plataformasWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of plataformas to fetch.
     */
    orderBy?: plataformasOrderByWithRelationInput | plataformasOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing plataformas.
     */
    cursor?: plataformasWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` plataformas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` plataformas.
     */
    skip?: number
    distinct?: PlataformasScalarFieldEnum | PlataformasScalarFieldEnum[]
  }

  /**
   * plataformas create
   */
  export type plataformasCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the plataformas
     */
    select?: plataformasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the plataformas
     */
    omit?: plataformasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: plataformasInclude<ExtArgs> | null
    /**
     * The data needed to create a plataformas.
     */
    data: XOR<plataformasCreateInput, plataformasUncheckedCreateInput>
  }

  /**
   * plataformas createMany
   */
  export type plataformasCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many plataformas.
     */
    data: plataformasCreateManyInput | plataformasCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * plataformas update
   */
  export type plataformasUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the plataformas
     */
    select?: plataformasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the plataformas
     */
    omit?: plataformasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: plataformasInclude<ExtArgs> | null
    /**
     * The data needed to update a plataformas.
     */
    data: XOR<plataformasUpdateInput, plataformasUncheckedUpdateInput>
    /**
     * Choose, which plataformas to update.
     */
    where: plataformasWhereUniqueInput
  }

  /**
   * plataformas updateMany
   */
  export type plataformasUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update plataformas.
     */
    data: XOR<plataformasUpdateManyMutationInput, plataformasUncheckedUpdateManyInput>
    /**
     * Filter which plataformas to update
     */
    where?: plataformasWhereInput
    /**
     * Limit how many plataformas to update.
     */
    limit?: number
  }

  /**
   * plataformas upsert
   */
  export type plataformasUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the plataformas
     */
    select?: plataformasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the plataformas
     */
    omit?: plataformasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: plataformasInclude<ExtArgs> | null
    /**
     * The filter to search for the plataformas to update in case it exists.
     */
    where: plataformasWhereUniqueInput
    /**
     * In case the plataformas found by the `where` argument doesn't exist, create a new plataformas with this data.
     */
    create: XOR<plataformasCreateInput, plataformasUncheckedCreateInput>
    /**
     * In case the plataformas was found with the provided `where` argument, update it with this data.
     */
    update: XOR<plataformasUpdateInput, plataformasUncheckedUpdateInput>
  }

  /**
   * plataformas delete
   */
  export type plataformasDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the plataformas
     */
    select?: plataformasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the plataformas
     */
    omit?: plataformasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: plataformasInclude<ExtArgs> | null
    /**
     * Filter which plataformas to delete.
     */
    where: plataformasWhereUniqueInput
  }

  /**
   * plataformas deleteMany
   */
  export type plataformasDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which plataformas to delete
     */
    where?: plataformasWhereInput
    /**
     * Limit how many plataformas to delete.
     */
    limit?: number
  }

  /**
   * plataformas.cuentascompartidas
   */
  export type plataformas$cuentascompartidasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cuentascompartidas
     */
    select?: cuentascompartidasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cuentascompartidas
     */
    omit?: cuentascompartidasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: cuentascompartidasInclude<ExtArgs> | null
    where?: cuentascompartidasWhereInput
    orderBy?: cuentascompartidasOrderByWithRelationInput | cuentascompartidasOrderByWithRelationInput[]
    cursor?: cuentascompartidasWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CuentascompartidasScalarFieldEnum | CuentascompartidasScalarFieldEnum[]
  }

  /**
   * plataformas.cuentascompletas
   */
  export type plataformas$cuentascompletasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cuentascompletas
     */
    select?: cuentascompletasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cuentascompletas
     */
    omit?: cuentascompletasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: cuentascompletasInclude<ExtArgs> | null
    where?: cuentascompletasWhereInput
    orderBy?: cuentascompletasOrderByWithRelationInput | cuentascompletasOrderByWithRelationInput[]
    cursor?: cuentascompletasWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CuentascompletasScalarFieldEnum | CuentascompletasScalarFieldEnum[]
  }

  /**
   * plataformas.inventario
   */
  export type plataformas$inventarioArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the inventario
     */
    select?: inventarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the inventario
     */
    omit?: inventarioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: inventarioInclude<ExtArgs> | null
    where?: inventarioWhereInput
    orderBy?: inventarioOrderByWithRelationInput | inventarioOrderByWithRelationInput[]
    cursor?: inventarioWhereUniqueInput
    take?: number
    skip?: number
    distinct?: InventarioScalarFieldEnum | InventarioScalarFieldEnum[]
  }

  /**
   * plataformas without action
   */
  export type plataformasDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the plataformas
     */
    select?: plataformasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the plataformas
     */
    omit?: plataformasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: plataformasInclude<ExtArgs> | null
  }


  /**
   * Model usuarios
   */

  export type AggregateUsuarios = {
    _count: UsuariosCountAggregateOutputType | null
    _min: UsuariosMinAggregateOutputType | null
    _max: UsuariosMaxAggregateOutputType | null
  }

  export type UsuariosMinAggregateOutputType = {
    contacto: string | null
    nombre: string | null
  }

  export type UsuariosMaxAggregateOutputType = {
    contacto: string | null
    nombre: string | null
  }

  export type UsuariosCountAggregateOutputType = {
    contacto: number
    nombre: number
    _all: number
  }


  export type UsuariosMinAggregateInputType = {
    contacto?: true
    nombre?: true
  }

  export type UsuariosMaxAggregateInputType = {
    contacto?: true
    nombre?: true
  }

  export type UsuariosCountAggregateInputType = {
    contacto?: true
    nombre?: true
    _all?: true
  }

  export type UsuariosAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which usuarios to aggregate.
     */
    where?: usuariosWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of usuarios to fetch.
     */
    orderBy?: usuariosOrderByWithRelationInput | usuariosOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: usuariosWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` usuarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` usuarios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned usuarios
    **/
    _count?: true | UsuariosCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UsuariosMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UsuariosMaxAggregateInputType
  }

  export type GetUsuariosAggregateType<T extends UsuariosAggregateArgs> = {
        [P in keyof T & keyof AggregateUsuarios]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUsuarios[P]>
      : GetScalarType<T[P], AggregateUsuarios[P]>
  }




  export type usuariosGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: usuariosWhereInput
    orderBy?: usuariosOrderByWithAggregationInput | usuariosOrderByWithAggregationInput[]
    by: UsuariosScalarFieldEnum[] | UsuariosScalarFieldEnum
    having?: usuariosScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UsuariosCountAggregateInputType | true
    _min?: UsuariosMinAggregateInputType
    _max?: UsuariosMaxAggregateInputType
  }

  export type UsuariosGroupByOutputType = {
    contacto: string
    nombre: string | null
    _count: UsuariosCountAggregateOutputType | null
    _min: UsuariosMinAggregateOutputType | null
    _max: UsuariosMaxAggregateOutputType | null
  }

  type GetUsuariosGroupByPayload<T extends usuariosGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UsuariosGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UsuariosGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UsuariosGroupByOutputType[P]>
            : GetScalarType<T[P], UsuariosGroupByOutputType[P]>
        }
      >
    >


  export type usuariosSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    contacto?: boolean
    nombre?: boolean
    cuentascompletas?: boolean | usuarios$cuentascompletasArgs<ExtArgs>
    pantallas?: boolean | usuarios$pantallasArgs<ExtArgs>
    _count?: boolean | UsuariosCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["usuarios"]>



  export type usuariosSelectScalar = {
    contacto?: boolean
    nombre?: boolean
  }

  export type usuariosOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"contacto" | "nombre", ExtArgs["result"]["usuarios"]>
  export type usuariosInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cuentascompletas?: boolean | usuarios$cuentascompletasArgs<ExtArgs>
    pantallas?: boolean | usuarios$pantallasArgs<ExtArgs>
    _count?: boolean | UsuariosCountOutputTypeDefaultArgs<ExtArgs>
  }

  export type $usuariosPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "usuarios"
    objects: {
      cuentascompletas: Prisma.$cuentascompletasPayload<ExtArgs>[]
      pantallas: Prisma.$pantallasPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      contacto: string
      nombre: string | null
    }, ExtArgs["result"]["usuarios"]>
    composites: {}
  }

  type usuariosGetPayload<S extends boolean | null | undefined | usuariosDefaultArgs> = $Result.GetResult<Prisma.$usuariosPayload, S>

  type usuariosCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<usuariosFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UsuariosCountAggregateInputType | true
    }

  export interface usuariosDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['usuarios'], meta: { name: 'usuarios' } }
    /**
     * Find zero or one Usuarios that matches the filter.
     * @param {usuariosFindUniqueArgs} args - Arguments to find a Usuarios
     * @example
     * // Get one Usuarios
     * const usuarios = await prisma.usuarios.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends usuariosFindUniqueArgs>(args: SelectSubset<T, usuariosFindUniqueArgs<ExtArgs>>): Prisma__usuariosClient<$Result.GetResult<Prisma.$usuariosPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Usuarios that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {usuariosFindUniqueOrThrowArgs} args - Arguments to find a Usuarios
     * @example
     * // Get one Usuarios
     * const usuarios = await prisma.usuarios.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends usuariosFindUniqueOrThrowArgs>(args: SelectSubset<T, usuariosFindUniqueOrThrowArgs<ExtArgs>>): Prisma__usuariosClient<$Result.GetResult<Prisma.$usuariosPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Usuarios that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {usuariosFindFirstArgs} args - Arguments to find a Usuarios
     * @example
     * // Get one Usuarios
     * const usuarios = await prisma.usuarios.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends usuariosFindFirstArgs>(args?: SelectSubset<T, usuariosFindFirstArgs<ExtArgs>>): Prisma__usuariosClient<$Result.GetResult<Prisma.$usuariosPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Usuarios that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {usuariosFindFirstOrThrowArgs} args - Arguments to find a Usuarios
     * @example
     * // Get one Usuarios
     * const usuarios = await prisma.usuarios.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends usuariosFindFirstOrThrowArgs>(args?: SelectSubset<T, usuariosFindFirstOrThrowArgs<ExtArgs>>): Prisma__usuariosClient<$Result.GetResult<Prisma.$usuariosPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Usuarios that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {usuariosFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Usuarios
     * const usuarios = await prisma.usuarios.findMany()
     * 
     * // Get first 10 Usuarios
     * const usuarios = await prisma.usuarios.findMany({ take: 10 })
     * 
     * // Only select the `contacto`
     * const usuariosWithContactoOnly = await prisma.usuarios.findMany({ select: { contacto: true } })
     * 
     */
    findMany<T extends usuariosFindManyArgs>(args?: SelectSubset<T, usuariosFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$usuariosPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Usuarios.
     * @param {usuariosCreateArgs} args - Arguments to create a Usuarios.
     * @example
     * // Create one Usuarios
     * const Usuarios = await prisma.usuarios.create({
     *   data: {
     *     // ... data to create a Usuarios
     *   }
     * })
     * 
     */
    create<T extends usuariosCreateArgs>(args: SelectSubset<T, usuariosCreateArgs<ExtArgs>>): Prisma__usuariosClient<$Result.GetResult<Prisma.$usuariosPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Usuarios.
     * @param {usuariosCreateManyArgs} args - Arguments to create many Usuarios.
     * @example
     * // Create many Usuarios
     * const usuarios = await prisma.usuarios.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends usuariosCreateManyArgs>(args?: SelectSubset<T, usuariosCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Usuarios.
     * @param {usuariosDeleteArgs} args - Arguments to delete one Usuarios.
     * @example
     * // Delete one Usuarios
     * const Usuarios = await prisma.usuarios.delete({
     *   where: {
     *     // ... filter to delete one Usuarios
     *   }
     * })
     * 
     */
    delete<T extends usuariosDeleteArgs>(args: SelectSubset<T, usuariosDeleteArgs<ExtArgs>>): Prisma__usuariosClient<$Result.GetResult<Prisma.$usuariosPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Usuarios.
     * @param {usuariosUpdateArgs} args - Arguments to update one Usuarios.
     * @example
     * // Update one Usuarios
     * const usuarios = await prisma.usuarios.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends usuariosUpdateArgs>(args: SelectSubset<T, usuariosUpdateArgs<ExtArgs>>): Prisma__usuariosClient<$Result.GetResult<Prisma.$usuariosPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Usuarios.
     * @param {usuariosDeleteManyArgs} args - Arguments to filter Usuarios to delete.
     * @example
     * // Delete a few Usuarios
     * const { count } = await prisma.usuarios.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends usuariosDeleteManyArgs>(args?: SelectSubset<T, usuariosDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Usuarios.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {usuariosUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Usuarios
     * const usuarios = await prisma.usuarios.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends usuariosUpdateManyArgs>(args: SelectSubset<T, usuariosUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Usuarios.
     * @param {usuariosUpsertArgs} args - Arguments to update or create a Usuarios.
     * @example
     * // Update or create a Usuarios
     * const usuarios = await prisma.usuarios.upsert({
     *   create: {
     *     // ... data to create a Usuarios
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Usuarios we want to update
     *   }
     * })
     */
    upsert<T extends usuariosUpsertArgs>(args: SelectSubset<T, usuariosUpsertArgs<ExtArgs>>): Prisma__usuariosClient<$Result.GetResult<Prisma.$usuariosPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Usuarios.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {usuariosCountArgs} args - Arguments to filter Usuarios to count.
     * @example
     * // Count the number of Usuarios
     * const count = await prisma.usuarios.count({
     *   where: {
     *     // ... the filter for the Usuarios we want to count
     *   }
     * })
    **/
    count<T extends usuariosCountArgs>(
      args?: Subset<T, usuariosCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UsuariosCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Usuarios.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsuariosAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UsuariosAggregateArgs>(args: Subset<T, UsuariosAggregateArgs>): Prisma.PrismaPromise<GetUsuariosAggregateType<T>>

    /**
     * Group by Usuarios.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {usuariosGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends usuariosGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: usuariosGroupByArgs['orderBy'] }
        : { orderBy?: usuariosGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, usuariosGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUsuariosGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the usuarios model
   */
  readonly fields: usuariosFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for usuarios.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__usuariosClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    cuentascompletas<T extends usuarios$cuentascompletasArgs<ExtArgs> = {}>(args?: Subset<T, usuarios$cuentascompletasArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$cuentascompletasPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    pantallas<T extends usuarios$pantallasArgs<ExtArgs> = {}>(args?: Subset<T, usuarios$pantallasArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$pantallasPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the usuarios model
   */
  interface usuariosFieldRefs {
    readonly contacto: FieldRef<"usuarios", 'String'>
    readonly nombre: FieldRef<"usuarios", 'String'>
  }
    

  // Custom InputTypes
  /**
   * usuarios findUnique
   */
  export type usuariosFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the usuarios
     */
    select?: usuariosSelect<ExtArgs> | null
    /**
     * Omit specific fields from the usuarios
     */
    omit?: usuariosOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: usuariosInclude<ExtArgs> | null
    /**
     * Filter, which usuarios to fetch.
     */
    where: usuariosWhereUniqueInput
  }

  /**
   * usuarios findUniqueOrThrow
   */
  export type usuariosFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the usuarios
     */
    select?: usuariosSelect<ExtArgs> | null
    /**
     * Omit specific fields from the usuarios
     */
    omit?: usuariosOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: usuariosInclude<ExtArgs> | null
    /**
     * Filter, which usuarios to fetch.
     */
    where: usuariosWhereUniqueInput
  }

  /**
   * usuarios findFirst
   */
  export type usuariosFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the usuarios
     */
    select?: usuariosSelect<ExtArgs> | null
    /**
     * Omit specific fields from the usuarios
     */
    omit?: usuariosOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: usuariosInclude<ExtArgs> | null
    /**
     * Filter, which usuarios to fetch.
     */
    where?: usuariosWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of usuarios to fetch.
     */
    orderBy?: usuariosOrderByWithRelationInput | usuariosOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for usuarios.
     */
    cursor?: usuariosWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` usuarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` usuarios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of usuarios.
     */
    distinct?: UsuariosScalarFieldEnum | UsuariosScalarFieldEnum[]
  }

  /**
   * usuarios findFirstOrThrow
   */
  export type usuariosFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the usuarios
     */
    select?: usuariosSelect<ExtArgs> | null
    /**
     * Omit specific fields from the usuarios
     */
    omit?: usuariosOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: usuariosInclude<ExtArgs> | null
    /**
     * Filter, which usuarios to fetch.
     */
    where?: usuariosWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of usuarios to fetch.
     */
    orderBy?: usuariosOrderByWithRelationInput | usuariosOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for usuarios.
     */
    cursor?: usuariosWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` usuarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` usuarios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of usuarios.
     */
    distinct?: UsuariosScalarFieldEnum | UsuariosScalarFieldEnum[]
  }

  /**
   * usuarios findMany
   */
  export type usuariosFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the usuarios
     */
    select?: usuariosSelect<ExtArgs> | null
    /**
     * Omit specific fields from the usuarios
     */
    omit?: usuariosOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: usuariosInclude<ExtArgs> | null
    /**
     * Filter, which usuarios to fetch.
     */
    where?: usuariosWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of usuarios to fetch.
     */
    orderBy?: usuariosOrderByWithRelationInput | usuariosOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing usuarios.
     */
    cursor?: usuariosWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` usuarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` usuarios.
     */
    skip?: number
    distinct?: UsuariosScalarFieldEnum | UsuariosScalarFieldEnum[]
  }

  /**
   * usuarios create
   */
  export type usuariosCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the usuarios
     */
    select?: usuariosSelect<ExtArgs> | null
    /**
     * Omit specific fields from the usuarios
     */
    omit?: usuariosOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: usuariosInclude<ExtArgs> | null
    /**
     * The data needed to create a usuarios.
     */
    data: XOR<usuariosCreateInput, usuariosUncheckedCreateInput>
  }

  /**
   * usuarios createMany
   */
  export type usuariosCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many usuarios.
     */
    data: usuariosCreateManyInput | usuariosCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * usuarios update
   */
  export type usuariosUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the usuarios
     */
    select?: usuariosSelect<ExtArgs> | null
    /**
     * Omit specific fields from the usuarios
     */
    omit?: usuariosOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: usuariosInclude<ExtArgs> | null
    /**
     * The data needed to update a usuarios.
     */
    data: XOR<usuariosUpdateInput, usuariosUncheckedUpdateInput>
    /**
     * Choose, which usuarios to update.
     */
    where: usuariosWhereUniqueInput
  }

  /**
   * usuarios updateMany
   */
  export type usuariosUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update usuarios.
     */
    data: XOR<usuariosUpdateManyMutationInput, usuariosUncheckedUpdateManyInput>
    /**
     * Filter which usuarios to update
     */
    where?: usuariosWhereInput
    /**
     * Limit how many usuarios to update.
     */
    limit?: number
  }

  /**
   * usuarios upsert
   */
  export type usuariosUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the usuarios
     */
    select?: usuariosSelect<ExtArgs> | null
    /**
     * Omit specific fields from the usuarios
     */
    omit?: usuariosOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: usuariosInclude<ExtArgs> | null
    /**
     * The filter to search for the usuarios to update in case it exists.
     */
    where: usuariosWhereUniqueInput
    /**
     * In case the usuarios found by the `where` argument doesn't exist, create a new usuarios with this data.
     */
    create: XOR<usuariosCreateInput, usuariosUncheckedCreateInput>
    /**
     * In case the usuarios was found with the provided `where` argument, update it with this data.
     */
    update: XOR<usuariosUpdateInput, usuariosUncheckedUpdateInput>
  }

  /**
   * usuarios delete
   */
  export type usuariosDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the usuarios
     */
    select?: usuariosSelect<ExtArgs> | null
    /**
     * Omit specific fields from the usuarios
     */
    omit?: usuariosOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: usuariosInclude<ExtArgs> | null
    /**
     * Filter which usuarios to delete.
     */
    where: usuariosWhereUniqueInput
  }

  /**
   * usuarios deleteMany
   */
  export type usuariosDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which usuarios to delete
     */
    where?: usuariosWhereInput
    /**
     * Limit how many usuarios to delete.
     */
    limit?: number
  }

  /**
   * usuarios.cuentascompletas
   */
  export type usuarios$cuentascompletasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the cuentascompletas
     */
    select?: cuentascompletasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the cuentascompletas
     */
    omit?: cuentascompletasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: cuentascompletasInclude<ExtArgs> | null
    where?: cuentascompletasWhereInput
    orderBy?: cuentascompletasOrderByWithRelationInput | cuentascompletasOrderByWithRelationInput[]
    cursor?: cuentascompletasWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CuentascompletasScalarFieldEnum | CuentascompletasScalarFieldEnum[]
  }

  /**
   * usuarios.pantallas
   */
  export type usuarios$pantallasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the pantallas
     */
    select?: pantallasSelect<ExtArgs> | null
    /**
     * Omit specific fields from the pantallas
     */
    omit?: pantallasOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: pantallasInclude<ExtArgs> | null
    where?: pantallasWhereInput
    orderBy?: pantallasOrderByWithRelationInput | pantallasOrderByWithRelationInput[]
    cursor?: pantallasWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PantallasScalarFieldEnum | PantallasScalarFieldEnum[]
  }

  /**
   * usuarios without action
   */
  export type usuariosDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the usuarios
     */
    select?: usuariosSelect<ExtArgs> | null
    /**
     * Omit specific fields from the usuarios
     */
    omit?: usuariosOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: usuariosInclude<ExtArgs> | null
  }


  /**
   * Model wa_notificaciones
   */

  export type AggregateWa_notificaciones = {
    _count: Wa_notificacionesCountAggregateOutputType | null
    _avg: Wa_notificacionesAvgAggregateOutputType | null
    _sum: Wa_notificacionesSumAggregateOutputType | null
    _min: Wa_notificacionesMinAggregateOutputType | null
    _max: Wa_notificacionesMaxAggregateOutputType | null
  }

  export type Wa_notificacionesAvgAggregateOutputType = {
    id: number | null
  }

  export type Wa_notificacionesSumAggregateOutputType = {
    id: bigint | null
  }

  export type Wa_notificacionesMinAggregateOutputType = {
    id: bigint | null
    phone: string | null
    fecha: Date | null
    createdAt: Date | null
  }

  export type Wa_notificacionesMaxAggregateOutputType = {
    id: bigint | null
    phone: string | null
    fecha: Date | null
    createdAt: Date | null
  }

  export type Wa_notificacionesCountAggregateOutputType = {
    id: number
    phone: number
    fecha: number
    createdAt: number
    _all: number
  }


  export type Wa_notificacionesAvgAggregateInputType = {
    id?: true
  }

  export type Wa_notificacionesSumAggregateInputType = {
    id?: true
  }

  export type Wa_notificacionesMinAggregateInputType = {
    id?: true
    phone?: true
    fecha?: true
    createdAt?: true
  }

  export type Wa_notificacionesMaxAggregateInputType = {
    id?: true
    phone?: true
    fecha?: true
    createdAt?: true
  }

  export type Wa_notificacionesCountAggregateInputType = {
    id?: true
    phone?: true
    fecha?: true
    createdAt?: true
    _all?: true
  }

  export type Wa_notificacionesAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which wa_notificaciones to aggregate.
     */
    where?: wa_notificacionesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of wa_notificaciones to fetch.
     */
    orderBy?: wa_notificacionesOrderByWithRelationInput | wa_notificacionesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: wa_notificacionesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` wa_notificaciones from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` wa_notificaciones.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned wa_notificaciones
    **/
    _count?: true | Wa_notificacionesCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: Wa_notificacionesAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: Wa_notificacionesSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Wa_notificacionesMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Wa_notificacionesMaxAggregateInputType
  }

  export type GetWa_notificacionesAggregateType<T extends Wa_notificacionesAggregateArgs> = {
        [P in keyof T & keyof AggregateWa_notificaciones]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateWa_notificaciones[P]>
      : GetScalarType<T[P], AggregateWa_notificaciones[P]>
  }




  export type wa_notificacionesGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: wa_notificacionesWhereInput
    orderBy?: wa_notificacionesOrderByWithAggregationInput | wa_notificacionesOrderByWithAggregationInput[]
    by: Wa_notificacionesScalarFieldEnum[] | Wa_notificacionesScalarFieldEnum
    having?: wa_notificacionesScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Wa_notificacionesCountAggregateInputType | true
    _avg?: Wa_notificacionesAvgAggregateInputType
    _sum?: Wa_notificacionesSumAggregateInputType
    _min?: Wa_notificacionesMinAggregateInputType
    _max?: Wa_notificacionesMaxAggregateInputType
  }

  export type Wa_notificacionesGroupByOutputType = {
    id: bigint
    phone: string
    fecha: Date
    createdAt: Date
    _count: Wa_notificacionesCountAggregateOutputType | null
    _avg: Wa_notificacionesAvgAggregateOutputType | null
    _sum: Wa_notificacionesSumAggregateOutputType | null
    _min: Wa_notificacionesMinAggregateOutputType | null
    _max: Wa_notificacionesMaxAggregateOutputType | null
  }

  type GetWa_notificacionesGroupByPayload<T extends wa_notificacionesGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Wa_notificacionesGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Wa_notificacionesGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Wa_notificacionesGroupByOutputType[P]>
            : GetScalarType<T[P], Wa_notificacionesGroupByOutputType[P]>
        }
      >
    >


  export type wa_notificacionesSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    phone?: boolean
    fecha?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["wa_notificaciones"]>



  export type wa_notificacionesSelectScalar = {
    id?: boolean
    phone?: boolean
    fecha?: boolean
    createdAt?: boolean
  }

  export type wa_notificacionesOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "phone" | "fecha" | "createdAt", ExtArgs["result"]["wa_notificaciones"]>

  export type $wa_notificacionesPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "wa_notificaciones"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      phone: string
      fecha: Date
      createdAt: Date
    }, ExtArgs["result"]["wa_notificaciones"]>
    composites: {}
  }

  type wa_notificacionesGetPayload<S extends boolean | null | undefined | wa_notificacionesDefaultArgs> = $Result.GetResult<Prisma.$wa_notificacionesPayload, S>

  type wa_notificacionesCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<wa_notificacionesFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: Wa_notificacionesCountAggregateInputType | true
    }

  export interface wa_notificacionesDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['wa_notificaciones'], meta: { name: 'wa_notificaciones' } }
    /**
     * Find zero or one Wa_notificaciones that matches the filter.
     * @param {wa_notificacionesFindUniqueArgs} args - Arguments to find a Wa_notificaciones
     * @example
     * // Get one Wa_notificaciones
     * const wa_notificaciones = await prisma.wa_notificaciones.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends wa_notificacionesFindUniqueArgs>(args: SelectSubset<T, wa_notificacionesFindUniqueArgs<ExtArgs>>): Prisma__wa_notificacionesClient<$Result.GetResult<Prisma.$wa_notificacionesPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Wa_notificaciones that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {wa_notificacionesFindUniqueOrThrowArgs} args - Arguments to find a Wa_notificaciones
     * @example
     * // Get one Wa_notificaciones
     * const wa_notificaciones = await prisma.wa_notificaciones.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends wa_notificacionesFindUniqueOrThrowArgs>(args: SelectSubset<T, wa_notificacionesFindUniqueOrThrowArgs<ExtArgs>>): Prisma__wa_notificacionesClient<$Result.GetResult<Prisma.$wa_notificacionesPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Wa_notificaciones that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {wa_notificacionesFindFirstArgs} args - Arguments to find a Wa_notificaciones
     * @example
     * // Get one Wa_notificaciones
     * const wa_notificaciones = await prisma.wa_notificaciones.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends wa_notificacionesFindFirstArgs>(args?: SelectSubset<T, wa_notificacionesFindFirstArgs<ExtArgs>>): Prisma__wa_notificacionesClient<$Result.GetResult<Prisma.$wa_notificacionesPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Wa_notificaciones that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {wa_notificacionesFindFirstOrThrowArgs} args - Arguments to find a Wa_notificaciones
     * @example
     * // Get one Wa_notificaciones
     * const wa_notificaciones = await prisma.wa_notificaciones.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends wa_notificacionesFindFirstOrThrowArgs>(args?: SelectSubset<T, wa_notificacionesFindFirstOrThrowArgs<ExtArgs>>): Prisma__wa_notificacionesClient<$Result.GetResult<Prisma.$wa_notificacionesPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Wa_notificaciones that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {wa_notificacionesFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Wa_notificaciones
     * const wa_notificaciones = await prisma.wa_notificaciones.findMany()
     * 
     * // Get first 10 Wa_notificaciones
     * const wa_notificaciones = await prisma.wa_notificaciones.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const wa_notificacionesWithIdOnly = await prisma.wa_notificaciones.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends wa_notificacionesFindManyArgs>(args?: SelectSubset<T, wa_notificacionesFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$wa_notificacionesPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Wa_notificaciones.
     * @param {wa_notificacionesCreateArgs} args - Arguments to create a Wa_notificaciones.
     * @example
     * // Create one Wa_notificaciones
     * const Wa_notificaciones = await prisma.wa_notificaciones.create({
     *   data: {
     *     // ... data to create a Wa_notificaciones
     *   }
     * })
     * 
     */
    create<T extends wa_notificacionesCreateArgs>(args: SelectSubset<T, wa_notificacionesCreateArgs<ExtArgs>>): Prisma__wa_notificacionesClient<$Result.GetResult<Prisma.$wa_notificacionesPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Wa_notificaciones.
     * @param {wa_notificacionesCreateManyArgs} args - Arguments to create many Wa_notificaciones.
     * @example
     * // Create many Wa_notificaciones
     * const wa_notificaciones = await prisma.wa_notificaciones.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends wa_notificacionesCreateManyArgs>(args?: SelectSubset<T, wa_notificacionesCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Wa_notificaciones.
     * @param {wa_notificacionesDeleteArgs} args - Arguments to delete one Wa_notificaciones.
     * @example
     * // Delete one Wa_notificaciones
     * const Wa_notificaciones = await prisma.wa_notificaciones.delete({
     *   where: {
     *     // ... filter to delete one Wa_notificaciones
     *   }
     * })
     * 
     */
    delete<T extends wa_notificacionesDeleteArgs>(args: SelectSubset<T, wa_notificacionesDeleteArgs<ExtArgs>>): Prisma__wa_notificacionesClient<$Result.GetResult<Prisma.$wa_notificacionesPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Wa_notificaciones.
     * @param {wa_notificacionesUpdateArgs} args - Arguments to update one Wa_notificaciones.
     * @example
     * // Update one Wa_notificaciones
     * const wa_notificaciones = await prisma.wa_notificaciones.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends wa_notificacionesUpdateArgs>(args: SelectSubset<T, wa_notificacionesUpdateArgs<ExtArgs>>): Prisma__wa_notificacionesClient<$Result.GetResult<Prisma.$wa_notificacionesPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Wa_notificaciones.
     * @param {wa_notificacionesDeleteManyArgs} args - Arguments to filter Wa_notificaciones to delete.
     * @example
     * // Delete a few Wa_notificaciones
     * const { count } = await prisma.wa_notificaciones.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends wa_notificacionesDeleteManyArgs>(args?: SelectSubset<T, wa_notificacionesDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Wa_notificaciones.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {wa_notificacionesUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Wa_notificaciones
     * const wa_notificaciones = await prisma.wa_notificaciones.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends wa_notificacionesUpdateManyArgs>(args: SelectSubset<T, wa_notificacionesUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Wa_notificaciones.
     * @param {wa_notificacionesUpsertArgs} args - Arguments to update or create a Wa_notificaciones.
     * @example
     * // Update or create a Wa_notificaciones
     * const wa_notificaciones = await prisma.wa_notificaciones.upsert({
     *   create: {
     *     // ... data to create a Wa_notificaciones
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Wa_notificaciones we want to update
     *   }
     * })
     */
    upsert<T extends wa_notificacionesUpsertArgs>(args: SelectSubset<T, wa_notificacionesUpsertArgs<ExtArgs>>): Prisma__wa_notificacionesClient<$Result.GetResult<Prisma.$wa_notificacionesPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Wa_notificaciones.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {wa_notificacionesCountArgs} args - Arguments to filter Wa_notificaciones to count.
     * @example
     * // Count the number of Wa_notificaciones
     * const count = await prisma.wa_notificaciones.count({
     *   where: {
     *     // ... the filter for the Wa_notificaciones we want to count
     *   }
     * })
    **/
    count<T extends wa_notificacionesCountArgs>(
      args?: Subset<T, wa_notificacionesCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Wa_notificacionesCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Wa_notificaciones.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Wa_notificacionesAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Wa_notificacionesAggregateArgs>(args: Subset<T, Wa_notificacionesAggregateArgs>): Prisma.PrismaPromise<GetWa_notificacionesAggregateType<T>>

    /**
     * Group by Wa_notificaciones.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {wa_notificacionesGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends wa_notificacionesGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: wa_notificacionesGroupByArgs['orderBy'] }
        : { orderBy?: wa_notificacionesGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, wa_notificacionesGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetWa_notificacionesGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the wa_notificaciones model
   */
  readonly fields: wa_notificacionesFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for wa_notificaciones.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__wa_notificacionesClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the wa_notificaciones model
   */
  interface wa_notificacionesFieldRefs {
    readonly id: FieldRef<"wa_notificaciones", 'BigInt'>
    readonly phone: FieldRef<"wa_notificaciones", 'String'>
    readonly fecha: FieldRef<"wa_notificaciones", 'DateTime'>
    readonly createdAt: FieldRef<"wa_notificaciones", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * wa_notificaciones findUnique
   */
  export type wa_notificacionesFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the wa_notificaciones
     */
    select?: wa_notificacionesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the wa_notificaciones
     */
    omit?: wa_notificacionesOmit<ExtArgs> | null
    /**
     * Filter, which wa_notificaciones to fetch.
     */
    where: wa_notificacionesWhereUniqueInput
  }

  /**
   * wa_notificaciones findUniqueOrThrow
   */
  export type wa_notificacionesFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the wa_notificaciones
     */
    select?: wa_notificacionesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the wa_notificaciones
     */
    omit?: wa_notificacionesOmit<ExtArgs> | null
    /**
     * Filter, which wa_notificaciones to fetch.
     */
    where: wa_notificacionesWhereUniqueInput
  }

  /**
   * wa_notificaciones findFirst
   */
  export type wa_notificacionesFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the wa_notificaciones
     */
    select?: wa_notificacionesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the wa_notificaciones
     */
    omit?: wa_notificacionesOmit<ExtArgs> | null
    /**
     * Filter, which wa_notificaciones to fetch.
     */
    where?: wa_notificacionesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of wa_notificaciones to fetch.
     */
    orderBy?: wa_notificacionesOrderByWithRelationInput | wa_notificacionesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for wa_notificaciones.
     */
    cursor?: wa_notificacionesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` wa_notificaciones from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` wa_notificaciones.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of wa_notificaciones.
     */
    distinct?: Wa_notificacionesScalarFieldEnum | Wa_notificacionesScalarFieldEnum[]
  }

  /**
   * wa_notificaciones findFirstOrThrow
   */
  export type wa_notificacionesFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the wa_notificaciones
     */
    select?: wa_notificacionesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the wa_notificaciones
     */
    omit?: wa_notificacionesOmit<ExtArgs> | null
    /**
     * Filter, which wa_notificaciones to fetch.
     */
    where?: wa_notificacionesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of wa_notificaciones to fetch.
     */
    orderBy?: wa_notificacionesOrderByWithRelationInput | wa_notificacionesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for wa_notificaciones.
     */
    cursor?: wa_notificacionesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` wa_notificaciones from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` wa_notificaciones.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of wa_notificaciones.
     */
    distinct?: Wa_notificacionesScalarFieldEnum | Wa_notificacionesScalarFieldEnum[]
  }

  /**
   * wa_notificaciones findMany
   */
  export type wa_notificacionesFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the wa_notificaciones
     */
    select?: wa_notificacionesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the wa_notificaciones
     */
    omit?: wa_notificacionesOmit<ExtArgs> | null
    /**
     * Filter, which wa_notificaciones to fetch.
     */
    where?: wa_notificacionesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of wa_notificaciones to fetch.
     */
    orderBy?: wa_notificacionesOrderByWithRelationInput | wa_notificacionesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing wa_notificaciones.
     */
    cursor?: wa_notificacionesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` wa_notificaciones from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` wa_notificaciones.
     */
    skip?: number
    distinct?: Wa_notificacionesScalarFieldEnum | Wa_notificacionesScalarFieldEnum[]
  }

  /**
   * wa_notificaciones create
   */
  export type wa_notificacionesCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the wa_notificaciones
     */
    select?: wa_notificacionesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the wa_notificaciones
     */
    omit?: wa_notificacionesOmit<ExtArgs> | null
    /**
     * The data needed to create a wa_notificaciones.
     */
    data: XOR<wa_notificacionesCreateInput, wa_notificacionesUncheckedCreateInput>
  }

  /**
   * wa_notificaciones createMany
   */
  export type wa_notificacionesCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many wa_notificaciones.
     */
    data: wa_notificacionesCreateManyInput | wa_notificacionesCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * wa_notificaciones update
   */
  export type wa_notificacionesUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the wa_notificaciones
     */
    select?: wa_notificacionesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the wa_notificaciones
     */
    omit?: wa_notificacionesOmit<ExtArgs> | null
    /**
     * The data needed to update a wa_notificaciones.
     */
    data: XOR<wa_notificacionesUpdateInput, wa_notificacionesUncheckedUpdateInput>
    /**
     * Choose, which wa_notificaciones to update.
     */
    where: wa_notificacionesWhereUniqueInput
  }

  /**
   * wa_notificaciones updateMany
   */
  export type wa_notificacionesUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update wa_notificaciones.
     */
    data: XOR<wa_notificacionesUpdateManyMutationInput, wa_notificacionesUncheckedUpdateManyInput>
    /**
     * Filter which wa_notificaciones to update
     */
    where?: wa_notificacionesWhereInput
    /**
     * Limit how many wa_notificaciones to update.
     */
    limit?: number
  }

  /**
   * wa_notificaciones upsert
   */
  export type wa_notificacionesUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the wa_notificaciones
     */
    select?: wa_notificacionesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the wa_notificaciones
     */
    omit?: wa_notificacionesOmit<ExtArgs> | null
    /**
     * The filter to search for the wa_notificaciones to update in case it exists.
     */
    where: wa_notificacionesWhereUniqueInput
    /**
     * In case the wa_notificaciones found by the `where` argument doesn't exist, create a new wa_notificaciones with this data.
     */
    create: XOR<wa_notificacionesCreateInput, wa_notificacionesUncheckedCreateInput>
    /**
     * In case the wa_notificaciones was found with the provided `where` argument, update it with this data.
     */
    update: XOR<wa_notificacionesUpdateInput, wa_notificacionesUncheckedUpdateInput>
  }

  /**
   * wa_notificaciones delete
   */
  export type wa_notificacionesDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the wa_notificaciones
     */
    select?: wa_notificacionesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the wa_notificaciones
     */
    omit?: wa_notificacionesOmit<ExtArgs> | null
    /**
     * Filter which wa_notificaciones to delete.
     */
    where: wa_notificacionesWhereUniqueInput
  }

  /**
   * wa_notificaciones deleteMany
   */
  export type wa_notificacionesDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which wa_notificaciones to delete
     */
    where?: wa_notificacionesWhereInput
    /**
     * Limit how many wa_notificaciones to delete.
     */
    limit?: number
  }

  /**
   * wa_notificaciones without action
   */
  export type wa_notificacionesDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the wa_notificaciones
     */
    select?: wa_notificacionesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the wa_notificaciones
     */
    omit?: wa_notificacionesOmit<ExtArgs> | null
  }


  /**
   * Model wa_logs
   */

  export type AggregateWa_logs = {
    _count: Wa_logsCountAggregateOutputType | null
    _avg: Wa_logsAvgAggregateOutputType | null
    _sum: Wa_logsSumAggregateOutputType | null
    _min: Wa_logsMinAggregateOutputType | null
    _max: Wa_logsMaxAggregateOutputType | null
  }

  export type Wa_logsAvgAggregateOutputType = {
    id: number | null
  }

  export type Wa_logsSumAggregateOutputType = {
    id: bigint | null
  }

  export type Wa_logsMinAggregateOutputType = {
    id: bigint | null
    phone: string | null
    status: $Enums.LogStatus | null
    message: string | null
    createdAt: Date | null
  }

  export type Wa_logsMaxAggregateOutputType = {
    id: bigint | null
    phone: string | null
    status: $Enums.LogStatus | null
    message: string | null
    createdAt: Date | null
  }

  export type Wa_logsCountAggregateOutputType = {
    id: number
    phone: number
    status: number
    message: number
    createdAt: number
    _all: number
  }


  export type Wa_logsAvgAggregateInputType = {
    id?: true
  }

  export type Wa_logsSumAggregateInputType = {
    id?: true
  }

  export type Wa_logsMinAggregateInputType = {
    id?: true
    phone?: true
    status?: true
    message?: true
    createdAt?: true
  }

  export type Wa_logsMaxAggregateInputType = {
    id?: true
    phone?: true
    status?: true
    message?: true
    createdAt?: true
  }

  export type Wa_logsCountAggregateInputType = {
    id?: true
    phone?: true
    status?: true
    message?: true
    createdAt?: true
    _all?: true
  }

  export type Wa_logsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which wa_logs to aggregate.
     */
    where?: wa_logsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of wa_logs to fetch.
     */
    orderBy?: wa_logsOrderByWithRelationInput | wa_logsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: wa_logsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` wa_logs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` wa_logs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned wa_logs
    **/
    _count?: true | Wa_logsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: Wa_logsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: Wa_logsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Wa_logsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Wa_logsMaxAggregateInputType
  }

  export type GetWa_logsAggregateType<T extends Wa_logsAggregateArgs> = {
        [P in keyof T & keyof AggregateWa_logs]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateWa_logs[P]>
      : GetScalarType<T[P], AggregateWa_logs[P]>
  }




  export type wa_logsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: wa_logsWhereInput
    orderBy?: wa_logsOrderByWithAggregationInput | wa_logsOrderByWithAggregationInput[]
    by: Wa_logsScalarFieldEnum[] | Wa_logsScalarFieldEnum
    having?: wa_logsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Wa_logsCountAggregateInputType | true
    _avg?: Wa_logsAvgAggregateInputType
    _sum?: Wa_logsSumAggregateInputType
    _min?: Wa_logsMinAggregateInputType
    _max?: Wa_logsMaxAggregateInputType
  }

  export type Wa_logsGroupByOutputType = {
    id: bigint
    phone: string
    status: $Enums.LogStatus
    message: string | null
    createdAt: Date
    _count: Wa_logsCountAggregateOutputType | null
    _avg: Wa_logsAvgAggregateOutputType | null
    _sum: Wa_logsSumAggregateOutputType | null
    _min: Wa_logsMinAggregateOutputType | null
    _max: Wa_logsMaxAggregateOutputType | null
  }

  type GetWa_logsGroupByPayload<T extends wa_logsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Wa_logsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Wa_logsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Wa_logsGroupByOutputType[P]>
            : GetScalarType<T[P], Wa_logsGroupByOutputType[P]>
        }
      >
    >


  export type wa_logsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    phone?: boolean
    status?: boolean
    message?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["wa_logs"]>



  export type wa_logsSelectScalar = {
    id?: boolean
    phone?: boolean
    status?: boolean
    message?: boolean
    createdAt?: boolean
  }

  export type wa_logsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "phone" | "status" | "message" | "createdAt", ExtArgs["result"]["wa_logs"]>

  export type $wa_logsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "wa_logs"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      phone: string
      status: $Enums.LogStatus
      message: string | null
      createdAt: Date
    }, ExtArgs["result"]["wa_logs"]>
    composites: {}
  }

  type wa_logsGetPayload<S extends boolean | null | undefined | wa_logsDefaultArgs> = $Result.GetResult<Prisma.$wa_logsPayload, S>

  type wa_logsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<wa_logsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: Wa_logsCountAggregateInputType | true
    }

  export interface wa_logsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['wa_logs'], meta: { name: 'wa_logs' } }
    /**
     * Find zero or one Wa_logs that matches the filter.
     * @param {wa_logsFindUniqueArgs} args - Arguments to find a Wa_logs
     * @example
     * // Get one Wa_logs
     * const wa_logs = await prisma.wa_logs.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends wa_logsFindUniqueArgs>(args: SelectSubset<T, wa_logsFindUniqueArgs<ExtArgs>>): Prisma__wa_logsClient<$Result.GetResult<Prisma.$wa_logsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Wa_logs that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {wa_logsFindUniqueOrThrowArgs} args - Arguments to find a Wa_logs
     * @example
     * // Get one Wa_logs
     * const wa_logs = await prisma.wa_logs.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends wa_logsFindUniqueOrThrowArgs>(args: SelectSubset<T, wa_logsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__wa_logsClient<$Result.GetResult<Prisma.$wa_logsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Wa_logs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {wa_logsFindFirstArgs} args - Arguments to find a Wa_logs
     * @example
     * // Get one Wa_logs
     * const wa_logs = await prisma.wa_logs.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends wa_logsFindFirstArgs>(args?: SelectSubset<T, wa_logsFindFirstArgs<ExtArgs>>): Prisma__wa_logsClient<$Result.GetResult<Prisma.$wa_logsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Wa_logs that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {wa_logsFindFirstOrThrowArgs} args - Arguments to find a Wa_logs
     * @example
     * // Get one Wa_logs
     * const wa_logs = await prisma.wa_logs.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends wa_logsFindFirstOrThrowArgs>(args?: SelectSubset<T, wa_logsFindFirstOrThrowArgs<ExtArgs>>): Prisma__wa_logsClient<$Result.GetResult<Prisma.$wa_logsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Wa_logs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {wa_logsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Wa_logs
     * const wa_logs = await prisma.wa_logs.findMany()
     * 
     * // Get first 10 Wa_logs
     * const wa_logs = await prisma.wa_logs.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const wa_logsWithIdOnly = await prisma.wa_logs.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends wa_logsFindManyArgs>(args?: SelectSubset<T, wa_logsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$wa_logsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Wa_logs.
     * @param {wa_logsCreateArgs} args - Arguments to create a Wa_logs.
     * @example
     * // Create one Wa_logs
     * const Wa_logs = await prisma.wa_logs.create({
     *   data: {
     *     // ... data to create a Wa_logs
     *   }
     * })
     * 
     */
    create<T extends wa_logsCreateArgs>(args: SelectSubset<T, wa_logsCreateArgs<ExtArgs>>): Prisma__wa_logsClient<$Result.GetResult<Prisma.$wa_logsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Wa_logs.
     * @param {wa_logsCreateManyArgs} args - Arguments to create many Wa_logs.
     * @example
     * // Create many Wa_logs
     * const wa_logs = await prisma.wa_logs.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends wa_logsCreateManyArgs>(args?: SelectSubset<T, wa_logsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Wa_logs.
     * @param {wa_logsDeleteArgs} args - Arguments to delete one Wa_logs.
     * @example
     * // Delete one Wa_logs
     * const Wa_logs = await prisma.wa_logs.delete({
     *   where: {
     *     // ... filter to delete one Wa_logs
     *   }
     * })
     * 
     */
    delete<T extends wa_logsDeleteArgs>(args: SelectSubset<T, wa_logsDeleteArgs<ExtArgs>>): Prisma__wa_logsClient<$Result.GetResult<Prisma.$wa_logsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Wa_logs.
     * @param {wa_logsUpdateArgs} args - Arguments to update one Wa_logs.
     * @example
     * // Update one Wa_logs
     * const wa_logs = await prisma.wa_logs.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends wa_logsUpdateArgs>(args: SelectSubset<T, wa_logsUpdateArgs<ExtArgs>>): Prisma__wa_logsClient<$Result.GetResult<Prisma.$wa_logsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Wa_logs.
     * @param {wa_logsDeleteManyArgs} args - Arguments to filter Wa_logs to delete.
     * @example
     * // Delete a few Wa_logs
     * const { count } = await prisma.wa_logs.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends wa_logsDeleteManyArgs>(args?: SelectSubset<T, wa_logsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Wa_logs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {wa_logsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Wa_logs
     * const wa_logs = await prisma.wa_logs.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends wa_logsUpdateManyArgs>(args: SelectSubset<T, wa_logsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Wa_logs.
     * @param {wa_logsUpsertArgs} args - Arguments to update or create a Wa_logs.
     * @example
     * // Update or create a Wa_logs
     * const wa_logs = await prisma.wa_logs.upsert({
     *   create: {
     *     // ... data to create a Wa_logs
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Wa_logs we want to update
     *   }
     * })
     */
    upsert<T extends wa_logsUpsertArgs>(args: SelectSubset<T, wa_logsUpsertArgs<ExtArgs>>): Prisma__wa_logsClient<$Result.GetResult<Prisma.$wa_logsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Wa_logs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {wa_logsCountArgs} args - Arguments to filter Wa_logs to count.
     * @example
     * // Count the number of Wa_logs
     * const count = await prisma.wa_logs.count({
     *   where: {
     *     // ... the filter for the Wa_logs we want to count
     *   }
     * })
    **/
    count<T extends wa_logsCountArgs>(
      args?: Subset<T, wa_logsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Wa_logsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Wa_logs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Wa_logsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Wa_logsAggregateArgs>(args: Subset<T, Wa_logsAggregateArgs>): Prisma.PrismaPromise<GetWa_logsAggregateType<T>>

    /**
     * Group by Wa_logs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {wa_logsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends wa_logsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: wa_logsGroupByArgs['orderBy'] }
        : { orderBy?: wa_logsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, wa_logsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetWa_logsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the wa_logs model
   */
  readonly fields: wa_logsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for wa_logs.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__wa_logsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the wa_logs model
   */
  interface wa_logsFieldRefs {
    readonly id: FieldRef<"wa_logs", 'BigInt'>
    readonly phone: FieldRef<"wa_logs", 'String'>
    readonly status: FieldRef<"wa_logs", 'LogStatus'>
    readonly message: FieldRef<"wa_logs", 'String'>
    readonly createdAt: FieldRef<"wa_logs", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * wa_logs findUnique
   */
  export type wa_logsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the wa_logs
     */
    select?: wa_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the wa_logs
     */
    omit?: wa_logsOmit<ExtArgs> | null
    /**
     * Filter, which wa_logs to fetch.
     */
    where: wa_logsWhereUniqueInput
  }

  /**
   * wa_logs findUniqueOrThrow
   */
  export type wa_logsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the wa_logs
     */
    select?: wa_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the wa_logs
     */
    omit?: wa_logsOmit<ExtArgs> | null
    /**
     * Filter, which wa_logs to fetch.
     */
    where: wa_logsWhereUniqueInput
  }

  /**
   * wa_logs findFirst
   */
  export type wa_logsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the wa_logs
     */
    select?: wa_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the wa_logs
     */
    omit?: wa_logsOmit<ExtArgs> | null
    /**
     * Filter, which wa_logs to fetch.
     */
    where?: wa_logsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of wa_logs to fetch.
     */
    orderBy?: wa_logsOrderByWithRelationInput | wa_logsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for wa_logs.
     */
    cursor?: wa_logsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` wa_logs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` wa_logs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of wa_logs.
     */
    distinct?: Wa_logsScalarFieldEnum | Wa_logsScalarFieldEnum[]
  }

  /**
   * wa_logs findFirstOrThrow
   */
  export type wa_logsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the wa_logs
     */
    select?: wa_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the wa_logs
     */
    omit?: wa_logsOmit<ExtArgs> | null
    /**
     * Filter, which wa_logs to fetch.
     */
    where?: wa_logsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of wa_logs to fetch.
     */
    orderBy?: wa_logsOrderByWithRelationInput | wa_logsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for wa_logs.
     */
    cursor?: wa_logsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` wa_logs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` wa_logs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of wa_logs.
     */
    distinct?: Wa_logsScalarFieldEnum | Wa_logsScalarFieldEnum[]
  }

  /**
   * wa_logs findMany
   */
  export type wa_logsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the wa_logs
     */
    select?: wa_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the wa_logs
     */
    omit?: wa_logsOmit<ExtArgs> | null
    /**
     * Filter, which wa_logs to fetch.
     */
    where?: wa_logsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of wa_logs to fetch.
     */
    orderBy?: wa_logsOrderByWithRelationInput | wa_logsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing wa_logs.
     */
    cursor?: wa_logsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` wa_logs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` wa_logs.
     */
    skip?: number
    distinct?: Wa_logsScalarFieldEnum | Wa_logsScalarFieldEnum[]
  }

  /**
   * wa_logs create
   */
  export type wa_logsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the wa_logs
     */
    select?: wa_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the wa_logs
     */
    omit?: wa_logsOmit<ExtArgs> | null
    /**
     * The data needed to create a wa_logs.
     */
    data: XOR<wa_logsCreateInput, wa_logsUncheckedCreateInput>
  }

  /**
   * wa_logs createMany
   */
  export type wa_logsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many wa_logs.
     */
    data: wa_logsCreateManyInput | wa_logsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * wa_logs update
   */
  export type wa_logsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the wa_logs
     */
    select?: wa_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the wa_logs
     */
    omit?: wa_logsOmit<ExtArgs> | null
    /**
     * The data needed to update a wa_logs.
     */
    data: XOR<wa_logsUpdateInput, wa_logsUncheckedUpdateInput>
    /**
     * Choose, which wa_logs to update.
     */
    where: wa_logsWhereUniqueInput
  }

  /**
   * wa_logs updateMany
   */
  export type wa_logsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update wa_logs.
     */
    data: XOR<wa_logsUpdateManyMutationInput, wa_logsUncheckedUpdateManyInput>
    /**
     * Filter which wa_logs to update
     */
    where?: wa_logsWhereInput
    /**
     * Limit how many wa_logs to update.
     */
    limit?: number
  }

  /**
   * wa_logs upsert
   */
  export type wa_logsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the wa_logs
     */
    select?: wa_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the wa_logs
     */
    omit?: wa_logsOmit<ExtArgs> | null
    /**
     * The filter to search for the wa_logs to update in case it exists.
     */
    where: wa_logsWhereUniqueInput
    /**
     * In case the wa_logs found by the `where` argument doesn't exist, create a new wa_logs with this data.
     */
    create: XOR<wa_logsCreateInput, wa_logsUncheckedCreateInput>
    /**
     * In case the wa_logs was found with the provided `where` argument, update it with this data.
     */
    update: XOR<wa_logsUpdateInput, wa_logsUncheckedUpdateInput>
  }

  /**
   * wa_logs delete
   */
  export type wa_logsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the wa_logs
     */
    select?: wa_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the wa_logs
     */
    omit?: wa_logsOmit<ExtArgs> | null
    /**
     * Filter which wa_logs to delete.
     */
    where: wa_logsWhereUniqueInput
  }

  /**
   * wa_logs deleteMany
   */
  export type wa_logsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which wa_logs to delete
     */
    where?: wa_logsWhereInput
    /**
     * Limit how many wa_logs to delete.
     */
    limit?: number
  }

  /**
   * wa_logs without action
   */
  export type wa_logsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the wa_logs
     */
    select?: wa_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the wa_logs
     */
    omit?: wa_logsOmit<ExtArgs> | null
  }


  /**
   * Model inventario
   */

  export type AggregateInventario = {
    _count: InventarioCountAggregateOutputType | null
    _avg: InventarioAvgAggregateOutputType | null
    _sum: InventarioSumAggregateOutputType | null
    _min: InventarioMinAggregateOutputType | null
    _max: InventarioMaxAggregateOutputType | null
  }

  export type InventarioAvgAggregateOutputType = {
    id: number | null
    plataforma_id: number | null
  }

  export type InventarioSumAggregateOutputType = {
    id: number | null
    plataforma_id: number | null
  }

  export type InventarioMinAggregateOutputType = {
    id: number | null
    plataforma_id: number | null
    correo: string | null
    clave: string | null
  }

  export type InventarioMaxAggregateOutputType = {
    id: number | null
    plataforma_id: number | null
    correo: string | null
    clave: string | null
  }

  export type InventarioCountAggregateOutputType = {
    id: number
    plataforma_id: number
    correo: number
    clave: number
    _all: number
  }


  export type InventarioAvgAggregateInputType = {
    id?: true
    plataforma_id?: true
  }

  export type InventarioSumAggregateInputType = {
    id?: true
    plataforma_id?: true
  }

  export type InventarioMinAggregateInputType = {
    id?: true
    plataforma_id?: true
    correo?: true
    clave?: true
  }

  export type InventarioMaxAggregateInputType = {
    id?: true
    plataforma_id?: true
    correo?: true
    clave?: true
  }

  export type InventarioCountAggregateInputType = {
    id?: true
    plataforma_id?: true
    correo?: true
    clave?: true
    _all?: true
  }

  export type InventarioAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which inventario to aggregate.
     */
    where?: inventarioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of inventarios to fetch.
     */
    orderBy?: inventarioOrderByWithRelationInput | inventarioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: inventarioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` inventarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` inventarios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned inventarios
    **/
    _count?: true | InventarioCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: InventarioAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: InventarioSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: InventarioMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: InventarioMaxAggregateInputType
  }

  export type GetInventarioAggregateType<T extends InventarioAggregateArgs> = {
        [P in keyof T & keyof AggregateInventario]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateInventario[P]>
      : GetScalarType<T[P], AggregateInventario[P]>
  }




  export type inventarioGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: inventarioWhereInput
    orderBy?: inventarioOrderByWithAggregationInput | inventarioOrderByWithAggregationInput[]
    by: InventarioScalarFieldEnum[] | InventarioScalarFieldEnum
    having?: inventarioScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: InventarioCountAggregateInputType | true
    _avg?: InventarioAvgAggregateInputType
    _sum?: InventarioSumAggregateInputType
    _min?: InventarioMinAggregateInputType
    _max?: InventarioMaxAggregateInputType
  }

  export type InventarioGroupByOutputType = {
    id: number
    plataforma_id: number
    correo: string
    clave: string | null
    _count: InventarioCountAggregateOutputType | null
    _avg: InventarioAvgAggregateOutputType | null
    _sum: InventarioSumAggregateOutputType | null
    _min: InventarioMinAggregateOutputType | null
    _max: InventarioMaxAggregateOutputType | null
  }

  type GetInventarioGroupByPayload<T extends inventarioGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<InventarioGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof InventarioGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], InventarioGroupByOutputType[P]>
            : GetScalarType<T[P], InventarioGroupByOutputType[P]>
        }
      >
    >


  export type inventarioSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    plataforma_id?: boolean
    correo?: boolean
    clave?: boolean
    plataformas?: boolean | plataformasDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["inventario"]>



  export type inventarioSelectScalar = {
    id?: boolean
    plataforma_id?: boolean
    correo?: boolean
    clave?: boolean
  }

  export type inventarioOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "plataforma_id" | "correo" | "clave", ExtArgs["result"]["inventario"]>
  export type inventarioInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    plataformas?: boolean | plataformasDefaultArgs<ExtArgs>
  }

  export type $inventarioPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "inventario"
    objects: {
      plataformas: Prisma.$plataformasPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      plataforma_id: number
      correo: string
      clave: string | null
    }, ExtArgs["result"]["inventario"]>
    composites: {}
  }

  type inventarioGetPayload<S extends boolean | null | undefined | inventarioDefaultArgs> = $Result.GetResult<Prisma.$inventarioPayload, S>

  type inventarioCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<inventarioFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: InventarioCountAggregateInputType | true
    }

  export interface inventarioDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['inventario'], meta: { name: 'inventario' } }
    /**
     * Find zero or one Inventario that matches the filter.
     * @param {inventarioFindUniqueArgs} args - Arguments to find a Inventario
     * @example
     * // Get one Inventario
     * const inventario = await prisma.inventario.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends inventarioFindUniqueArgs>(args: SelectSubset<T, inventarioFindUniqueArgs<ExtArgs>>): Prisma__inventarioClient<$Result.GetResult<Prisma.$inventarioPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Inventario that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {inventarioFindUniqueOrThrowArgs} args - Arguments to find a Inventario
     * @example
     * // Get one Inventario
     * const inventario = await prisma.inventario.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends inventarioFindUniqueOrThrowArgs>(args: SelectSubset<T, inventarioFindUniqueOrThrowArgs<ExtArgs>>): Prisma__inventarioClient<$Result.GetResult<Prisma.$inventarioPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Inventario that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {inventarioFindFirstArgs} args - Arguments to find a Inventario
     * @example
     * // Get one Inventario
     * const inventario = await prisma.inventario.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends inventarioFindFirstArgs>(args?: SelectSubset<T, inventarioFindFirstArgs<ExtArgs>>): Prisma__inventarioClient<$Result.GetResult<Prisma.$inventarioPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Inventario that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {inventarioFindFirstOrThrowArgs} args - Arguments to find a Inventario
     * @example
     * // Get one Inventario
     * const inventario = await prisma.inventario.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends inventarioFindFirstOrThrowArgs>(args?: SelectSubset<T, inventarioFindFirstOrThrowArgs<ExtArgs>>): Prisma__inventarioClient<$Result.GetResult<Prisma.$inventarioPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Inventarios that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {inventarioFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Inventarios
     * const inventarios = await prisma.inventario.findMany()
     * 
     * // Get first 10 Inventarios
     * const inventarios = await prisma.inventario.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const inventarioWithIdOnly = await prisma.inventario.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends inventarioFindManyArgs>(args?: SelectSubset<T, inventarioFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$inventarioPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Inventario.
     * @param {inventarioCreateArgs} args - Arguments to create a Inventario.
     * @example
     * // Create one Inventario
     * const Inventario = await prisma.inventario.create({
     *   data: {
     *     // ... data to create a Inventario
     *   }
     * })
     * 
     */
    create<T extends inventarioCreateArgs>(args: SelectSubset<T, inventarioCreateArgs<ExtArgs>>): Prisma__inventarioClient<$Result.GetResult<Prisma.$inventarioPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Inventarios.
     * @param {inventarioCreateManyArgs} args - Arguments to create many Inventarios.
     * @example
     * // Create many Inventarios
     * const inventario = await prisma.inventario.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends inventarioCreateManyArgs>(args?: SelectSubset<T, inventarioCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Inventario.
     * @param {inventarioDeleteArgs} args - Arguments to delete one Inventario.
     * @example
     * // Delete one Inventario
     * const Inventario = await prisma.inventario.delete({
     *   where: {
     *     // ... filter to delete one Inventario
     *   }
     * })
     * 
     */
    delete<T extends inventarioDeleteArgs>(args: SelectSubset<T, inventarioDeleteArgs<ExtArgs>>): Prisma__inventarioClient<$Result.GetResult<Prisma.$inventarioPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Inventario.
     * @param {inventarioUpdateArgs} args - Arguments to update one Inventario.
     * @example
     * // Update one Inventario
     * const inventario = await prisma.inventario.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends inventarioUpdateArgs>(args: SelectSubset<T, inventarioUpdateArgs<ExtArgs>>): Prisma__inventarioClient<$Result.GetResult<Prisma.$inventarioPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Inventarios.
     * @param {inventarioDeleteManyArgs} args - Arguments to filter Inventarios to delete.
     * @example
     * // Delete a few Inventarios
     * const { count } = await prisma.inventario.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends inventarioDeleteManyArgs>(args?: SelectSubset<T, inventarioDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Inventarios.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {inventarioUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Inventarios
     * const inventario = await prisma.inventario.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends inventarioUpdateManyArgs>(args: SelectSubset<T, inventarioUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Inventario.
     * @param {inventarioUpsertArgs} args - Arguments to update or create a Inventario.
     * @example
     * // Update or create a Inventario
     * const inventario = await prisma.inventario.upsert({
     *   create: {
     *     // ... data to create a Inventario
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Inventario we want to update
     *   }
     * })
     */
    upsert<T extends inventarioUpsertArgs>(args: SelectSubset<T, inventarioUpsertArgs<ExtArgs>>): Prisma__inventarioClient<$Result.GetResult<Prisma.$inventarioPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Inventarios.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {inventarioCountArgs} args - Arguments to filter Inventarios to count.
     * @example
     * // Count the number of Inventarios
     * const count = await prisma.inventario.count({
     *   where: {
     *     // ... the filter for the Inventarios we want to count
     *   }
     * })
    **/
    count<T extends inventarioCountArgs>(
      args?: Subset<T, inventarioCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], InventarioCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Inventario.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InventarioAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends InventarioAggregateArgs>(args: Subset<T, InventarioAggregateArgs>): Prisma.PrismaPromise<GetInventarioAggregateType<T>>

    /**
     * Group by Inventario.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {inventarioGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends inventarioGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: inventarioGroupByArgs['orderBy'] }
        : { orderBy?: inventarioGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, inventarioGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetInventarioGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the inventario model
   */
  readonly fields: inventarioFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for inventario.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__inventarioClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    plataformas<T extends plataformasDefaultArgs<ExtArgs> = {}>(args?: Subset<T, plataformasDefaultArgs<ExtArgs>>): Prisma__plataformasClient<$Result.GetResult<Prisma.$plataformasPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the inventario model
   */
  interface inventarioFieldRefs {
    readonly id: FieldRef<"inventario", 'Int'>
    readonly plataforma_id: FieldRef<"inventario", 'Int'>
    readonly correo: FieldRef<"inventario", 'String'>
    readonly clave: FieldRef<"inventario", 'String'>
  }
    

  // Custom InputTypes
  /**
   * inventario findUnique
   */
  export type inventarioFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the inventario
     */
    select?: inventarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the inventario
     */
    omit?: inventarioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: inventarioInclude<ExtArgs> | null
    /**
     * Filter, which inventario to fetch.
     */
    where: inventarioWhereUniqueInput
  }

  /**
   * inventario findUniqueOrThrow
   */
  export type inventarioFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the inventario
     */
    select?: inventarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the inventario
     */
    omit?: inventarioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: inventarioInclude<ExtArgs> | null
    /**
     * Filter, which inventario to fetch.
     */
    where: inventarioWhereUniqueInput
  }

  /**
   * inventario findFirst
   */
  export type inventarioFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the inventario
     */
    select?: inventarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the inventario
     */
    omit?: inventarioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: inventarioInclude<ExtArgs> | null
    /**
     * Filter, which inventario to fetch.
     */
    where?: inventarioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of inventarios to fetch.
     */
    orderBy?: inventarioOrderByWithRelationInput | inventarioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for inventarios.
     */
    cursor?: inventarioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` inventarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` inventarios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of inventarios.
     */
    distinct?: InventarioScalarFieldEnum | InventarioScalarFieldEnum[]
  }

  /**
   * inventario findFirstOrThrow
   */
  export type inventarioFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the inventario
     */
    select?: inventarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the inventario
     */
    omit?: inventarioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: inventarioInclude<ExtArgs> | null
    /**
     * Filter, which inventario to fetch.
     */
    where?: inventarioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of inventarios to fetch.
     */
    orderBy?: inventarioOrderByWithRelationInput | inventarioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for inventarios.
     */
    cursor?: inventarioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` inventarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` inventarios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of inventarios.
     */
    distinct?: InventarioScalarFieldEnum | InventarioScalarFieldEnum[]
  }

  /**
   * inventario findMany
   */
  export type inventarioFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the inventario
     */
    select?: inventarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the inventario
     */
    omit?: inventarioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: inventarioInclude<ExtArgs> | null
    /**
     * Filter, which inventarios to fetch.
     */
    where?: inventarioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of inventarios to fetch.
     */
    orderBy?: inventarioOrderByWithRelationInput | inventarioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing inventarios.
     */
    cursor?: inventarioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` inventarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` inventarios.
     */
    skip?: number
    distinct?: InventarioScalarFieldEnum | InventarioScalarFieldEnum[]
  }

  /**
   * inventario create
   */
  export type inventarioCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the inventario
     */
    select?: inventarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the inventario
     */
    omit?: inventarioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: inventarioInclude<ExtArgs> | null
    /**
     * The data needed to create a inventario.
     */
    data: XOR<inventarioCreateInput, inventarioUncheckedCreateInput>
  }

  /**
   * inventario createMany
   */
  export type inventarioCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many inventarios.
     */
    data: inventarioCreateManyInput | inventarioCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * inventario update
   */
  export type inventarioUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the inventario
     */
    select?: inventarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the inventario
     */
    omit?: inventarioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: inventarioInclude<ExtArgs> | null
    /**
     * The data needed to update a inventario.
     */
    data: XOR<inventarioUpdateInput, inventarioUncheckedUpdateInput>
    /**
     * Choose, which inventario to update.
     */
    where: inventarioWhereUniqueInput
  }

  /**
   * inventario updateMany
   */
  export type inventarioUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update inventarios.
     */
    data: XOR<inventarioUpdateManyMutationInput, inventarioUncheckedUpdateManyInput>
    /**
     * Filter which inventarios to update
     */
    where?: inventarioWhereInput
    /**
     * Limit how many inventarios to update.
     */
    limit?: number
  }

  /**
   * inventario upsert
   */
  export type inventarioUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the inventario
     */
    select?: inventarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the inventario
     */
    omit?: inventarioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: inventarioInclude<ExtArgs> | null
    /**
     * The filter to search for the inventario to update in case it exists.
     */
    where: inventarioWhereUniqueInput
    /**
     * In case the inventario found by the `where` argument doesn't exist, create a new inventario with this data.
     */
    create: XOR<inventarioCreateInput, inventarioUncheckedCreateInput>
    /**
     * In case the inventario was found with the provided `where` argument, update it with this data.
     */
    update: XOR<inventarioUpdateInput, inventarioUncheckedUpdateInput>
  }

  /**
   * inventario delete
   */
  export type inventarioDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the inventario
     */
    select?: inventarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the inventario
     */
    omit?: inventarioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: inventarioInclude<ExtArgs> | null
    /**
     * Filter which inventario to delete.
     */
    where: inventarioWhereUniqueInput
  }

  /**
   * inventario deleteMany
   */
  export type inventarioDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which inventarios to delete
     */
    where?: inventarioWhereInput
    /**
     * Limit how many inventarios to delete.
     */
    limit?: number
  }

  /**
   * inventario without action
   */
  export type inventarioDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the inventario
     */
    select?: inventarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the inventario
     */
    omit?: inventarioOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: inventarioInclude<ExtArgs> | null
  }


  /**
   * Model metricasmensuales
   */

  export type AggregateMetricasmensuales = {
    _count: MetricasmensualesCountAggregateOutputType | null
    _avg: MetricasmensualesAvgAggregateOutputType | null
    _sum: MetricasmensualesSumAggregateOutputType | null
    _min: MetricasmensualesMinAggregateOutputType | null
    _max: MetricasmensualesMaxAggregateOutputType | null
  }

  export type MetricasmensualesAvgAggregateOutputType = {
    id: number | null
    year: number | null
    month: number | null
    totalGeneral: Decimal | null
    totalPantallas: Decimal | null
    totalCuentas: Decimal | null
    ventasCantidad: number | null
    clientesActivos: number | null
  }

  export type MetricasmensualesSumAggregateOutputType = {
    id: number | null
    year: number | null
    month: number | null
    totalGeneral: Decimal | null
    totalPantallas: Decimal | null
    totalCuentas: Decimal | null
    ventasCantidad: number | null
    clientesActivos: number | null
  }

  export type MetricasmensualesMinAggregateOutputType = {
    id: number | null
    year: number | null
    month: number | null
    periodLabel: string | null
    totalGeneral: Decimal | null
    totalPantallas: Decimal | null
    totalCuentas: Decimal | null
    ventasCantidad: number | null
    clientesActivos: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type MetricasmensualesMaxAggregateOutputType = {
    id: number | null
    year: number | null
    month: number | null
    periodLabel: string | null
    totalGeneral: Decimal | null
    totalPantallas: Decimal | null
    totalCuentas: Decimal | null
    ventasCantidad: number | null
    clientesActivos: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type MetricasmensualesCountAggregateOutputType = {
    id: number
    year: number
    month: number
    periodLabel: number
    totalGeneral: number
    totalPantallas: number
    totalCuentas: number
    ventasCantidad: number
    clientesActivos: number
    ranking: number
    ventasDias: number
    payload: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type MetricasmensualesAvgAggregateInputType = {
    id?: true
    year?: true
    month?: true
    totalGeneral?: true
    totalPantallas?: true
    totalCuentas?: true
    ventasCantidad?: true
    clientesActivos?: true
  }

  export type MetricasmensualesSumAggregateInputType = {
    id?: true
    year?: true
    month?: true
    totalGeneral?: true
    totalPantallas?: true
    totalCuentas?: true
    ventasCantidad?: true
    clientesActivos?: true
  }

  export type MetricasmensualesMinAggregateInputType = {
    id?: true
    year?: true
    month?: true
    periodLabel?: true
    totalGeneral?: true
    totalPantallas?: true
    totalCuentas?: true
    ventasCantidad?: true
    clientesActivos?: true
    createdAt?: true
    updatedAt?: true
  }

  export type MetricasmensualesMaxAggregateInputType = {
    id?: true
    year?: true
    month?: true
    periodLabel?: true
    totalGeneral?: true
    totalPantallas?: true
    totalCuentas?: true
    ventasCantidad?: true
    clientesActivos?: true
    createdAt?: true
    updatedAt?: true
  }

  export type MetricasmensualesCountAggregateInputType = {
    id?: true
    year?: true
    month?: true
    periodLabel?: true
    totalGeneral?: true
    totalPantallas?: true
    totalCuentas?: true
    ventasCantidad?: true
    clientesActivos?: true
    ranking?: true
    ventasDias?: true
    payload?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type MetricasmensualesAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which metricasmensuales to aggregate.
     */
    where?: metricasmensualesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of metricasmensuales to fetch.
     */
    orderBy?: metricasmensualesOrderByWithRelationInput | metricasmensualesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: metricasmensualesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` metricasmensuales from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` metricasmensuales.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned metricasmensuales
    **/
    _count?: true | MetricasmensualesCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: MetricasmensualesAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: MetricasmensualesSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MetricasmensualesMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MetricasmensualesMaxAggregateInputType
  }

  export type GetMetricasmensualesAggregateType<T extends MetricasmensualesAggregateArgs> = {
        [P in keyof T & keyof AggregateMetricasmensuales]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMetricasmensuales[P]>
      : GetScalarType<T[P], AggregateMetricasmensuales[P]>
  }




  export type metricasmensualesGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: metricasmensualesWhereInput
    orderBy?: metricasmensualesOrderByWithAggregationInput | metricasmensualesOrderByWithAggregationInput[]
    by: MetricasmensualesScalarFieldEnum[] | MetricasmensualesScalarFieldEnum
    having?: metricasmensualesScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MetricasmensualesCountAggregateInputType | true
    _avg?: MetricasmensualesAvgAggregateInputType
    _sum?: MetricasmensualesSumAggregateInputType
    _min?: MetricasmensualesMinAggregateInputType
    _max?: MetricasmensualesMaxAggregateInputType
  }

  export type MetricasmensualesGroupByOutputType = {
    id: number
    year: number
    month: number
    periodLabel: string
    totalGeneral: Decimal
    totalPantallas: Decimal
    totalCuentas: Decimal
    ventasCantidad: number
    clientesActivos: number
    ranking: JsonValue
    ventasDias: JsonValue
    payload: JsonValue | null
    createdAt: Date
    updatedAt: Date
    _count: MetricasmensualesCountAggregateOutputType | null
    _avg: MetricasmensualesAvgAggregateOutputType | null
    _sum: MetricasmensualesSumAggregateOutputType | null
    _min: MetricasmensualesMinAggregateOutputType | null
    _max: MetricasmensualesMaxAggregateOutputType | null
  }

  type GetMetricasmensualesGroupByPayload<T extends metricasmensualesGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MetricasmensualesGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MetricasmensualesGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MetricasmensualesGroupByOutputType[P]>
            : GetScalarType<T[P], MetricasmensualesGroupByOutputType[P]>
        }
      >
    >


  export type metricasmensualesSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    year?: boolean
    month?: boolean
    periodLabel?: boolean
    totalGeneral?: boolean
    totalPantallas?: boolean
    totalCuentas?: boolean
    ventasCantidad?: boolean
    clientesActivos?: boolean
    ranking?: boolean
    ventasDias?: boolean
    payload?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["metricasmensuales"]>



  export type metricasmensualesSelectScalar = {
    id?: boolean
    year?: boolean
    month?: boolean
    periodLabel?: boolean
    totalGeneral?: boolean
    totalPantallas?: boolean
    totalCuentas?: boolean
    ventasCantidad?: boolean
    clientesActivos?: boolean
    ranking?: boolean
    ventasDias?: boolean
    payload?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type metricasmensualesOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "year" | "month" | "periodLabel" | "totalGeneral" | "totalPantallas" | "totalCuentas" | "ventasCantidad" | "clientesActivos" | "ranking" | "ventasDias" | "payload" | "createdAt" | "updatedAt", ExtArgs["result"]["metricasmensuales"]>

  export type $metricasmensualesPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "metricasmensuales"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      year: number
      month: number
      periodLabel: string
      totalGeneral: Prisma.Decimal
      totalPantallas: Prisma.Decimal
      totalCuentas: Prisma.Decimal
      ventasCantidad: number
      clientesActivos: number
      ranking: Prisma.JsonValue
      ventasDias: Prisma.JsonValue
      payload: Prisma.JsonValue | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["metricasmensuales"]>
    composites: {}
  }

  type metricasmensualesGetPayload<S extends boolean | null | undefined | metricasmensualesDefaultArgs> = $Result.GetResult<Prisma.$metricasmensualesPayload, S>

  type metricasmensualesCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<metricasmensualesFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: MetricasmensualesCountAggregateInputType | true
    }

  export interface metricasmensualesDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['metricasmensuales'], meta: { name: 'metricasmensuales' } }
    /**
     * Find zero or one Metricasmensuales that matches the filter.
     * @param {metricasmensualesFindUniqueArgs} args - Arguments to find a Metricasmensuales
     * @example
     * // Get one Metricasmensuales
     * const metricasmensuales = await prisma.metricasmensuales.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends metricasmensualesFindUniqueArgs>(args: SelectSubset<T, metricasmensualesFindUniqueArgs<ExtArgs>>): Prisma__metricasmensualesClient<$Result.GetResult<Prisma.$metricasmensualesPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Metricasmensuales that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {metricasmensualesFindUniqueOrThrowArgs} args - Arguments to find a Metricasmensuales
     * @example
     * // Get one Metricasmensuales
     * const metricasmensuales = await prisma.metricasmensuales.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends metricasmensualesFindUniqueOrThrowArgs>(args: SelectSubset<T, metricasmensualesFindUniqueOrThrowArgs<ExtArgs>>): Prisma__metricasmensualesClient<$Result.GetResult<Prisma.$metricasmensualesPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Metricasmensuales that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {metricasmensualesFindFirstArgs} args - Arguments to find a Metricasmensuales
     * @example
     * // Get one Metricasmensuales
     * const metricasmensuales = await prisma.metricasmensuales.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends metricasmensualesFindFirstArgs>(args?: SelectSubset<T, metricasmensualesFindFirstArgs<ExtArgs>>): Prisma__metricasmensualesClient<$Result.GetResult<Prisma.$metricasmensualesPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Metricasmensuales that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {metricasmensualesFindFirstOrThrowArgs} args - Arguments to find a Metricasmensuales
     * @example
     * // Get one Metricasmensuales
     * const metricasmensuales = await prisma.metricasmensuales.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends metricasmensualesFindFirstOrThrowArgs>(args?: SelectSubset<T, metricasmensualesFindFirstOrThrowArgs<ExtArgs>>): Prisma__metricasmensualesClient<$Result.GetResult<Prisma.$metricasmensualesPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Metricasmensuales that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {metricasmensualesFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Metricasmensuales
     * const metricasmensuales = await prisma.metricasmensuales.findMany()
     * 
     * // Get first 10 Metricasmensuales
     * const metricasmensuales = await prisma.metricasmensuales.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const metricasmensualesWithIdOnly = await prisma.metricasmensuales.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends metricasmensualesFindManyArgs>(args?: SelectSubset<T, metricasmensualesFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$metricasmensualesPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Metricasmensuales.
     * @param {metricasmensualesCreateArgs} args - Arguments to create a Metricasmensuales.
     * @example
     * // Create one Metricasmensuales
     * const Metricasmensuales = await prisma.metricasmensuales.create({
     *   data: {
     *     // ... data to create a Metricasmensuales
     *   }
     * })
     * 
     */
    create<T extends metricasmensualesCreateArgs>(args: SelectSubset<T, metricasmensualesCreateArgs<ExtArgs>>): Prisma__metricasmensualesClient<$Result.GetResult<Prisma.$metricasmensualesPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Metricasmensuales.
     * @param {metricasmensualesCreateManyArgs} args - Arguments to create many Metricasmensuales.
     * @example
     * // Create many Metricasmensuales
     * const metricasmensuales = await prisma.metricasmensuales.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends metricasmensualesCreateManyArgs>(args?: SelectSubset<T, metricasmensualesCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Metricasmensuales.
     * @param {metricasmensualesDeleteArgs} args - Arguments to delete one Metricasmensuales.
     * @example
     * // Delete one Metricasmensuales
     * const Metricasmensuales = await prisma.metricasmensuales.delete({
     *   where: {
     *     // ... filter to delete one Metricasmensuales
     *   }
     * })
     * 
     */
    delete<T extends metricasmensualesDeleteArgs>(args: SelectSubset<T, metricasmensualesDeleteArgs<ExtArgs>>): Prisma__metricasmensualesClient<$Result.GetResult<Prisma.$metricasmensualesPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Metricasmensuales.
     * @param {metricasmensualesUpdateArgs} args - Arguments to update one Metricasmensuales.
     * @example
     * // Update one Metricasmensuales
     * const metricasmensuales = await prisma.metricasmensuales.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends metricasmensualesUpdateArgs>(args: SelectSubset<T, metricasmensualesUpdateArgs<ExtArgs>>): Prisma__metricasmensualesClient<$Result.GetResult<Prisma.$metricasmensualesPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Metricasmensuales.
     * @param {metricasmensualesDeleteManyArgs} args - Arguments to filter Metricasmensuales to delete.
     * @example
     * // Delete a few Metricasmensuales
     * const { count } = await prisma.metricasmensuales.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends metricasmensualesDeleteManyArgs>(args?: SelectSubset<T, metricasmensualesDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Metricasmensuales.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {metricasmensualesUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Metricasmensuales
     * const metricasmensuales = await prisma.metricasmensuales.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends metricasmensualesUpdateManyArgs>(args: SelectSubset<T, metricasmensualesUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Metricasmensuales.
     * @param {metricasmensualesUpsertArgs} args - Arguments to update or create a Metricasmensuales.
     * @example
     * // Update or create a Metricasmensuales
     * const metricasmensuales = await prisma.metricasmensuales.upsert({
     *   create: {
     *     // ... data to create a Metricasmensuales
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Metricasmensuales we want to update
     *   }
     * })
     */
    upsert<T extends metricasmensualesUpsertArgs>(args: SelectSubset<T, metricasmensualesUpsertArgs<ExtArgs>>): Prisma__metricasmensualesClient<$Result.GetResult<Prisma.$metricasmensualesPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Metricasmensuales.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {metricasmensualesCountArgs} args - Arguments to filter Metricasmensuales to count.
     * @example
     * // Count the number of Metricasmensuales
     * const count = await prisma.metricasmensuales.count({
     *   where: {
     *     // ... the filter for the Metricasmensuales we want to count
     *   }
     * })
    **/
    count<T extends metricasmensualesCountArgs>(
      args?: Subset<T, metricasmensualesCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MetricasmensualesCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Metricasmensuales.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MetricasmensualesAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends MetricasmensualesAggregateArgs>(args: Subset<T, MetricasmensualesAggregateArgs>): Prisma.PrismaPromise<GetMetricasmensualesAggregateType<T>>

    /**
     * Group by Metricasmensuales.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {metricasmensualesGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends metricasmensualesGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: metricasmensualesGroupByArgs['orderBy'] }
        : { orderBy?: metricasmensualesGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, metricasmensualesGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMetricasmensualesGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the metricasmensuales model
   */
  readonly fields: metricasmensualesFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for metricasmensuales.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__metricasmensualesClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the metricasmensuales model
   */
  interface metricasmensualesFieldRefs {
    readonly id: FieldRef<"metricasmensuales", 'Int'>
    readonly year: FieldRef<"metricasmensuales", 'Int'>
    readonly month: FieldRef<"metricasmensuales", 'Int'>
    readonly periodLabel: FieldRef<"metricasmensuales", 'String'>
    readonly totalGeneral: FieldRef<"metricasmensuales", 'Decimal'>
    readonly totalPantallas: FieldRef<"metricasmensuales", 'Decimal'>
    readonly totalCuentas: FieldRef<"metricasmensuales", 'Decimal'>
    readonly ventasCantidad: FieldRef<"metricasmensuales", 'Int'>
    readonly clientesActivos: FieldRef<"metricasmensuales", 'Int'>
    readonly ranking: FieldRef<"metricasmensuales", 'Json'>
    readonly ventasDias: FieldRef<"metricasmensuales", 'Json'>
    readonly payload: FieldRef<"metricasmensuales", 'Json'>
    readonly createdAt: FieldRef<"metricasmensuales", 'DateTime'>
    readonly updatedAt: FieldRef<"metricasmensuales", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * metricasmensuales findUnique
   */
  export type metricasmensualesFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the metricasmensuales
     */
    select?: metricasmensualesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the metricasmensuales
     */
    omit?: metricasmensualesOmit<ExtArgs> | null
    /**
     * Filter, which metricasmensuales to fetch.
     */
    where: metricasmensualesWhereUniqueInput
  }

  /**
   * metricasmensuales findUniqueOrThrow
   */
  export type metricasmensualesFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the metricasmensuales
     */
    select?: metricasmensualesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the metricasmensuales
     */
    omit?: metricasmensualesOmit<ExtArgs> | null
    /**
     * Filter, which metricasmensuales to fetch.
     */
    where: metricasmensualesWhereUniqueInput
  }

  /**
   * metricasmensuales findFirst
   */
  export type metricasmensualesFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the metricasmensuales
     */
    select?: metricasmensualesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the metricasmensuales
     */
    omit?: metricasmensualesOmit<ExtArgs> | null
    /**
     * Filter, which metricasmensuales to fetch.
     */
    where?: metricasmensualesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of metricasmensuales to fetch.
     */
    orderBy?: metricasmensualesOrderByWithRelationInput | metricasmensualesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for metricasmensuales.
     */
    cursor?: metricasmensualesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` metricasmensuales from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` metricasmensuales.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of metricasmensuales.
     */
    distinct?: MetricasmensualesScalarFieldEnum | MetricasmensualesScalarFieldEnum[]
  }

  /**
   * metricasmensuales findFirstOrThrow
   */
  export type metricasmensualesFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the metricasmensuales
     */
    select?: metricasmensualesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the metricasmensuales
     */
    omit?: metricasmensualesOmit<ExtArgs> | null
    /**
     * Filter, which metricasmensuales to fetch.
     */
    where?: metricasmensualesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of metricasmensuales to fetch.
     */
    orderBy?: metricasmensualesOrderByWithRelationInput | metricasmensualesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for metricasmensuales.
     */
    cursor?: metricasmensualesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` metricasmensuales from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` metricasmensuales.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of metricasmensuales.
     */
    distinct?: MetricasmensualesScalarFieldEnum | MetricasmensualesScalarFieldEnum[]
  }

  /**
   * metricasmensuales findMany
   */
  export type metricasmensualesFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the metricasmensuales
     */
    select?: metricasmensualesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the metricasmensuales
     */
    omit?: metricasmensualesOmit<ExtArgs> | null
    /**
     * Filter, which metricasmensuales to fetch.
     */
    where?: metricasmensualesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of metricasmensuales to fetch.
     */
    orderBy?: metricasmensualesOrderByWithRelationInput | metricasmensualesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing metricasmensuales.
     */
    cursor?: metricasmensualesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` metricasmensuales from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` metricasmensuales.
     */
    skip?: number
    distinct?: MetricasmensualesScalarFieldEnum | MetricasmensualesScalarFieldEnum[]
  }

  /**
   * metricasmensuales create
   */
  export type metricasmensualesCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the metricasmensuales
     */
    select?: metricasmensualesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the metricasmensuales
     */
    omit?: metricasmensualesOmit<ExtArgs> | null
    /**
     * The data needed to create a metricasmensuales.
     */
    data: XOR<metricasmensualesCreateInput, metricasmensualesUncheckedCreateInput>
  }

  /**
   * metricasmensuales createMany
   */
  export type metricasmensualesCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many metricasmensuales.
     */
    data: metricasmensualesCreateManyInput | metricasmensualesCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * metricasmensuales update
   */
  export type metricasmensualesUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the metricasmensuales
     */
    select?: metricasmensualesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the metricasmensuales
     */
    omit?: metricasmensualesOmit<ExtArgs> | null
    /**
     * The data needed to update a metricasmensuales.
     */
    data: XOR<metricasmensualesUpdateInput, metricasmensualesUncheckedUpdateInput>
    /**
     * Choose, which metricasmensuales to update.
     */
    where: metricasmensualesWhereUniqueInput
  }

  /**
   * metricasmensuales updateMany
   */
  export type metricasmensualesUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update metricasmensuales.
     */
    data: XOR<metricasmensualesUpdateManyMutationInput, metricasmensualesUncheckedUpdateManyInput>
    /**
     * Filter which metricasmensuales to update
     */
    where?: metricasmensualesWhereInput
    /**
     * Limit how many metricasmensuales to update.
     */
    limit?: number
  }

  /**
   * metricasmensuales upsert
   */
  export type metricasmensualesUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the metricasmensuales
     */
    select?: metricasmensualesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the metricasmensuales
     */
    omit?: metricasmensualesOmit<ExtArgs> | null
    /**
     * The filter to search for the metricasmensuales to update in case it exists.
     */
    where: metricasmensualesWhereUniqueInput
    /**
     * In case the metricasmensuales found by the `where` argument doesn't exist, create a new metricasmensuales with this data.
     */
    create: XOR<metricasmensualesCreateInput, metricasmensualesUncheckedCreateInput>
    /**
     * In case the metricasmensuales was found with the provided `where` argument, update it with this data.
     */
    update: XOR<metricasmensualesUpdateInput, metricasmensualesUncheckedUpdateInput>
  }

  /**
   * metricasmensuales delete
   */
  export type metricasmensualesDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the metricasmensuales
     */
    select?: metricasmensualesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the metricasmensuales
     */
    omit?: metricasmensualesOmit<ExtArgs> | null
    /**
     * Filter which metricasmensuales to delete.
     */
    where: metricasmensualesWhereUniqueInput
  }

  /**
   * metricasmensuales deleteMany
   */
  export type metricasmensualesDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which metricasmensuales to delete
     */
    where?: metricasmensualesWhereInput
    /**
     * Limit how many metricasmensuales to delete.
     */
    limit?: number
  }

  /**
   * metricasmensuales without action
   */
  export type metricasmensualesDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the metricasmensuales
     */
    select?: metricasmensualesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the metricasmensuales
     */
    omit?: metricasmensualesOmit<ExtArgs> | null
  }


  /**
   * Model admin
   */

  export type AggregateAdmin = {
    _count: AdminCountAggregateOutputType | null
    _avg: AdminAvgAggregateOutputType | null
    _sum: AdminSumAggregateOutputType | null
    _min: AdminMinAggregateOutputType | null
    _max: AdminMaxAggregateOutputType | null
  }

  export type AdminAvgAggregateOutputType = {
    id: number | null
  }

  export type AdminSumAggregateOutputType = {
    id: number | null
  }

  export type AdminMinAggregateOutputType = {
    id: number | null
    usuario: string | null
    contrasena: string | null
    creado_en: Date | null
  }

  export type AdminMaxAggregateOutputType = {
    id: number | null
    usuario: string | null
    contrasena: string | null
    creado_en: Date | null
  }

  export type AdminCountAggregateOutputType = {
    id: number
    usuario: number
    contrasena: number
    creado_en: number
    _all: number
  }


  export type AdminAvgAggregateInputType = {
    id?: true
  }

  export type AdminSumAggregateInputType = {
    id?: true
  }

  export type AdminMinAggregateInputType = {
    id?: true
    usuario?: true
    contrasena?: true
    creado_en?: true
  }

  export type AdminMaxAggregateInputType = {
    id?: true
    usuario?: true
    contrasena?: true
    creado_en?: true
  }

  export type AdminCountAggregateInputType = {
    id?: true
    usuario?: true
    contrasena?: true
    creado_en?: true
    _all?: true
  }

  export type AdminAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which admin to aggregate.
     */
    where?: adminWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of admins to fetch.
     */
    orderBy?: adminOrderByWithRelationInput | adminOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: adminWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` admins from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` admins.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned admins
    **/
    _count?: true | AdminCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AdminAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AdminSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AdminMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AdminMaxAggregateInputType
  }

  export type GetAdminAggregateType<T extends AdminAggregateArgs> = {
        [P in keyof T & keyof AggregateAdmin]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAdmin[P]>
      : GetScalarType<T[P], AggregateAdmin[P]>
  }




  export type adminGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: adminWhereInput
    orderBy?: adminOrderByWithAggregationInput | adminOrderByWithAggregationInput[]
    by: AdminScalarFieldEnum[] | AdminScalarFieldEnum
    having?: adminScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AdminCountAggregateInputType | true
    _avg?: AdminAvgAggregateInputType
    _sum?: AdminSumAggregateInputType
    _min?: AdminMinAggregateInputType
    _max?: AdminMaxAggregateInputType
  }

  export type AdminGroupByOutputType = {
    id: number
    usuario: string
    contrasena: string
    creado_en: Date
    _count: AdminCountAggregateOutputType | null
    _avg: AdminAvgAggregateOutputType | null
    _sum: AdminSumAggregateOutputType | null
    _min: AdminMinAggregateOutputType | null
    _max: AdminMaxAggregateOutputType | null
  }

  type GetAdminGroupByPayload<T extends adminGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AdminGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AdminGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AdminGroupByOutputType[P]>
            : GetScalarType<T[P], AdminGroupByOutputType[P]>
        }
      >
    >


  export type adminSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    usuario?: boolean
    contrasena?: boolean
    creado_en?: boolean
  }, ExtArgs["result"]["admin"]>



  export type adminSelectScalar = {
    id?: boolean
    usuario?: boolean
    contrasena?: boolean
    creado_en?: boolean
  }

  export type adminOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "usuario" | "contrasena" | "creado_en", ExtArgs["result"]["admin"]>

  export type $adminPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "admin"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      usuario: string
      contrasena: string
      creado_en: Date
    }, ExtArgs["result"]["admin"]>
    composites: {}
  }

  type adminGetPayload<S extends boolean | null | undefined | adminDefaultArgs> = $Result.GetResult<Prisma.$adminPayload, S>

  type adminCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<adminFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AdminCountAggregateInputType | true
    }

  export interface adminDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['admin'], meta: { name: 'admin' } }
    /**
     * Find zero or one Admin that matches the filter.
     * @param {adminFindUniqueArgs} args - Arguments to find a Admin
     * @example
     * // Get one Admin
     * const admin = await prisma.admin.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends adminFindUniqueArgs>(args: SelectSubset<T, adminFindUniqueArgs<ExtArgs>>): Prisma__adminClient<$Result.GetResult<Prisma.$adminPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Admin that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {adminFindUniqueOrThrowArgs} args - Arguments to find a Admin
     * @example
     * // Get one Admin
     * const admin = await prisma.admin.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends adminFindUniqueOrThrowArgs>(args: SelectSubset<T, adminFindUniqueOrThrowArgs<ExtArgs>>): Prisma__adminClient<$Result.GetResult<Prisma.$adminPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Admin that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {adminFindFirstArgs} args - Arguments to find a Admin
     * @example
     * // Get one Admin
     * const admin = await prisma.admin.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends adminFindFirstArgs>(args?: SelectSubset<T, adminFindFirstArgs<ExtArgs>>): Prisma__adminClient<$Result.GetResult<Prisma.$adminPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Admin that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {adminFindFirstOrThrowArgs} args - Arguments to find a Admin
     * @example
     * // Get one Admin
     * const admin = await prisma.admin.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends adminFindFirstOrThrowArgs>(args?: SelectSubset<T, adminFindFirstOrThrowArgs<ExtArgs>>): Prisma__adminClient<$Result.GetResult<Prisma.$adminPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Admins that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {adminFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Admins
     * const admins = await prisma.admin.findMany()
     * 
     * // Get first 10 Admins
     * const admins = await prisma.admin.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const adminWithIdOnly = await prisma.admin.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends adminFindManyArgs>(args?: SelectSubset<T, adminFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$adminPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Admin.
     * @param {adminCreateArgs} args - Arguments to create a Admin.
     * @example
     * // Create one Admin
     * const Admin = await prisma.admin.create({
     *   data: {
     *     // ... data to create a Admin
     *   }
     * })
     * 
     */
    create<T extends adminCreateArgs>(args: SelectSubset<T, adminCreateArgs<ExtArgs>>): Prisma__adminClient<$Result.GetResult<Prisma.$adminPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Admins.
     * @param {adminCreateManyArgs} args - Arguments to create many Admins.
     * @example
     * // Create many Admins
     * const admin = await prisma.admin.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends adminCreateManyArgs>(args?: SelectSubset<T, adminCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Admin.
     * @param {adminDeleteArgs} args - Arguments to delete one Admin.
     * @example
     * // Delete one Admin
     * const Admin = await prisma.admin.delete({
     *   where: {
     *     // ... filter to delete one Admin
     *   }
     * })
     * 
     */
    delete<T extends adminDeleteArgs>(args: SelectSubset<T, adminDeleteArgs<ExtArgs>>): Prisma__adminClient<$Result.GetResult<Prisma.$adminPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Admin.
     * @param {adminUpdateArgs} args - Arguments to update one Admin.
     * @example
     * // Update one Admin
     * const admin = await prisma.admin.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends adminUpdateArgs>(args: SelectSubset<T, adminUpdateArgs<ExtArgs>>): Prisma__adminClient<$Result.GetResult<Prisma.$adminPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Admins.
     * @param {adminDeleteManyArgs} args - Arguments to filter Admins to delete.
     * @example
     * // Delete a few Admins
     * const { count } = await prisma.admin.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends adminDeleteManyArgs>(args?: SelectSubset<T, adminDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Admins.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {adminUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Admins
     * const admin = await prisma.admin.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends adminUpdateManyArgs>(args: SelectSubset<T, adminUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Admin.
     * @param {adminUpsertArgs} args - Arguments to update or create a Admin.
     * @example
     * // Update or create a Admin
     * const admin = await prisma.admin.upsert({
     *   create: {
     *     // ... data to create a Admin
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Admin we want to update
     *   }
     * })
     */
    upsert<T extends adminUpsertArgs>(args: SelectSubset<T, adminUpsertArgs<ExtArgs>>): Prisma__adminClient<$Result.GetResult<Prisma.$adminPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Admins.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {adminCountArgs} args - Arguments to filter Admins to count.
     * @example
     * // Count the number of Admins
     * const count = await prisma.admin.count({
     *   where: {
     *     // ... the filter for the Admins we want to count
     *   }
     * })
    **/
    count<T extends adminCountArgs>(
      args?: Subset<T, adminCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AdminCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Admin.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AdminAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AdminAggregateArgs>(args: Subset<T, AdminAggregateArgs>): Prisma.PrismaPromise<GetAdminAggregateType<T>>

    /**
     * Group by Admin.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {adminGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends adminGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: adminGroupByArgs['orderBy'] }
        : { orderBy?: adminGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, adminGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAdminGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the admin model
   */
  readonly fields: adminFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for admin.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__adminClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the admin model
   */
  interface adminFieldRefs {
    readonly id: FieldRef<"admin", 'Int'>
    readonly usuario: FieldRef<"admin", 'String'>
    readonly contrasena: FieldRef<"admin", 'String'>
    readonly creado_en: FieldRef<"admin", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * admin findUnique
   */
  export type adminFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the admin
     */
    select?: adminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the admin
     */
    omit?: adminOmit<ExtArgs> | null
    /**
     * Filter, which admin to fetch.
     */
    where: adminWhereUniqueInput
  }

  /**
   * admin findUniqueOrThrow
   */
  export type adminFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the admin
     */
    select?: adminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the admin
     */
    omit?: adminOmit<ExtArgs> | null
    /**
     * Filter, which admin to fetch.
     */
    where: adminWhereUniqueInput
  }

  /**
   * admin findFirst
   */
  export type adminFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the admin
     */
    select?: adminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the admin
     */
    omit?: adminOmit<ExtArgs> | null
    /**
     * Filter, which admin to fetch.
     */
    where?: adminWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of admins to fetch.
     */
    orderBy?: adminOrderByWithRelationInput | adminOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for admins.
     */
    cursor?: adminWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` admins from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` admins.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of admins.
     */
    distinct?: AdminScalarFieldEnum | AdminScalarFieldEnum[]
  }

  /**
   * admin findFirstOrThrow
   */
  export type adminFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the admin
     */
    select?: adminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the admin
     */
    omit?: adminOmit<ExtArgs> | null
    /**
     * Filter, which admin to fetch.
     */
    where?: adminWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of admins to fetch.
     */
    orderBy?: adminOrderByWithRelationInput | adminOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for admins.
     */
    cursor?: adminWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` admins from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` admins.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of admins.
     */
    distinct?: AdminScalarFieldEnum | AdminScalarFieldEnum[]
  }

  /**
   * admin findMany
   */
  export type adminFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the admin
     */
    select?: adminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the admin
     */
    omit?: adminOmit<ExtArgs> | null
    /**
     * Filter, which admins to fetch.
     */
    where?: adminWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of admins to fetch.
     */
    orderBy?: adminOrderByWithRelationInput | adminOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing admins.
     */
    cursor?: adminWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` admins from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` admins.
     */
    skip?: number
    distinct?: AdminScalarFieldEnum | AdminScalarFieldEnum[]
  }

  /**
   * admin create
   */
  export type adminCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the admin
     */
    select?: adminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the admin
     */
    omit?: adminOmit<ExtArgs> | null
    /**
     * The data needed to create a admin.
     */
    data: XOR<adminCreateInput, adminUncheckedCreateInput>
  }

  /**
   * admin createMany
   */
  export type adminCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many admins.
     */
    data: adminCreateManyInput | adminCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * admin update
   */
  export type adminUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the admin
     */
    select?: adminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the admin
     */
    omit?: adminOmit<ExtArgs> | null
    /**
     * The data needed to update a admin.
     */
    data: XOR<adminUpdateInput, adminUncheckedUpdateInput>
    /**
     * Choose, which admin to update.
     */
    where: adminWhereUniqueInput
  }

  /**
   * admin updateMany
   */
  export type adminUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update admins.
     */
    data: XOR<adminUpdateManyMutationInput, adminUncheckedUpdateManyInput>
    /**
     * Filter which admins to update
     */
    where?: adminWhereInput
    /**
     * Limit how many admins to update.
     */
    limit?: number
  }

  /**
   * admin upsert
   */
  export type adminUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the admin
     */
    select?: adminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the admin
     */
    omit?: adminOmit<ExtArgs> | null
    /**
     * The filter to search for the admin to update in case it exists.
     */
    where: adminWhereUniqueInput
    /**
     * In case the admin found by the `where` argument doesn't exist, create a new admin with this data.
     */
    create: XOR<adminCreateInput, adminUncheckedCreateInput>
    /**
     * In case the admin was found with the provided `where` argument, update it with this data.
     */
    update: XOR<adminUpdateInput, adminUncheckedUpdateInput>
  }

  /**
   * admin delete
   */
  export type adminDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the admin
     */
    select?: adminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the admin
     */
    omit?: adminOmit<ExtArgs> | null
    /**
     * Filter which admin to delete.
     */
    where: adminWhereUniqueInput
  }

  /**
   * admin deleteMany
   */
  export type adminDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which admins to delete
     */
    where?: adminWhereInput
    /**
     * Limit how many admins to delete.
     */
    limit?: number
  }

  /**
   * admin without action
   */
  export type adminDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the admin
     */
    select?: adminSelect<ExtArgs> | null
    /**
     * Omit specific fields from the admin
     */
    omit?: adminOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const CuentascompartidasScalarFieldEnum: {
    id: 'id',
    correo: 'correo',
    contrasena: 'contrasena',
    proveedor: 'proveedor',
    plataforma_id: 'plataforma_id',
    cuenta_caida: 'cuenta_caida'
  };

  export type CuentascompartidasScalarFieldEnum = (typeof CuentascompartidasScalarFieldEnum)[keyof typeof CuentascompartidasScalarFieldEnum]


  export const CuentascompletasScalarFieldEnum: {
    id: 'id',
    contacto: 'contacto',
    plataforma_id: 'plataforma_id',
    proveedor: 'proveedor',
    fecha_compra: 'fecha_compra',
    fecha_vencimiento: 'fecha_vencimiento',
    meses_pagados: 'meses_pagados',
    total_pagado_completa: 'total_pagado_completa',
    estado: 'estado',
    comentario: 'comentario',
    contrasena: 'contrasena',
    correo: 'correo',
    total_ganado: 'total_ganado',
    total_pagado_proveedor_completa: 'total_pagado_proveedor_completa'
  };

  export type CuentascompletasScalarFieldEnum = (typeof CuentascompletasScalarFieldEnum)[keyof typeof CuentascompletasScalarFieldEnum]


  export const PantallasScalarFieldEnum: {
    id: 'id',
    cuenta_id: 'cuenta_id',
    contacto: 'contacto',
    nro_pantalla: 'nro_pantalla',
    fecha_compra: 'fecha_compra',
    fecha_vencimiento: 'fecha_vencimiento',
    meses_pagados: 'meses_pagados',
    total_pagado: 'total_pagado',
    estado: 'estado',
    comentario: 'comentario',
    total_ganado: 'total_ganado',
    total_pagado_proveedor: 'total_pagado_proveedor'
  };

  export type PantallasScalarFieldEnum = (typeof PantallasScalarFieldEnum)[keyof typeof PantallasScalarFieldEnum]


  export const PlataformasScalarFieldEnum: {
    id: 'id',
    nombre: 'nombre',
    cantidad_pantallas: 'cantidad_pantallas',
    total_pagado_proveedor: 'total_pagado_proveedor',
    total_pagado: 'total_pagado',
    total_pagado_completa: 'total_pagado_completa',
    total_pagado_proveedor_completa: 'total_pagado_proveedor_completa'
  };

  export type PlataformasScalarFieldEnum = (typeof PlataformasScalarFieldEnum)[keyof typeof PlataformasScalarFieldEnum]


  export const UsuariosScalarFieldEnum: {
    contacto: 'contacto',
    nombre: 'nombre'
  };

  export type UsuariosScalarFieldEnum = (typeof UsuariosScalarFieldEnum)[keyof typeof UsuariosScalarFieldEnum]


  export const Wa_notificacionesScalarFieldEnum: {
    id: 'id',
    phone: 'phone',
    fecha: 'fecha',
    createdAt: 'createdAt'
  };

  export type Wa_notificacionesScalarFieldEnum = (typeof Wa_notificacionesScalarFieldEnum)[keyof typeof Wa_notificacionesScalarFieldEnum]


  export const Wa_logsScalarFieldEnum: {
    id: 'id',
    phone: 'phone',
    status: 'status',
    message: 'message',
    createdAt: 'createdAt'
  };

  export type Wa_logsScalarFieldEnum = (typeof Wa_logsScalarFieldEnum)[keyof typeof Wa_logsScalarFieldEnum]


  export const InventarioScalarFieldEnum: {
    id: 'id',
    plataforma_id: 'plataforma_id',
    correo: 'correo',
    clave: 'clave'
  };

  export type InventarioScalarFieldEnum = (typeof InventarioScalarFieldEnum)[keyof typeof InventarioScalarFieldEnum]


  export const MetricasmensualesScalarFieldEnum: {
    id: 'id',
    year: 'year',
    month: 'month',
    periodLabel: 'periodLabel',
    totalGeneral: 'totalGeneral',
    totalPantallas: 'totalPantallas',
    totalCuentas: 'totalCuentas',
    ventasCantidad: 'ventasCantidad',
    clientesActivos: 'clientesActivos',
    ranking: 'ranking',
    ventasDias: 'ventasDias',
    payload: 'payload',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type MetricasmensualesScalarFieldEnum = (typeof MetricasmensualesScalarFieldEnum)[keyof typeof MetricasmensualesScalarFieldEnum]


  export const AdminScalarFieldEnum: {
    id: 'id',
    usuario: 'usuario',
    contrasena: 'contrasena',
    creado_en: 'creado_en'
  };

  export type AdminScalarFieldEnum = (typeof AdminScalarFieldEnum)[keyof typeof AdminScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const cuentascompartidasOrderByRelevanceFieldEnum: {
    correo: 'correo',
    contrasena: 'contrasena',
    proveedor: 'proveedor'
  };

  export type cuentascompartidasOrderByRelevanceFieldEnum = (typeof cuentascompartidasOrderByRelevanceFieldEnum)[keyof typeof cuentascompartidasOrderByRelevanceFieldEnum]


  export const cuentascompletasOrderByRelevanceFieldEnum: {
    contacto: 'contacto',
    proveedor: 'proveedor',
    estado: 'estado',
    comentario: 'comentario',
    contrasena: 'contrasena',
    correo: 'correo'
  };

  export type cuentascompletasOrderByRelevanceFieldEnum = (typeof cuentascompletasOrderByRelevanceFieldEnum)[keyof typeof cuentascompletasOrderByRelevanceFieldEnum]


  export const pantallasOrderByRelevanceFieldEnum: {
    contacto: 'contacto',
    nro_pantalla: 'nro_pantalla',
    estado: 'estado',
    comentario: 'comentario'
  };

  export type pantallasOrderByRelevanceFieldEnum = (typeof pantallasOrderByRelevanceFieldEnum)[keyof typeof pantallasOrderByRelevanceFieldEnum]


  export const plataformasOrderByRelevanceFieldEnum: {
    nombre: 'nombre'
  };

  export type plataformasOrderByRelevanceFieldEnum = (typeof plataformasOrderByRelevanceFieldEnum)[keyof typeof plataformasOrderByRelevanceFieldEnum]


  export const usuariosOrderByRelevanceFieldEnum: {
    contacto: 'contacto',
    nombre: 'nombre'
  };

  export type usuariosOrderByRelevanceFieldEnum = (typeof usuariosOrderByRelevanceFieldEnum)[keyof typeof usuariosOrderByRelevanceFieldEnum]


  export const wa_notificacionesOrderByRelevanceFieldEnum: {
    phone: 'phone'
  };

  export type wa_notificacionesOrderByRelevanceFieldEnum = (typeof wa_notificacionesOrderByRelevanceFieldEnum)[keyof typeof wa_notificacionesOrderByRelevanceFieldEnum]


  export const wa_logsOrderByRelevanceFieldEnum: {
    phone: 'phone',
    message: 'message'
  };

  export type wa_logsOrderByRelevanceFieldEnum = (typeof wa_logsOrderByRelevanceFieldEnum)[keyof typeof wa_logsOrderByRelevanceFieldEnum]


  export const inventarioOrderByRelevanceFieldEnum: {
    correo: 'correo',
    clave: 'clave'
  };

  export type inventarioOrderByRelevanceFieldEnum = (typeof inventarioOrderByRelevanceFieldEnum)[keyof typeof inventarioOrderByRelevanceFieldEnum]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const metricasmensualesOrderByRelevanceFieldEnum: {
    periodLabel: 'periodLabel'
  };

  export type metricasmensualesOrderByRelevanceFieldEnum = (typeof metricasmensualesOrderByRelevanceFieldEnum)[keyof typeof metricasmensualesOrderByRelevanceFieldEnum]


  export const adminOrderByRelevanceFieldEnum: {
    usuario: 'usuario',
    contrasena: 'contrasena'
  };

  export type adminOrderByRelevanceFieldEnum = (typeof adminOrderByRelevanceFieldEnum)[keyof typeof adminOrderByRelevanceFieldEnum]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'BigInt'
   */
  export type BigIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'BigInt'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'Decimal'
   */
  export type DecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal'>
    


  /**
   * Reference to a field of type 'LogStatus'
   */
  export type EnumLogStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'LogStatus'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    
  /**
   * Deep Input Types
   */


  export type cuentascompartidasWhereInput = {
    AND?: cuentascompartidasWhereInput | cuentascompartidasWhereInput[]
    OR?: cuentascompartidasWhereInput[]
    NOT?: cuentascompartidasWhereInput | cuentascompartidasWhereInput[]
    id?: IntFilter<"cuentascompartidas"> | number
    correo?: StringFilter<"cuentascompartidas"> | string
    contrasena?: StringFilter<"cuentascompartidas"> | string
    proveedor?: StringNullableFilter<"cuentascompartidas"> | string | null
    plataforma_id?: IntNullableFilter<"cuentascompartidas"> | number | null
    cuenta_caida?: BoolFilter<"cuentascompartidas"> | boolean
    plataformas?: XOR<PlataformasNullableScalarRelationFilter, plataformasWhereInput> | null
    pantallas?: PantallasListRelationFilter
  }

  export type cuentascompartidasOrderByWithRelationInput = {
    id?: SortOrder
    correo?: SortOrder
    contrasena?: SortOrder
    proveedor?: SortOrderInput | SortOrder
    plataforma_id?: SortOrderInput | SortOrder
    cuenta_caida?: SortOrder
    plataformas?: plataformasOrderByWithRelationInput
    pantallas?: pantallasOrderByRelationAggregateInput
    _relevance?: cuentascompartidasOrderByRelevanceInput
  }

  export type cuentascompartidasWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: cuentascompartidasWhereInput | cuentascompartidasWhereInput[]
    OR?: cuentascompartidasWhereInput[]
    NOT?: cuentascompartidasWhereInput | cuentascompartidasWhereInput[]
    correo?: StringFilter<"cuentascompartidas"> | string
    contrasena?: StringFilter<"cuentascompartidas"> | string
    proveedor?: StringNullableFilter<"cuentascompartidas"> | string | null
    plataforma_id?: IntNullableFilter<"cuentascompartidas"> | number | null
    cuenta_caida?: BoolFilter<"cuentascompartidas"> | boolean
    plataformas?: XOR<PlataformasNullableScalarRelationFilter, plataformasWhereInput> | null
    pantallas?: PantallasListRelationFilter
  }, "id">

  export type cuentascompartidasOrderByWithAggregationInput = {
    id?: SortOrder
    correo?: SortOrder
    contrasena?: SortOrder
    proveedor?: SortOrderInput | SortOrder
    plataforma_id?: SortOrderInput | SortOrder
    cuenta_caida?: SortOrder
    _count?: cuentascompartidasCountOrderByAggregateInput
    _avg?: cuentascompartidasAvgOrderByAggregateInput
    _max?: cuentascompartidasMaxOrderByAggregateInput
    _min?: cuentascompartidasMinOrderByAggregateInput
    _sum?: cuentascompartidasSumOrderByAggregateInput
  }

  export type cuentascompartidasScalarWhereWithAggregatesInput = {
    AND?: cuentascompartidasScalarWhereWithAggregatesInput | cuentascompartidasScalarWhereWithAggregatesInput[]
    OR?: cuentascompartidasScalarWhereWithAggregatesInput[]
    NOT?: cuentascompartidasScalarWhereWithAggregatesInput | cuentascompartidasScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"cuentascompartidas"> | number
    correo?: StringWithAggregatesFilter<"cuentascompartidas"> | string
    contrasena?: StringWithAggregatesFilter<"cuentascompartidas"> | string
    proveedor?: StringNullableWithAggregatesFilter<"cuentascompartidas"> | string | null
    plataforma_id?: IntNullableWithAggregatesFilter<"cuentascompartidas"> | number | null
    cuenta_caida?: BoolWithAggregatesFilter<"cuentascompartidas"> | boolean
  }

  export type cuentascompletasWhereInput = {
    AND?: cuentascompletasWhereInput | cuentascompletasWhereInput[]
    OR?: cuentascompletasWhereInput[]
    NOT?: cuentascompletasWhereInput | cuentascompletasWhereInput[]
    id?: BigIntFilter<"cuentascompletas"> | bigint | number
    contacto?: StringFilter<"cuentascompletas"> | string
    plataforma_id?: IntFilter<"cuentascompletas"> | number
    proveedor?: StringNullableFilter<"cuentascompletas"> | string | null
    fecha_compra?: DateTimeNullableFilter<"cuentascompletas"> | Date | string | null
    fecha_vencimiento?: DateTimeNullableFilter<"cuentascompletas"> | Date | string | null
    meses_pagados?: IntNullableFilter<"cuentascompletas"> | number | null
    total_pagado_completa?: DecimalNullableFilter<"cuentascompletas"> | Decimal | DecimalJsLike | number | string | null
    estado?: StringNullableFilter<"cuentascompletas"> | string | null
    comentario?: StringNullableFilter<"cuentascompletas"> | string | null
    contrasena?: StringFilter<"cuentascompletas"> | string
    correo?: StringFilter<"cuentascompletas"> | string
    total_ganado?: DecimalNullableFilter<"cuentascompletas"> | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: DecimalNullableFilter<"cuentascompletas"> | Decimal | DecimalJsLike | number | string | null
    plataformas?: XOR<PlataformasScalarRelationFilter, plataformasWhereInput>
    usuarios?: XOR<UsuariosScalarRelationFilter, usuariosWhereInput>
  }

  export type cuentascompletasOrderByWithRelationInput = {
    id?: SortOrder
    contacto?: SortOrder
    plataforma_id?: SortOrder
    proveedor?: SortOrderInput | SortOrder
    fecha_compra?: SortOrderInput | SortOrder
    fecha_vencimiento?: SortOrderInput | SortOrder
    meses_pagados?: SortOrderInput | SortOrder
    total_pagado_completa?: SortOrderInput | SortOrder
    estado?: SortOrderInput | SortOrder
    comentario?: SortOrderInput | SortOrder
    contrasena?: SortOrder
    correo?: SortOrder
    total_ganado?: SortOrderInput | SortOrder
    total_pagado_proveedor_completa?: SortOrderInput | SortOrder
    plataformas?: plataformasOrderByWithRelationInput
    usuarios?: usuariosOrderByWithRelationInput
    _relevance?: cuentascompletasOrderByRelevanceInput
  }

  export type cuentascompletasWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    AND?: cuentascompletasWhereInput | cuentascompletasWhereInput[]
    OR?: cuentascompletasWhereInput[]
    NOT?: cuentascompletasWhereInput | cuentascompletasWhereInput[]
    contacto?: StringFilter<"cuentascompletas"> | string
    plataforma_id?: IntFilter<"cuentascompletas"> | number
    proveedor?: StringNullableFilter<"cuentascompletas"> | string | null
    fecha_compra?: DateTimeNullableFilter<"cuentascompletas"> | Date | string | null
    fecha_vencimiento?: DateTimeNullableFilter<"cuentascompletas"> | Date | string | null
    meses_pagados?: IntNullableFilter<"cuentascompletas"> | number | null
    total_pagado_completa?: DecimalNullableFilter<"cuentascompletas"> | Decimal | DecimalJsLike | number | string | null
    estado?: StringNullableFilter<"cuentascompletas"> | string | null
    comentario?: StringNullableFilter<"cuentascompletas"> | string | null
    contrasena?: StringFilter<"cuentascompletas"> | string
    correo?: StringFilter<"cuentascompletas"> | string
    total_ganado?: DecimalNullableFilter<"cuentascompletas"> | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: DecimalNullableFilter<"cuentascompletas"> | Decimal | DecimalJsLike | number | string | null
    plataformas?: XOR<PlataformasScalarRelationFilter, plataformasWhereInput>
    usuarios?: XOR<UsuariosScalarRelationFilter, usuariosWhereInput>
  }, "id">

  export type cuentascompletasOrderByWithAggregationInput = {
    id?: SortOrder
    contacto?: SortOrder
    plataforma_id?: SortOrder
    proveedor?: SortOrderInput | SortOrder
    fecha_compra?: SortOrderInput | SortOrder
    fecha_vencimiento?: SortOrderInput | SortOrder
    meses_pagados?: SortOrderInput | SortOrder
    total_pagado_completa?: SortOrderInput | SortOrder
    estado?: SortOrderInput | SortOrder
    comentario?: SortOrderInput | SortOrder
    contrasena?: SortOrder
    correo?: SortOrder
    total_ganado?: SortOrderInput | SortOrder
    total_pagado_proveedor_completa?: SortOrderInput | SortOrder
    _count?: cuentascompletasCountOrderByAggregateInput
    _avg?: cuentascompletasAvgOrderByAggregateInput
    _max?: cuentascompletasMaxOrderByAggregateInput
    _min?: cuentascompletasMinOrderByAggregateInput
    _sum?: cuentascompletasSumOrderByAggregateInput
  }

  export type cuentascompletasScalarWhereWithAggregatesInput = {
    AND?: cuentascompletasScalarWhereWithAggregatesInput | cuentascompletasScalarWhereWithAggregatesInput[]
    OR?: cuentascompletasScalarWhereWithAggregatesInput[]
    NOT?: cuentascompletasScalarWhereWithAggregatesInput | cuentascompletasScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"cuentascompletas"> | bigint | number
    contacto?: StringWithAggregatesFilter<"cuentascompletas"> | string
    plataforma_id?: IntWithAggregatesFilter<"cuentascompletas"> | number
    proveedor?: StringNullableWithAggregatesFilter<"cuentascompletas"> | string | null
    fecha_compra?: DateTimeNullableWithAggregatesFilter<"cuentascompletas"> | Date | string | null
    fecha_vencimiento?: DateTimeNullableWithAggregatesFilter<"cuentascompletas"> | Date | string | null
    meses_pagados?: IntNullableWithAggregatesFilter<"cuentascompletas"> | number | null
    total_pagado_completa?: DecimalNullableWithAggregatesFilter<"cuentascompletas"> | Decimal | DecimalJsLike | number | string | null
    estado?: StringNullableWithAggregatesFilter<"cuentascompletas"> | string | null
    comentario?: StringNullableWithAggregatesFilter<"cuentascompletas"> | string | null
    contrasena?: StringWithAggregatesFilter<"cuentascompletas"> | string
    correo?: StringWithAggregatesFilter<"cuentascompletas"> | string
    total_ganado?: DecimalNullableWithAggregatesFilter<"cuentascompletas"> | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: DecimalNullableWithAggregatesFilter<"cuentascompletas"> | Decimal | DecimalJsLike | number | string | null
  }

  export type pantallasWhereInput = {
    AND?: pantallasWhereInput | pantallasWhereInput[]
    OR?: pantallasWhereInput[]
    NOT?: pantallasWhereInput | pantallasWhereInput[]
    id?: IntFilter<"pantallas"> | number
    cuenta_id?: IntFilter<"pantallas"> | number
    contacto?: StringFilter<"pantallas"> | string
    nro_pantalla?: StringFilter<"pantallas"> | string
    fecha_compra?: DateTimeFilter<"pantallas"> | Date | string
    fecha_vencimiento?: DateTimeFilter<"pantallas"> | Date | string
    meses_pagados?: IntNullableFilter<"pantallas"> | number | null
    total_pagado?: DecimalNullableFilter<"pantallas"> | Decimal | DecimalJsLike | number | string | null
    estado?: StringFilter<"pantallas"> | string
    comentario?: StringNullableFilter<"pantallas"> | string | null
    total_ganado?: DecimalNullableFilter<"pantallas"> | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor?: DecimalNullableFilter<"pantallas"> | Decimal | DecimalJsLike | number | string | null
    usuarios?: XOR<UsuariosScalarRelationFilter, usuariosWhereInput>
    cuentascompartidas?: XOR<CuentascompartidasScalarRelationFilter, cuentascompartidasWhereInput>
  }

  export type pantallasOrderByWithRelationInput = {
    id?: SortOrder
    cuenta_id?: SortOrder
    contacto?: SortOrder
    nro_pantalla?: SortOrder
    fecha_compra?: SortOrder
    fecha_vencimiento?: SortOrder
    meses_pagados?: SortOrderInput | SortOrder
    total_pagado?: SortOrderInput | SortOrder
    estado?: SortOrder
    comentario?: SortOrderInput | SortOrder
    total_ganado?: SortOrderInput | SortOrder
    total_pagado_proveedor?: SortOrderInput | SortOrder
    usuarios?: usuariosOrderByWithRelationInput
    cuentascompartidas?: cuentascompartidasOrderByWithRelationInput
    _relevance?: pantallasOrderByRelevanceInput
  }

  export type pantallasWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: pantallasWhereInput | pantallasWhereInput[]
    OR?: pantallasWhereInput[]
    NOT?: pantallasWhereInput | pantallasWhereInput[]
    cuenta_id?: IntFilter<"pantallas"> | number
    contacto?: StringFilter<"pantallas"> | string
    nro_pantalla?: StringFilter<"pantallas"> | string
    fecha_compra?: DateTimeFilter<"pantallas"> | Date | string
    fecha_vencimiento?: DateTimeFilter<"pantallas"> | Date | string
    meses_pagados?: IntNullableFilter<"pantallas"> | number | null
    total_pagado?: DecimalNullableFilter<"pantallas"> | Decimal | DecimalJsLike | number | string | null
    estado?: StringFilter<"pantallas"> | string
    comentario?: StringNullableFilter<"pantallas"> | string | null
    total_ganado?: DecimalNullableFilter<"pantallas"> | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor?: DecimalNullableFilter<"pantallas"> | Decimal | DecimalJsLike | number | string | null
    usuarios?: XOR<UsuariosScalarRelationFilter, usuariosWhereInput>
    cuentascompartidas?: XOR<CuentascompartidasScalarRelationFilter, cuentascompartidasWhereInput>
  }, "id">

  export type pantallasOrderByWithAggregationInput = {
    id?: SortOrder
    cuenta_id?: SortOrder
    contacto?: SortOrder
    nro_pantalla?: SortOrder
    fecha_compra?: SortOrder
    fecha_vencimiento?: SortOrder
    meses_pagados?: SortOrderInput | SortOrder
    total_pagado?: SortOrderInput | SortOrder
    estado?: SortOrder
    comentario?: SortOrderInput | SortOrder
    total_ganado?: SortOrderInput | SortOrder
    total_pagado_proveedor?: SortOrderInput | SortOrder
    _count?: pantallasCountOrderByAggregateInput
    _avg?: pantallasAvgOrderByAggregateInput
    _max?: pantallasMaxOrderByAggregateInput
    _min?: pantallasMinOrderByAggregateInput
    _sum?: pantallasSumOrderByAggregateInput
  }

  export type pantallasScalarWhereWithAggregatesInput = {
    AND?: pantallasScalarWhereWithAggregatesInput | pantallasScalarWhereWithAggregatesInput[]
    OR?: pantallasScalarWhereWithAggregatesInput[]
    NOT?: pantallasScalarWhereWithAggregatesInput | pantallasScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"pantallas"> | number
    cuenta_id?: IntWithAggregatesFilter<"pantallas"> | number
    contacto?: StringWithAggregatesFilter<"pantallas"> | string
    nro_pantalla?: StringWithAggregatesFilter<"pantallas"> | string
    fecha_compra?: DateTimeWithAggregatesFilter<"pantallas"> | Date | string
    fecha_vencimiento?: DateTimeWithAggregatesFilter<"pantallas"> | Date | string
    meses_pagados?: IntNullableWithAggregatesFilter<"pantallas"> | number | null
    total_pagado?: DecimalNullableWithAggregatesFilter<"pantallas"> | Decimal | DecimalJsLike | number | string | null
    estado?: StringWithAggregatesFilter<"pantallas"> | string
    comentario?: StringNullableWithAggregatesFilter<"pantallas"> | string | null
    total_ganado?: DecimalNullableWithAggregatesFilter<"pantallas"> | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor?: DecimalNullableWithAggregatesFilter<"pantallas"> | Decimal | DecimalJsLike | number | string | null
  }

  export type plataformasWhereInput = {
    AND?: plataformasWhereInput | plataformasWhereInput[]
    OR?: plataformasWhereInput[]
    NOT?: plataformasWhereInput | plataformasWhereInput[]
    id?: IntFilter<"plataformas"> | number
    nombre?: StringFilter<"plataformas"> | string
    cantidad_pantallas?: IntFilter<"plataformas"> | number
    total_pagado_proveedor?: DecimalNullableFilter<"plataformas"> | Decimal | DecimalJsLike | number | string | null
    total_pagado?: DecimalNullableFilter<"plataformas"> | Decimal | DecimalJsLike | number | string | null
    total_pagado_completa?: DecimalNullableFilter<"plataformas"> | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: DecimalNullableFilter<"plataformas"> | Decimal | DecimalJsLike | number | string | null
    cuentascompartidas?: CuentascompartidasListRelationFilter
    cuentascompletas?: CuentascompletasListRelationFilter
    inventario?: InventarioListRelationFilter
  }

  export type plataformasOrderByWithRelationInput = {
    id?: SortOrder
    nombre?: SortOrder
    cantidad_pantallas?: SortOrder
    total_pagado_proveedor?: SortOrderInput | SortOrder
    total_pagado?: SortOrderInput | SortOrder
    total_pagado_completa?: SortOrderInput | SortOrder
    total_pagado_proveedor_completa?: SortOrderInput | SortOrder
    cuentascompartidas?: cuentascompartidasOrderByRelationAggregateInput
    cuentascompletas?: cuentascompletasOrderByRelationAggregateInput
    inventario?: inventarioOrderByRelationAggregateInput
    _relevance?: plataformasOrderByRelevanceInput
  }

  export type plataformasWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    nombre?: string
    AND?: plataformasWhereInput | plataformasWhereInput[]
    OR?: plataformasWhereInput[]
    NOT?: plataformasWhereInput | plataformasWhereInput[]
    cantidad_pantallas?: IntFilter<"plataformas"> | number
    total_pagado_proveedor?: DecimalNullableFilter<"plataformas"> | Decimal | DecimalJsLike | number | string | null
    total_pagado?: DecimalNullableFilter<"plataformas"> | Decimal | DecimalJsLike | number | string | null
    total_pagado_completa?: DecimalNullableFilter<"plataformas"> | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: DecimalNullableFilter<"plataformas"> | Decimal | DecimalJsLike | number | string | null
    cuentascompartidas?: CuentascompartidasListRelationFilter
    cuentascompletas?: CuentascompletasListRelationFilter
    inventario?: InventarioListRelationFilter
  }, "id" | "nombre">

  export type plataformasOrderByWithAggregationInput = {
    id?: SortOrder
    nombre?: SortOrder
    cantidad_pantallas?: SortOrder
    total_pagado_proveedor?: SortOrderInput | SortOrder
    total_pagado?: SortOrderInput | SortOrder
    total_pagado_completa?: SortOrderInput | SortOrder
    total_pagado_proveedor_completa?: SortOrderInput | SortOrder
    _count?: plataformasCountOrderByAggregateInput
    _avg?: plataformasAvgOrderByAggregateInput
    _max?: plataformasMaxOrderByAggregateInput
    _min?: plataformasMinOrderByAggregateInput
    _sum?: plataformasSumOrderByAggregateInput
  }

  export type plataformasScalarWhereWithAggregatesInput = {
    AND?: plataformasScalarWhereWithAggregatesInput | plataformasScalarWhereWithAggregatesInput[]
    OR?: plataformasScalarWhereWithAggregatesInput[]
    NOT?: plataformasScalarWhereWithAggregatesInput | plataformasScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"plataformas"> | number
    nombre?: StringWithAggregatesFilter<"plataformas"> | string
    cantidad_pantallas?: IntWithAggregatesFilter<"plataformas"> | number
    total_pagado_proveedor?: DecimalNullableWithAggregatesFilter<"plataformas"> | Decimal | DecimalJsLike | number | string | null
    total_pagado?: DecimalNullableWithAggregatesFilter<"plataformas"> | Decimal | DecimalJsLike | number | string | null
    total_pagado_completa?: DecimalNullableWithAggregatesFilter<"plataformas"> | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: DecimalNullableWithAggregatesFilter<"plataformas"> | Decimal | DecimalJsLike | number | string | null
  }

  export type usuariosWhereInput = {
    AND?: usuariosWhereInput | usuariosWhereInput[]
    OR?: usuariosWhereInput[]
    NOT?: usuariosWhereInput | usuariosWhereInput[]
    contacto?: StringFilter<"usuarios"> | string
    nombre?: StringNullableFilter<"usuarios"> | string | null
    cuentascompletas?: CuentascompletasListRelationFilter
    pantallas?: PantallasListRelationFilter
  }

  export type usuariosOrderByWithRelationInput = {
    contacto?: SortOrder
    nombre?: SortOrderInput | SortOrder
    cuentascompletas?: cuentascompletasOrderByRelationAggregateInput
    pantallas?: pantallasOrderByRelationAggregateInput
    _relevance?: usuariosOrderByRelevanceInput
  }

  export type usuariosWhereUniqueInput = Prisma.AtLeast<{
    contacto?: string
    AND?: usuariosWhereInput | usuariosWhereInput[]
    OR?: usuariosWhereInput[]
    NOT?: usuariosWhereInput | usuariosWhereInput[]
    nombre?: StringNullableFilter<"usuarios"> | string | null
    cuentascompletas?: CuentascompletasListRelationFilter
    pantallas?: PantallasListRelationFilter
  }, "contacto" | "contacto">

  export type usuariosOrderByWithAggregationInput = {
    contacto?: SortOrder
    nombre?: SortOrderInput | SortOrder
    _count?: usuariosCountOrderByAggregateInput
    _max?: usuariosMaxOrderByAggregateInput
    _min?: usuariosMinOrderByAggregateInput
  }

  export type usuariosScalarWhereWithAggregatesInput = {
    AND?: usuariosScalarWhereWithAggregatesInput | usuariosScalarWhereWithAggregatesInput[]
    OR?: usuariosScalarWhereWithAggregatesInput[]
    NOT?: usuariosScalarWhereWithAggregatesInput | usuariosScalarWhereWithAggregatesInput[]
    contacto?: StringWithAggregatesFilter<"usuarios"> | string
    nombre?: StringNullableWithAggregatesFilter<"usuarios"> | string | null
  }

  export type wa_notificacionesWhereInput = {
    AND?: wa_notificacionesWhereInput | wa_notificacionesWhereInput[]
    OR?: wa_notificacionesWhereInput[]
    NOT?: wa_notificacionesWhereInput | wa_notificacionesWhereInput[]
    id?: BigIntFilter<"wa_notificaciones"> | bigint | number
    phone?: StringFilter<"wa_notificaciones"> | string
    fecha?: DateTimeFilter<"wa_notificaciones"> | Date | string
    createdAt?: DateTimeFilter<"wa_notificaciones"> | Date | string
  }

  export type wa_notificacionesOrderByWithRelationInput = {
    id?: SortOrder
    phone?: SortOrder
    fecha?: SortOrder
    createdAt?: SortOrder
    _relevance?: wa_notificacionesOrderByRelevanceInput
  }

  export type wa_notificacionesWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    uq_phone_fecha?: wa_notificacionesUq_phone_fechaCompoundUniqueInput
    AND?: wa_notificacionesWhereInput | wa_notificacionesWhereInput[]
    OR?: wa_notificacionesWhereInput[]
    NOT?: wa_notificacionesWhereInput | wa_notificacionesWhereInput[]
    phone?: StringFilter<"wa_notificaciones"> | string
    fecha?: DateTimeFilter<"wa_notificaciones"> | Date | string
    createdAt?: DateTimeFilter<"wa_notificaciones"> | Date | string
  }, "id" | "uq_phone_fecha">

  export type wa_notificacionesOrderByWithAggregationInput = {
    id?: SortOrder
    phone?: SortOrder
    fecha?: SortOrder
    createdAt?: SortOrder
    _count?: wa_notificacionesCountOrderByAggregateInput
    _avg?: wa_notificacionesAvgOrderByAggregateInput
    _max?: wa_notificacionesMaxOrderByAggregateInput
    _min?: wa_notificacionesMinOrderByAggregateInput
    _sum?: wa_notificacionesSumOrderByAggregateInput
  }

  export type wa_notificacionesScalarWhereWithAggregatesInput = {
    AND?: wa_notificacionesScalarWhereWithAggregatesInput | wa_notificacionesScalarWhereWithAggregatesInput[]
    OR?: wa_notificacionesScalarWhereWithAggregatesInput[]
    NOT?: wa_notificacionesScalarWhereWithAggregatesInput | wa_notificacionesScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"wa_notificaciones"> | bigint | number
    phone?: StringWithAggregatesFilter<"wa_notificaciones"> | string
    fecha?: DateTimeWithAggregatesFilter<"wa_notificaciones"> | Date | string
    createdAt?: DateTimeWithAggregatesFilter<"wa_notificaciones"> | Date | string
  }

  export type wa_logsWhereInput = {
    AND?: wa_logsWhereInput | wa_logsWhereInput[]
    OR?: wa_logsWhereInput[]
    NOT?: wa_logsWhereInput | wa_logsWhereInput[]
    id?: BigIntFilter<"wa_logs"> | bigint | number
    phone?: StringFilter<"wa_logs"> | string
    status?: EnumLogStatusFilter<"wa_logs"> | $Enums.LogStatus
    message?: StringNullableFilter<"wa_logs"> | string | null
    createdAt?: DateTimeFilter<"wa_logs"> | Date | string
  }

  export type wa_logsOrderByWithRelationInput = {
    id?: SortOrder
    phone?: SortOrder
    status?: SortOrder
    message?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _relevance?: wa_logsOrderByRelevanceInput
  }

  export type wa_logsWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    AND?: wa_logsWhereInput | wa_logsWhereInput[]
    OR?: wa_logsWhereInput[]
    NOT?: wa_logsWhereInput | wa_logsWhereInput[]
    phone?: StringFilter<"wa_logs"> | string
    status?: EnumLogStatusFilter<"wa_logs"> | $Enums.LogStatus
    message?: StringNullableFilter<"wa_logs"> | string | null
    createdAt?: DateTimeFilter<"wa_logs"> | Date | string
  }, "id">

  export type wa_logsOrderByWithAggregationInput = {
    id?: SortOrder
    phone?: SortOrder
    status?: SortOrder
    message?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: wa_logsCountOrderByAggregateInput
    _avg?: wa_logsAvgOrderByAggregateInput
    _max?: wa_logsMaxOrderByAggregateInput
    _min?: wa_logsMinOrderByAggregateInput
    _sum?: wa_logsSumOrderByAggregateInput
  }

  export type wa_logsScalarWhereWithAggregatesInput = {
    AND?: wa_logsScalarWhereWithAggregatesInput | wa_logsScalarWhereWithAggregatesInput[]
    OR?: wa_logsScalarWhereWithAggregatesInput[]
    NOT?: wa_logsScalarWhereWithAggregatesInput | wa_logsScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"wa_logs"> | bigint | number
    phone?: StringWithAggregatesFilter<"wa_logs"> | string
    status?: EnumLogStatusWithAggregatesFilter<"wa_logs"> | $Enums.LogStatus
    message?: StringNullableWithAggregatesFilter<"wa_logs"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"wa_logs"> | Date | string
  }

  export type inventarioWhereInput = {
    AND?: inventarioWhereInput | inventarioWhereInput[]
    OR?: inventarioWhereInput[]
    NOT?: inventarioWhereInput | inventarioWhereInput[]
    id?: IntFilter<"inventario"> | number
    plataforma_id?: IntFilter<"inventario"> | number
    correo?: StringFilter<"inventario"> | string
    clave?: StringNullableFilter<"inventario"> | string | null
    plataformas?: XOR<PlataformasScalarRelationFilter, plataformasWhereInput>
  }

  export type inventarioOrderByWithRelationInput = {
    id?: SortOrder
    plataforma_id?: SortOrder
    correo?: SortOrder
    clave?: SortOrderInput | SortOrder
    plataformas?: plataformasOrderByWithRelationInput
    _relevance?: inventarioOrderByRelevanceInput
  }

  export type inventarioWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    plataforma_id_correo?: inventarioPlataforma_idCorreoCompoundUniqueInput
    AND?: inventarioWhereInput | inventarioWhereInput[]
    OR?: inventarioWhereInput[]
    NOT?: inventarioWhereInput | inventarioWhereInput[]
    plataforma_id?: IntFilter<"inventario"> | number
    correo?: StringFilter<"inventario"> | string
    clave?: StringNullableFilter<"inventario"> | string | null
    plataformas?: XOR<PlataformasScalarRelationFilter, plataformasWhereInput>
  }, "id" | "plataforma_id_correo">

  export type inventarioOrderByWithAggregationInput = {
    id?: SortOrder
    plataforma_id?: SortOrder
    correo?: SortOrder
    clave?: SortOrderInput | SortOrder
    _count?: inventarioCountOrderByAggregateInput
    _avg?: inventarioAvgOrderByAggregateInput
    _max?: inventarioMaxOrderByAggregateInput
    _min?: inventarioMinOrderByAggregateInput
    _sum?: inventarioSumOrderByAggregateInput
  }

  export type inventarioScalarWhereWithAggregatesInput = {
    AND?: inventarioScalarWhereWithAggregatesInput | inventarioScalarWhereWithAggregatesInput[]
    OR?: inventarioScalarWhereWithAggregatesInput[]
    NOT?: inventarioScalarWhereWithAggregatesInput | inventarioScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"inventario"> | number
    plataforma_id?: IntWithAggregatesFilter<"inventario"> | number
    correo?: StringWithAggregatesFilter<"inventario"> | string
    clave?: StringNullableWithAggregatesFilter<"inventario"> | string | null
  }

  export type metricasmensualesWhereInput = {
    AND?: metricasmensualesWhereInput | metricasmensualesWhereInput[]
    OR?: metricasmensualesWhereInput[]
    NOT?: metricasmensualesWhereInput | metricasmensualesWhereInput[]
    id?: IntFilter<"metricasmensuales"> | number
    year?: IntFilter<"metricasmensuales"> | number
    month?: IntFilter<"metricasmensuales"> | number
    periodLabel?: StringFilter<"metricasmensuales"> | string
    totalGeneral?: DecimalFilter<"metricasmensuales"> | Decimal | DecimalJsLike | number | string
    totalPantallas?: DecimalFilter<"metricasmensuales"> | Decimal | DecimalJsLike | number | string
    totalCuentas?: DecimalFilter<"metricasmensuales"> | Decimal | DecimalJsLike | number | string
    ventasCantidad?: IntFilter<"metricasmensuales"> | number
    clientesActivos?: IntFilter<"metricasmensuales"> | number
    ranking?: JsonFilter<"metricasmensuales">
    ventasDias?: JsonFilter<"metricasmensuales">
    payload?: JsonNullableFilter<"metricasmensuales">
    createdAt?: DateTimeFilter<"metricasmensuales"> | Date | string
    updatedAt?: DateTimeFilter<"metricasmensuales"> | Date | string
  }

  export type metricasmensualesOrderByWithRelationInput = {
    id?: SortOrder
    year?: SortOrder
    month?: SortOrder
    periodLabel?: SortOrder
    totalGeneral?: SortOrder
    totalPantallas?: SortOrder
    totalCuentas?: SortOrder
    ventasCantidad?: SortOrder
    clientesActivos?: SortOrder
    ranking?: SortOrder
    ventasDias?: SortOrder
    payload?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _relevance?: metricasmensualesOrderByRelevanceInput
  }

  export type metricasmensualesWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    year_month?: metricasmensualesYear_monthCompoundUniqueInput
    AND?: metricasmensualesWhereInput | metricasmensualesWhereInput[]
    OR?: metricasmensualesWhereInput[]
    NOT?: metricasmensualesWhereInput | metricasmensualesWhereInput[]
    year?: IntFilter<"metricasmensuales"> | number
    month?: IntFilter<"metricasmensuales"> | number
    periodLabel?: StringFilter<"metricasmensuales"> | string
    totalGeneral?: DecimalFilter<"metricasmensuales"> | Decimal | DecimalJsLike | number | string
    totalPantallas?: DecimalFilter<"metricasmensuales"> | Decimal | DecimalJsLike | number | string
    totalCuentas?: DecimalFilter<"metricasmensuales"> | Decimal | DecimalJsLike | number | string
    ventasCantidad?: IntFilter<"metricasmensuales"> | number
    clientesActivos?: IntFilter<"metricasmensuales"> | number
    ranking?: JsonFilter<"metricasmensuales">
    ventasDias?: JsonFilter<"metricasmensuales">
    payload?: JsonNullableFilter<"metricasmensuales">
    createdAt?: DateTimeFilter<"metricasmensuales"> | Date | string
    updatedAt?: DateTimeFilter<"metricasmensuales"> | Date | string
  }, "id" | "year_month">

  export type metricasmensualesOrderByWithAggregationInput = {
    id?: SortOrder
    year?: SortOrder
    month?: SortOrder
    periodLabel?: SortOrder
    totalGeneral?: SortOrder
    totalPantallas?: SortOrder
    totalCuentas?: SortOrder
    ventasCantidad?: SortOrder
    clientesActivos?: SortOrder
    ranking?: SortOrder
    ventasDias?: SortOrder
    payload?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: metricasmensualesCountOrderByAggregateInput
    _avg?: metricasmensualesAvgOrderByAggregateInput
    _max?: metricasmensualesMaxOrderByAggregateInput
    _min?: metricasmensualesMinOrderByAggregateInput
    _sum?: metricasmensualesSumOrderByAggregateInput
  }

  export type metricasmensualesScalarWhereWithAggregatesInput = {
    AND?: metricasmensualesScalarWhereWithAggregatesInput | metricasmensualesScalarWhereWithAggregatesInput[]
    OR?: metricasmensualesScalarWhereWithAggregatesInput[]
    NOT?: metricasmensualesScalarWhereWithAggregatesInput | metricasmensualesScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"metricasmensuales"> | number
    year?: IntWithAggregatesFilter<"metricasmensuales"> | number
    month?: IntWithAggregatesFilter<"metricasmensuales"> | number
    periodLabel?: StringWithAggregatesFilter<"metricasmensuales"> | string
    totalGeneral?: DecimalWithAggregatesFilter<"metricasmensuales"> | Decimal | DecimalJsLike | number | string
    totalPantallas?: DecimalWithAggregatesFilter<"metricasmensuales"> | Decimal | DecimalJsLike | number | string
    totalCuentas?: DecimalWithAggregatesFilter<"metricasmensuales"> | Decimal | DecimalJsLike | number | string
    ventasCantidad?: IntWithAggregatesFilter<"metricasmensuales"> | number
    clientesActivos?: IntWithAggregatesFilter<"metricasmensuales"> | number
    ranking?: JsonWithAggregatesFilter<"metricasmensuales">
    ventasDias?: JsonWithAggregatesFilter<"metricasmensuales">
    payload?: JsonNullableWithAggregatesFilter<"metricasmensuales">
    createdAt?: DateTimeWithAggregatesFilter<"metricasmensuales"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"metricasmensuales"> | Date | string
  }

  export type adminWhereInput = {
    AND?: adminWhereInput | adminWhereInput[]
    OR?: adminWhereInput[]
    NOT?: adminWhereInput | adminWhereInput[]
    id?: IntFilter<"admin"> | number
    usuario?: StringFilter<"admin"> | string
    contrasena?: StringFilter<"admin"> | string
    creado_en?: DateTimeFilter<"admin"> | Date | string
  }

  export type adminOrderByWithRelationInput = {
    id?: SortOrder
    usuario?: SortOrder
    contrasena?: SortOrder
    creado_en?: SortOrder
    _relevance?: adminOrderByRelevanceInput
  }

  export type adminWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    usuario?: string
    AND?: adminWhereInput | adminWhereInput[]
    OR?: adminWhereInput[]
    NOT?: adminWhereInput | adminWhereInput[]
    contrasena?: StringFilter<"admin"> | string
    creado_en?: DateTimeFilter<"admin"> | Date | string
  }, "id" | "usuario">

  export type adminOrderByWithAggregationInput = {
    id?: SortOrder
    usuario?: SortOrder
    contrasena?: SortOrder
    creado_en?: SortOrder
    _count?: adminCountOrderByAggregateInput
    _avg?: adminAvgOrderByAggregateInput
    _max?: adminMaxOrderByAggregateInput
    _min?: adminMinOrderByAggregateInput
    _sum?: adminSumOrderByAggregateInput
  }

  export type adminScalarWhereWithAggregatesInput = {
    AND?: adminScalarWhereWithAggregatesInput | adminScalarWhereWithAggregatesInput[]
    OR?: adminScalarWhereWithAggregatesInput[]
    NOT?: adminScalarWhereWithAggregatesInput | adminScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"admin"> | number
    usuario?: StringWithAggregatesFilter<"admin"> | string
    contrasena?: StringWithAggregatesFilter<"admin"> | string
    creado_en?: DateTimeWithAggregatesFilter<"admin"> | Date | string
  }

  export type cuentascompartidasCreateInput = {
    correo: string
    contrasena: string
    proveedor?: string | null
    cuenta_caida?: boolean
    plataformas?: plataformasCreateNestedOneWithoutCuentascompartidasInput
    pantallas?: pantallasCreateNestedManyWithoutCuentascompartidasInput
  }

  export type cuentascompartidasUncheckedCreateInput = {
    id?: number
    correo: string
    contrasena: string
    proveedor?: string | null
    plataforma_id?: number | null
    cuenta_caida?: boolean
    pantallas?: pantallasUncheckedCreateNestedManyWithoutCuentascompartidasInput
  }

  export type cuentascompartidasUpdateInput = {
    correo?: StringFieldUpdateOperationsInput | string
    contrasena?: StringFieldUpdateOperationsInput | string
    proveedor?: NullableStringFieldUpdateOperationsInput | string | null
    cuenta_caida?: BoolFieldUpdateOperationsInput | boolean
    plataformas?: plataformasUpdateOneWithoutCuentascompartidasNestedInput
    pantallas?: pantallasUpdateManyWithoutCuentascompartidasNestedInput
  }

  export type cuentascompartidasUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    correo?: StringFieldUpdateOperationsInput | string
    contrasena?: StringFieldUpdateOperationsInput | string
    proveedor?: NullableStringFieldUpdateOperationsInput | string | null
    plataforma_id?: NullableIntFieldUpdateOperationsInput | number | null
    cuenta_caida?: BoolFieldUpdateOperationsInput | boolean
    pantallas?: pantallasUncheckedUpdateManyWithoutCuentascompartidasNestedInput
  }

  export type cuentascompartidasCreateManyInput = {
    id?: number
    correo: string
    contrasena: string
    proveedor?: string | null
    plataforma_id?: number | null
    cuenta_caida?: boolean
  }

  export type cuentascompartidasUpdateManyMutationInput = {
    correo?: StringFieldUpdateOperationsInput | string
    contrasena?: StringFieldUpdateOperationsInput | string
    proveedor?: NullableStringFieldUpdateOperationsInput | string | null
    cuenta_caida?: BoolFieldUpdateOperationsInput | boolean
  }

  export type cuentascompartidasUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    correo?: StringFieldUpdateOperationsInput | string
    contrasena?: StringFieldUpdateOperationsInput | string
    proveedor?: NullableStringFieldUpdateOperationsInput | string | null
    plataforma_id?: NullableIntFieldUpdateOperationsInput | number | null
    cuenta_caida?: BoolFieldUpdateOperationsInput | boolean
  }

  export type cuentascompletasCreateInput = {
    id?: bigint | number
    proveedor?: string | null
    fecha_compra?: Date | string | null
    fecha_vencimiento?: Date | string | null
    meses_pagados?: number | null
    total_pagado_completa?: Decimal | DecimalJsLike | number | string | null
    estado?: string | null
    comentario?: string | null
    contrasena: string
    correo: string
    total_ganado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: Decimal | DecimalJsLike | number | string | null
    plataformas: plataformasCreateNestedOneWithoutCuentascompletasInput
    usuarios: usuariosCreateNestedOneWithoutCuentascompletasInput
  }

  export type cuentascompletasUncheckedCreateInput = {
    id?: bigint | number
    contacto: string
    plataforma_id: number
    proveedor?: string | null
    fecha_compra?: Date | string | null
    fecha_vencimiento?: Date | string | null
    meses_pagados?: number | null
    total_pagado_completa?: Decimal | DecimalJsLike | number | string | null
    estado?: string | null
    comentario?: string | null
    contrasena: string
    correo: string
    total_ganado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: Decimal | DecimalJsLike | number | string | null
  }

  export type cuentascompletasUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    proveedor?: NullableStringFieldUpdateOperationsInput | string | null
    fecha_compra?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fecha_vencimiento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    meses_pagados?: NullableIntFieldUpdateOperationsInput | number | null
    total_pagado_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    estado?: NullableStringFieldUpdateOperationsInput | string | null
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    contrasena?: StringFieldUpdateOperationsInput | string
    correo?: StringFieldUpdateOperationsInput | string
    total_ganado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    plataformas?: plataformasUpdateOneRequiredWithoutCuentascompletasNestedInput
    usuarios?: usuariosUpdateOneRequiredWithoutCuentascompletasNestedInput
  }

  export type cuentascompletasUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    contacto?: StringFieldUpdateOperationsInput | string
    plataforma_id?: IntFieldUpdateOperationsInput | number
    proveedor?: NullableStringFieldUpdateOperationsInput | string | null
    fecha_compra?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fecha_vencimiento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    meses_pagados?: NullableIntFieldUpdateOperationsInput | number | null
    total_pagado_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    estado?: NullableStringFieldUpdateOperationsInput | string | null
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    contrasena?: StringFieldUpdateOperationsInput | string
    correo?: StringFieldUpdateOperationsInput | string
    total_ganado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
  }

  export type cuentascompletasCreateManyInput = {
    id?: bigint | number
    contacto: string
    plataforma_id: number
    proveedor?: string | null
    fecha_compra?: Date | string | null
    fecha_vencimiento?: Date | string | null
    meses_pagados?: number | null
    total_pagado_completa?: Decimal | DecimalJsLike | number | string | null
    estado?: string | null
    comentario?: string | null
    contrasena: string
    correo: string
    total_ganado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: Decimal | DecimalJsLike | number | string | null
  }

  export type cuentascompletasUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    proveedor?: NullableStringFieldUpdateOperationsInput | string | null
    fecha_compra?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fecha_vencimiento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    meses_pagados?: NullableIntFieldUpdateOperationsInput | number | null
    total_pagado_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    estado?: NullableStringFieldUpdateOperationsInput | string | null
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    contrasena?: StringFieldUpdateOperationsInput | string
    correo?: StringFieldUpdateOperationsInput | string
    total_ganado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
  }

  export type cuentascompletasUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    contacto?: StringFieldUpdateOperationsInput | string
    plataforma_id?: IntFieldUpdateOperationsInput | number
    proveedor?: NullableStringFieldUpdateOperationsInput | string | null
    fecha_compra?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fecha_vencimiento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    meses_pagados?: NullableIntFieldUpdateOperationsInput | number | null
    total_pagado_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    estado?: NullableStringFieldUpdateOperationsInput | string | null
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    contrasena?: StringFieldUpdateOperationsInput | string
    correo?: StringFieldUpdateOperationsInput | string
    total_ganado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
  }

  export type pantallasCreateInput = {
    nro_pantalla: string
    fecha_compra: Date | string
    fecha_vencimiento: Date | string
    meses_pagados?: number | null
    total_pagado?: Decimal | DecimalJsLike | number | string | null
    estado: string
    comentario?: string | null
    total_ganado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor?: Decimal | DecimalJsLike | number | string | null
    usuarios: usuariosCreateNestedOneWithoutPantallasInput
    cuentascompartidas: cuentascompartidasCreateNestedOneWithoutPantallasInput
  }

  export type pantallasUncheckedCreateInput = {
    id?: number
    cuenta_id: number
    contacto: string
    nro_pantalla: string
    fecha_compra: Date | string
    fecha_vencimiento: Date | string
    meses_pagados?: number | null
    total_pagado?: Decimal | DecimalJsLike | number | string | null
    estado: string
    comentario?: string | null
    total_ganado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor?: Decimal | DecimalJsLike | number | string | null
  }

  export type pantallasUpdateInput = {
    nro_pantalla?: StringFieldUpdateOperationsInput | string
    fecha_compra?: DateTimeFieldUpdateOperationsInput | Date | string
    fecha_vencimiento?: DateTimeFieldUpdateOperationsInput | Date | string
    meses_pagados?: NullableIntFieldUpdateOperationsInput | number | null
    total_pagado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    estado?: StringFieldUpdateOperationsInput | string
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    total_ganado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    usuarios?: usuariosUpdateOneRequiredWithoutPantallasNestedInput
    cuentascompartidas?: cuentascompartidasUpdateOneRequiredWithoutPantallasNestedInput
  }

  export type pantallasUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    cuenta_id?: IntFieldUpdateOperationsInput | number
    contacto?: StringFieldUpdateOperationsInput | string
    nro_pantalla?: StringFieldUpdateOperationsInput | string
    fecha_compra?: DateTimeFieldUpdateOperationsInput | Date | string
    fecha_vencimiento?: DateTimeFieldUpdateOperationsInput | Date | string
    meses_pagados?: NullableIntFieldUpdateOperationsInput | number | null
    total_pagado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    estado?: StringFieldUpdateOperationsInput | string
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    total_ganado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
  }

  export type pantallasCreateManyInput = {
    id?: number
    cuenta_id: number
    contacto: string
    nro_pantalla: string
    fecha_compra: Date | string
    fecha_vencimiento: Date | string
    meses_pagados?: number | null
    total_pagado?: Decimal | DecimalJsLike | number | string | null
    estado: string
    comentario?: string | null
    total_ganado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor?: Decimal | DecimalJsLike | number | string | null
  }

  export type pantallasUpdateManyMutationInput = {
    nro_pantalla?: StringFieldUpdateOperationsInput | string
    fecha_compra?: DateTimeFieldUpdateOperationsInput | Date | string
    fecha_vencimiento?: DateTimeFieldUpdateOperationsInput | Date | string
    meses_pagados?: NullableIntFieldUpdateOperationsInput | number | null
    total_pagado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    estado?: StringFieldUpdateOperationsInput | string
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    total_ganado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
  }

  export type pantallasUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    cuenta_id?: IntFieldUpdateOperationsInput | number
    contacto?: StringFieldUpdateOperationsInput | string
    nro_pantalla?: StringFieldUpdateOperationsInput | string
    fecha_compra?: DateTimeFieldUpdateOperationsInput | Date | string
    fecha_vencimiento?: DateTimeFieldUpdateOperationsInput | Date | string
    meses_pagados?: NullableIntFieldUpdateOperationsInput | number | null
    total_pagado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    estado?: StringFieldUpdateOperationsInput | string
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    total_ganado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
  }

  export type plataformasCreateInput = {
    nombre: string
    cantidad_pantallas?: number
    total_pagado_proveedor?: Decimal | DecimalJsLike | number | string | null
    total_pagado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_completa?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: Decimal | DecimalJsLike | number | string | null
    cuentascompartidas?: cuentascompartidasCreateNestedManyWithoutPlataformasInput
    cuentascompletas?: cuentascompletasCreateNestedManyWithoutPlataformasInput
    inventario?: inventarioCreateNestedManyWithoutPlataformasInput
  }

  export type plataformasUncheckedCreateInput = {
    id?: number
    nombre: string
    cantidad_pantallas?: number
    total_pagado_proveedor?: Decimal | DecimalJsLike | number | string | null
    total_pagado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_completa?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: Decimal | DecimalJsLike | number | string | null
    cuentascompartidas?: cuentascompartidasUncheckedCreateNestedManyWithoutPlataformasInput
    cuentascompletas?: cuentascompletasUncheckedCreateNestedManyWithoutPlataformasInput
    inventario?: inventarioUncheckedCreateNestedManyWithoutPlataformasInput
  }

  export type plataformasUpdateInput = {
    nombre?: StringFieldUpdateOperationsInput | string
    cantidad_pantallas?: IntFieldUpdateOperationsInput | number
    total_pagado_proveedor?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    cuentascompartidas?: cuentascompartidasUpdateManyWithoutPlataformasNestedInput
    cuentascompletas?: cuentascompletasUpdateManyWithoutPlataformasNestedInput
    inventario?: inventarioUpdateManyWithoutPlataformasNestedInput
  }

  export type plataformasUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    nombre?: StringFieldUpdateOperationsInput | string
    cantidad_pantallas?: IntFieldUpdateOperationsInput | number
    total_pagado_proveedor?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    cuentascompartidas?: cuentascompartidasUncheckedUpdateManyWithoutPlataformasNestedInput
    cuentascompletas?: cuentascompletasUncheckedUpdateManyWithoutPlataformasNestedInput
    inventario?: inventarioUncheckedUpdateManyWithoutPlataformasNestedInput
  }

  export type plataformasCreateManyInput = {
    id?: number
    nombre: string
    cantidad_pantallas?: number
    total_pagado_proveedor?: Decimal | DecimalJsLike | number | string | null
    total_pagado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_completa?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: Decimal | DecimalJsLike | number | string | null
  }

  export type plataformasUpdateManyMutationInput = {
    nombre?: StringFieldUpdateOperationsInput | string
    cantidad_pantallas?: IntFieldUpdateOperationsInput | number
    total_pagado_proveedor?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
  }

  export type plataformasUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    nombre?: StringFieldUpdateOperationsInput | string
    cantidad_pantallas?: IntFieldUpdateOperationsInput | number
    total_pagado_proveedor?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
  }

  export type usuariosCreateInput = {
    contacto: string
    nombre?: string | null
    cuentascompletas?: cuentascompletasCreateNestedManyWithoutUsuariosInput
    pantallas?: pantallasCreateNestedManyWithoutUsuariosInput
  }

  export type usuariosUncheckedCreateInput = {
    contacto: string
    nombre?: string | null
    cuentascompletas?: cuentascompletasUncheckedCreateNestedManyWithoutUsuariosInput
    pantallas?: pantallasUncheckedCreateNestedManyWithoutUsuariosInput
  }

  export type usuariosUpdateInput = {
    contacto?: StringFieldUpdateOperationsInput | string
    nombre?: NullableStringFieldUpdateOperationsInput | string | null
    cuentascompletas?: cuentascompletasUpdateManyWithoutUsuariosNestedInput
    pantallas?: pantallasUpdateManyWithoutUsuariosNestedInput
  }

  export type usuariosUncheckedUpdateInput = {
    contacto?: StringFieldUpdateOperationsInput | string
    nombre?: NullableStringFieldUpdateOperationsInput | string | null
    cuentascompletas?: cuentascompletasUncheckedUpdateManyWithoutUsuariosNestedInput
    pantallas?: pantallasUncheckedUpdateManyWithoutUsuariosNestedInput
  }

  export type usuariosCreateManyInput = {
    contacto: string
    nombre?: string | null
  }

  export type usuariosUpdateManyMutationInput = {
    contacto?: StringFieldUpdateOperationsInput | string
    nombre?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type usuariosUncheckedUpdateManyInput = {
    contacto?: StringFieldUpdateOperationsInput | string
    nombre?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type wa_notificacionesCreateInput = {
    id?: bigint | number
    phone: string
    fecha: Date | string
    createdAt?: Date | string
  }

  export type wa_notificacionesUncheckedCreateInput = {
    id?: bigint | number
    phone: string
    fecha: Date | string
    createdAt?: Date | string
  }

  export type wa_notificacionesUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    phone?: StringFieldUpdateOperationsInput | string
    fecha?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type wa_notificacionesUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    phone?: StringFieldUpdateOperationsInput | string
    fecha?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type wa_notificacionesCreateManyInput = {
    id?: bigint | number
    phone: string
    fecha: Date | string
    createdAt?: Date | string
  }

  export type wa_notificacionesUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    phone?: StringFieldUpdateOperationsInput | string
    fecha?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type wa_notificacionesUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    phone?: StringFieldUpdateOperationsInput | string
    fecha?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type wa_logsCreateInput = {
    id?: bigint | number
    phone: string
    status: $Enums.LogStatus
    message?: string | null
    createdAt?: Date | string
  }

  export type wa_logsUncheckedCreateInput = {
    id?: bigint | number
    phone: string
    status: $Enums.LogStatus
    message?: string | null
    createdAt?: Date | string
  }

  export type wa_logsUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    phone?: StringFieldUpdateOperationsInput | string
    status?: EnumLogStatusFieldUpdateOperationsInput | $Enums.LogStatus
    message?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type wa_logsUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    phone?: StringFieldUpdateOperationsInput | string
    status?: EnumLogStatusFieldUpdateOperationsInput | $Enums.LogStatus
    message?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type wa_logsCreateManyInput = {
    id?: bigint | number
    phone: string
    status: $Enums.LogStatus
    message?: string | null
    createdAt?: Date | string
  }

  export type wa_logsUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    phone?: StringFieldUpdateOperationsInput | string
    status?: EnumLogStatusFieldUpdateOperationsInput | $Enums.LogStatus
    message?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type wa_logsUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    phone?: StringFieldUpdateOperationsInput | string
    status?: EnumLogStatusFieldUpdateOperationsInput | $Enums.LogStatus
    message?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type inventarioCreateInput = {
    correo: string
    clave?: string | null
    plataformas: plataformasCreateNestedOneWithoutInventarioInput
  }

  export type inventarioUncheckedCreateInput = {
    id?: number
    plataforma_id: number
    correo: string
    clave?: string | null
  }

  export type inventarioUpdateInput = {
    correo?: StringFieldUpdateOperationsInput | string
    clave?: NullableStringFieldUpdateOperationsInput | string | null
    plataformas?: plataformasUpdateOneRequiredWithoutInventarioNestedInput
  }

  export type inventarioUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    plataforma_id?: IntFieldUpdateOperationsInput | number
    correo?: StringFieldUpdateOperationsInput | string
    clave?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type inventarioCreateManyInput = {
    id?: number
    plataforma_id: number
    correo: string
    clave?: string | null
  }

  export type inventarioUpdateManyMutationInput = {
    correo?: StringFieldUpdateOperationsInput | string
    clave?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type inventarioUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    plataforma_id?: IntFieldUpdateOperationsInput | number
    correo?: StringFieldUpdateOperationsInput | string
    clave?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type metricasmensualesCreateInput = {
    year: number
    month: number
    periodLabel: string
    totalGeneral: Decimal | DecimalJsLike | number | string
    totalPantallas: Decimal | DecimalJsLike | number | string
    totalCuentas: Decimal | DecimalJsLike | number | string
    ventasCantidad: number
    clientesActivos: number
    ranking: JsonNullValueInput | InputJsonValue
    ventasDias: JsonNullValueInput | InputJsonValue
    payload?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type metricasmensualesUncheckedCreateInput = {
    id?: number
    year: number
    month: number
    periodLabel: string
    totalGeneral: Decimal | DecimalJsLike | number | string
    totalPantallas: Decimal | DecimalJsLike | number | string
    totalCuentas: Decimal | DecimalJsLike | number | string
    ventasCantidad: number
    clientesActivos: number
    ranking: JsonNullValueInput | InputJsonValue
    ventasDias: JsonNullValueInput | InputJsonValue
    payload?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type metricasmensualesUpdateInput = {
    year?: IntFieldUpdateOperationsInput | number
    month?: IntFieldUpdateOperationsInput | number
    periodLabel?: StringFieldUpdateOperationsInput | string
    totalGeneral?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalPantallas?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalCuentas?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    ventasCantidad?: IntFieldUpdateOperationsInput | number
    clientesActivos?: IntFieldUpdateOperationsInput | number
    ranking?: JsonNullValueInput | InputJsonValue
    ventasDias?: JsonNullValueInput | InputJsonValue
    payload?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type metricasmensualesUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    year?: IntFieldUpdateOperationsInput | number
    month?: IntFieldUpdateOperationsInput | number
    periodLabel?: StringFieldUpdateOperationsInput | string
    totalGeneral?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalPantallas?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalCuentas?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    ventasCantidad?: IntFieldUpdateOperationsInput | number
    clientesActivos?: IntFieldUpdateOperationsInput | number
    ranking?: JsonNullValueInput | InputJsonValue
    ventasDias?: JsonNullValueInput | InputJsonValue
    payload?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type metricasmensualesCreateManyInput = {
    id?: number
    year: number
    month: number
    periodLabel: string
    totalGeneral: Decimal | DecimalJsLike | number | string
    totalPantallas: Decimal | DecimalJsLike | number | string
    totalCuentas: Decimal | DecimalJsLike | number | string
    ventasCantidad: number
    clientesActivos: number
    ranking: JsonNullValueInput | InputJsonValue
    ventasDias: JsonNullValueInput | InputJsonValue
    payload?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type metricasmensualesUpdateManyMutationInput = {
    year?: IntFieldUpdateOperationsInput | number
    month?: IntFieldUpdateOperationsInput | number
    periodLabel?: StringFieldUpdateOperationsInput | string
    totalGeneral?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalPantallas?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalCuentas?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    ventasCantidad?: IntFieldUpdateOperationsInput | number
    clientesActivos?: IntFieldUpdateOperationsInput | number
    ranking?: JsonNullValueInput | InputJsonValue
    ventasDias?: JsonNullValueInput | InputJsonValue
    payload?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type metricasmensualesUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    year?: IntFieldUpdateOperationsInput | number
    month?: IntFieldUpdateOperationsInput | number
    periodLabel?: StringFieldUpdateOperationsInput | string
    totalGeneral?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalPantallas?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalCuentas?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    ventasCantidad?: IntFieldUpdateOperationsInput | number
    clientesActivos?: IntFieldUpdateOperationsInput | number
    ranking?: JsonNullValueInput | InputJsonValue
    ventasDias?: JsonNullValueInput | InputJsonValue
    payload?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type adminCreateInput = {
    usuario: string
    contrasena: string
    creado_en?: Date | string
  }

  export type adminUncheckedCreateInput = {
    id?: number
    usuario: string
    contrasena: string
    creado_en?: Date | string
  }

  export type adminUpdateInput = {
    usuario?: StringFieldUpdateOperationsInput | string
    contrasena?: StringFieldUpdateOperationsInput | string
    creado_en?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type adminUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    usuario?: StringFieldUpdateOperationsInput | string
    contrasena?: StringFieldUpdateOperationsInput | string
    creado_en?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type adminCreateManyInput = {
    id?: number
    usuario: string
    contrasena: string
    creado_en?: Date | string
  }

  export type adminUpdateManyMutationInput = {
    usuario?: StringFieldUpdateOperationsInput | string
    contrasena?: StringFieldUpdateOperationsInput | string
    creado_en?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type adminUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    usuario?: StringFieldUpdateOperationsInput | string
    contrasena?: StringFieldUpdateOperationsInput | string
    creado_en?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type PlataformasNullableScalarRelationFilter = {
    is?: plataformasWhereInput | null
    isNot?: plataformasWhereInput | null
  }

  export type PantallasListRelationFilter = {
    every?: pantallasWhereInput
    some?: pantallasWhereInput
    none?: pantallasWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type pantallasOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type cuentascompartidasOrderByRelevanceInput = {
    fields: cuentascompartidasOrderByRelevanceFieldEnum | cuentascompartidasOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type cuentascompartidasCountOrderByAggregateInput = {
    id?: SortOrder
    correo?: SortOrder
    contrasena?: SortOrder
    proveedor?: SortOrder
    plataforma_id?: SortOrder
    cuenta_caida?: SortOrder
  }

  export type cuentascompartidasAvgOrderByAggregateInput = {
    id?: SortOrder
    plataforma_id?: SortOrder
  }

  export type cuentascompartidasMaxOrderByAggregateInput = {
    id?: SortOrder
    correo?: SortOrder
    contrasena?: SortOrder
    proveedor?: SortOrder
    plataforma_id?: SortOrder
    cuenta_caida?: SortOrder
  }

  export type cuentascompartidasMinOrderByAggregateInput = {
    id?: SortOrder
    correo?: SortOrder
    contrasena?: SortOrder
    proveedor?: SortOrder
    plataforma_id?: SortOrder
    cuenta_caida?: SortOrder
  }

  export type cuentascompartidasSumOrderByAggregateInput = {
    id?: SortOrder
    plataforma_id?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type BigIntFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[]
    notIn?: bigint[] | number[]
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntFilter<$PrismaModel> | bigint | number
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type DecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type PlataformasScalarRelationFilter = {
    is?: plataformasWhereInput
    isNot?: plataformasWhereInput
  }

  export type UsuariosScalarRelationFilter = {
    is?: usuariosWhereInput
    isNot?: usuariosWhereInput
  }

  export type cuentascompletasOrderByRelevanceInput = {
    fields: cuentascompletasOrderByRelevanceFieldEnum | cuentascompletasOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type cuentascompletasCountOrderByAggregateInput = {
    id?: SortOrder
    contacto?: SortOrder
    plataforma_id?: SortOrder
    proveedor?: SortOrder
    fecha_compra?: SortOrder
    fecha_vencimiento?: SortOrder
    meses_pagados?: SortOrder
    total_pagado_completa?: SortOrder
    estado?: SortOrder
    comentario?: SortOrder
    contrasena?: SortOrder
    correo?: SortOrder
    total_ganado?: SortOrder
    total_pagado_proveedor_completa?: SortOrder
  }

  export type cuentascompletasAvgOrderByAggregateInput = {
    id?: SortOrder
    plataforma_id?: SortOrder
    meses_pagados?: SortOrder
    total_pagado_completa?: SortOrder
    total_ganado?: SortOrder
    total_pagado_proveedor_completa?: SortOrder
  }

  export type cuentascompletasMaxOrderByAggregateInput = {
    id?: SortOrder
    contacto?: SortOrder
    plataforma_id?: SortOrder
    proveedor?: SortOrder
    fecha_compra?: SortOrder
    fecha_vencimiento?: SortOrder
    meses_pagados?: SortOrder
    total_pagado_completa?: SortOrder
    estado?: SortOrder
    comentario?: SortOrder
    contrasena?: SortOrder
    correo?: SortOrder
    total_ganado?: SortOrder
    total_pagado_proveedor_completa?: SortOrder
  }

  export type cuentascompletasMinOrderByAggregateInput = {
    id?: SortOrder
    contacto?: SortOrder
    plataforma_id?: SortOrder
    proveedor?: SortOrder
    fecha_compra?: SortOrder
    fecha_vencimiento?: SortOrder
    meses_pagados?: SortOrder
    total_pagado_completa?: SortOrder
    estado?: SortOrder
    comentario?: SortOrder
    contrasena?: SortOrder
    correo?: SortOrder
    total_ganado?: SortOrder
    total_pagado_proveedor_completa?: SortOrder
  }

  export type cuentascompletasSumOrderByAggregateInput = {
    id?: SortOrder
    plataforma_id?: SortOrder
    meses_pagados?: SortOrder
    total_pagado_completa?: SortOrder
    total_ganado?: SortOrder
    total_pagado_proveedor_completa?: SortOrder
  }

  export type BigIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[]
    notIn?: bigint[] | number[]
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntWithAggregatesFilter<$PrismaModel> | bigint | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedBigIntFilter<$PrismaModel>
    _min?: NestedBigIntFilter<$PrismaModel>
    _max?: NestedBigIntFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type DecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type CuentascompartidasScalarRelationFilter = {
    is?: cuentascompartidasWhereInput
    isNot?: cuentascompartidasWhereInput
  }

  export type pantallasOrderByRelevanceInput = {
    fields: pantallasOrderByRelevanceFieldEnum | pantallasOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type pantallasCountOrderByAggregateInput = {
    id?: SortOrder
    cuenta_id?: SortOrder
    contacto?: SortOrder
    nro_pantalla?: SortOrder
    fecha_compra?: SortOrder
    fecha_vencimiento?: SortOrder
    meses_pagados?: SortOrder
    total_pagado?: SortOrder
    estado?: SortOrder
    comentario?: SortOrder
    total_ganado?: SortOrder
    total_pagado_proveedor?: SortOrder
  }

  export type pantallasAvgOrderByAggregateInput = {
    id?: SortOrder
    cuenta_id?: SortOrder
    meses_pagados?: SortOrder
    total_pagado?: SortOrder
    total_ganado?: SortOrder
    total_pagado_proveedor?: SortOrder
  }

  export type pantallasMaxOrderByAggregateInput = {
    id?: SortOrder
    cuenta_id?: SortOrder
    contacto?: SortOrder
    nro_pantalla?: SortOrder
    fecha_compra?: SortOrder
    fecha_vencimiento?: SortOrder
    meses_pagados?: SortOrder
    total_pagado?: SortOrder
    estado?: SortOrder
    comentario?: SortOrder
    total_ganado?: SortOrder
    total_pagado_proveedor?: SortOrder
  }

  export type pantallasMinOrderByAggregateInput = {
    id?: SortOrder
    cuenta_id?: SortOrder
    contacto?: SortOrder
    nro_pantalla?: SortOrder
    fecha_compra?: SortOrder
    fecha_vencimiento?: SortOrder
    meses_pagados?: SortOrder
    total_pagado?: SortOrder
    estado?: SortOrder
    comentario?: SortOrder
    total_ganado?: SortOrder
    total_pagado_proveedor?: SortOrder
  }

  export type pantallasSumOrderByAggregateInput = {
    id?: SortOrder
    cuenta_id?: SortOrder
    meses_pagados?: SortOrder
    total_pagado?: SortOrder
    total_ganado?: SortOrder
    total_pagado_proveedor?: SortOrder
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type CuentascompartidasListRelationFilter = {
    every?: cuentascompartidasWhereInput
    some?: cuentascompartidasWhereInput
    none?: cuentascompartidasWhereInput
  }

  export type CuentascompletasListRelationFilter = {
    every?: cuentascompletasWhereInput
    some?: cuentascompletasWhereInput
    none?: cuentascompletasWhereInput
  }

  export type InventarioListRelationFilter = {
    every?: inventarioWhereInput
    some?: inventarioWhereInput
    none?: inventarioWhereInput
  }

  export type cuentascompartidasOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type cuentascompletasOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type inventarioOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type plataformasOrderByRelevanceInput = {
    fields: plataformasOrderByRelevanceFieldEnum | plataformasOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type plataformasCountOrderByAggregateInput = {
    id?: SortOrder
    nombre?: SortOrder
    cantidad_pantallas?: SortOrder
    total_pagado_proveedor?: SortOrder
    total_pagado?: SortOrder
    total_pagado_completa?: SortOrder
    total_pagado_proveedor_completa?: SortOrder
  }

  export type plataformasAvgOrderByAggregateInput = {
    id?: SortOrder
    cantidad_pantallas?: SortOrder
    total_pagado_proveedor?: SortOrder
    total_pagado?: SortOrder
    total_pagado_completa?: SortOrder
    total_pagado_proveedor_completa?: SortOrder
  }

  export type plataformasMaxOrderByAggregateInput = {
    id?: SortOrder
    nombre?: SortOrder
    cantidad_pantallas?: SortOrder
    total_pagado_proveedor?: SortOrder
    total_pagado?: SortOrder
    total_pagado_completa?: SortOrder
    total_pagado_proveedor_completa?: SortOrder
  }

  export type plataformasMinOrderByAggregateInput = {
    id?: SortOrder
    nombre?: SortOrder
    cantidad_pantallas?: SortOrder
    total_pagado_proveedor?: SortOrder
    total_pagado?: SortOrder
    total_pagado_completa?: SortOrder
    total_pagado_proveedor_completa?: SortOrder
  }

  export type plataformasSumOrderByAggregateInput = {
    id?: SortOrder
    cantidad_pantallas?: SortOrder
    total_pagado_proveedor?: SortOrder
    total_pagado?: SortOrder
    total_pagado_completa?: SortOrder
    total_pagado_proveedor_completa?: SortOrder
  }

  export type usuariosOrderByRelevanceInput = {
    fields: usuariosOrderByRelevanceFieldEnum | usuariosOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type usuariosCountOrderByAggregateInput = {
    contacto?: SortOrder
    nombre?: SortOrder
  }

  export type usuariosMaxOrderByAggregateInput = {
    contacto?: SortOrder
    nombre?: SortOrder
  }

  export type usuariosMinOrderByAggregateInput = {
    contacto?: SortOrder
    nombre?: SortOrder
  }

  export type wa_notificacionesOrderByRelevanceInput = {
    fields: wa_notificacionesOrderByRelevanceFieldEnum | wa_notificacionesOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type wa_notificacionesUq_phone_fechaCompoundUniqueInput = {
    phone: string
    fecha: Date | string
  }

  export type wa_notificacionesCountOrderByAggregateInput = {
    id?: SortOrder
    phone?: SortOrder
    fecha?: SortOrder
    createdAt?: SortOrder
  }

  export type wa_notificacionesAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type wa_notificacionesMaxOrderByAggregateInput = {
    id?: SortOrder
    phone?: SortOrder
    fecha?: SortOrder
    createdAt?: SortOrder
  }

  export type wa_notificacionesMinOrderByAggregateInput = {
    id?: SortOrder
    phone?: SortOrder
    fecha?: SortOrder
    createdAt?: SortOrder
  }

  export type wa_notificacionesSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type EnumLogStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.LogStatus | EnumLogStatusFieldRefInput<$PrismaModel>
    in?: $Enums.LogStatus[]
    notIn?: $Enums.LogStatus[]
    not?: NestedEnumLogStatusFilter<$PrismaModel> | $Enums.LogStatus
  }

  export type wa_logsOrderByRelevanceInput = {
    fields: wa_logsOrderByRelevanceFieldEnum | wa_logsOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type wa_logsCountOrderByAggregateInput = {
    id?: SortOrder
    phone?: SortOrder
    status?: SortOrder
    message?: SortOrder
    createdAt?: SortOrder
  }

  export type wa_logsAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type wa_logsMaxOrderByAggregateInput = {
    id?: SortOrder
    phone?: SortOrder
    status?: SortOrder
    message?: SortOrder
    createdAt?: SortOrder
  }

  export type wa_logsMinOrderByAggregateInput = {
    id?: SortOrder
    phone?: SortOrder
    status?: SortOrder
    message?: SortOrder
    createdAt?: SortOrder
  }

  export type wa_logsSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type EnumLogStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.LogStatus | EnumLogStatusFieldRefInput<$PrismaModel>
    in?: $Enums.LogStatus[]
    notIn?: $Enums.LogStatus[]
    not?: NestedEnumLogStatusWithAggregatesFilter<$PrismaModel> | $Enums.LogStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumLogStatusFilter<$PrismaModel>
    _max?: NestedEnumLogStatusFilter<$PrismaModel>
  }

  export type inventarioOrderByRelevanceInput = {
    fields: inventarioOrderByRelevanceFieldEnum | inventarioOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type inventarioPlataforma_idCorreoCompoundUniqueInput = {
    plataforma_id: number
    correo: string
  }

  export type inventarioCountOrderByAggregateInput = {
    id?: SortOrder
    plataforma_id?: SortOrder
    correo?: SortOrder
    clave?: SortOrder
  }

  export type inventarioAvgOrderByAggregateInput = {
    id?: SortOrder
    plataforma_id?: SortOrder
  }

  export type inventarioMaxOrderByAggregateInput = {
    id?: SortOrder
    plataforma_id?: SortOrder
    correo?: SortOrder
    clave?: SortOrder
  }

  export type inventarioMinOrderByAggregateInput = {
    id?: SortOrder
    plataforma_id?: SortOrder
    correo?: SortOrder
    clave?: SortOrder
  }

  export type inventarioSumOrderByAggregateInput = {
    id?: SortOrder
    plataforma_id?: SortOrder
  }

  export type DecimalFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[]
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[]
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
  }
  export type JsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue
    lte?: InputJsonValue
    gt?: InputJsonValue
    gte?: InputJsonValue
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }
  export type JsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue
    lte?: InputJsonValue
    gt?: InputJsonValue
    gte?: InputJsonValue
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type metricasmensualesOrderByRelevanceInput = {
    fields: metricasmensualesOrderByRelevanceFieldEnum | metricasmensualesOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type metricasmensualesYear_monthCompoundUniqueInput = {
    year: number
    month: number
  }

  export type metricasmensualesCountOrderByAggregateInput = {
    id?: SortOrder
    year?: SortOrder
    month?: SortOrder
    periodLabel?: SortOrder
    totalGeneral?: SortOrder
    totalPantallas?: SortOrder
    totalCuentas?: SortOrder
    ventasCantidad?: SortOrder
    clientesActivos?: SortOrder
    ranking?: SortOrder
    ventasDias?: SortOrder
    payload?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type metricasmensualesAvgOrderByAggregateInput = {
    id?: SortOrder
    year?: SortOrder
    month?: SortOrder
    totalGeneral?: SortOrder
    totalPantallas?: SortOrder
    totalCuentas?: SortOrder
    ventasCantidad?: SortOrder
    clientesActivos?: SortOrder
  }

  export type metricasmensualesMaxOrderByAggregateInput = {
    id?: SortOrder
    year?: SortOrder
    month?: SortOrder
    periodLabel?: SortOrder
    totalGeneral?: SortOrder
    totalPantallas?: SortOrder
    totalCuentas?: SortOrder
    ventasCantidad?: SortOrder
    clientesActivos?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type metricasmensualesMinOrderByAggregateInput = {
    id?: SortOrder
    year?: SortOrder
    month?: SortOrder
    periodLabel?: SortOrder
    totalGeneral?: SortOrder
    totalPantallas?: SortOrder
    totalCuentas?: SortOrder
    ventasCantidad?: SortOrder
    clientesActivos?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type metricasmensualesSumOrderByAggregateInput = {
    id?: SortOrder
    year?: SortOrder
    month?: SortOrder
    totalGeneral?: SortOrder
    totalPantallas?: SortOrder
    totalCuentas?: SortOrder
    ventasCantidad?: SortOrder
    clientesActivos?: SortOrder
  }

  export type DecimalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[]
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[]
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedDecimalFilter<$PrismaModel>
    _sum?: NestedDecimalFilter<$PrismaModel>
    _min?: NestedDecimalFilter<$PrismaModel>
    _max?: NestedDecimalFilter<$PrismaModel>
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue
    lte?: InputJsonValue
    gt?: InputJsonValue
    gte?: InputJsonValue
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue
    lte?: InputJsonValue
    gt?: InputJsonValue
    gte?: InputJsonValue
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type adminOrderByRelevanceInput = {
    fields: adminOrderByRelevanceFieldEnum | adminOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type adminCountOrderByAggregateInput = {
    id?: SortOrder
    usuario?: SortOrder
    contrasena?: SortOrder
    creado_en?: SortOrder
  }

  export type adminAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type adminMaxOrderByAggregateInput = {
    id?: SortOrder
    usuario?: SortOrder
    contrasena?: SortOrder
    creado_en?: SortOrder
  }

  export type adminMinOrderByAggregateInput = {
    id?: SortOrder
    usuario?: SortOrder
    contrasena?: SortOrder
    creado_en?: SortOrder
  }

  export type adminSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type plataformasCreateNestedOneWithoutCuentascompartidasInput = {
    create?: XOR<plataformasCreateWithoutCuentascompartidasInput, plataformasUncheckedCreateWithoutCuentascompartidasInput>
    connectOrCreate?: plataformasCreateOrConnectWithoutCuentascompartidasInput
    connect?: plataformasWhereUniqueInput
  }

  export type pantallasCreateNestedManyWithoutCuentascompartidasInput = {
    create?: XOR<pantallasCreateWithoutCuentascompartidasInput, pantallasUncheckedCreateWithoutCuentascompartidasInput> | pantallasCreateWithoutCuentascompartidasInput[] | pantallasUncheckedCreateWithoutCuentascompartidasInput[]
    connectOrCreate?: pantallasCreateOrConnectWithoutCuentascompartidasInput | pantallasCreateOrConnectWithoutCuentascompartidasInput[]
    createMany?: pantallasCreateManyCuentascompartidasInputEnvelope
    connect?: pantallasWhereUniqueInput | pantallasWhereUniqueInput[]
  }

  export type pantallasUncheckedCreateNestedManyWithoutCuentascompartidasInput = {
    create?: XOR<pantallasCreateWithoutCuentascompartidasInput, pantallasUncheckedCreateWithoutCuentascompartidasInput> | pantallasCreateWithoutCuentascompartidasInput[] | pantallasUncheckedCreateWithoutCuentascompartidasInput[]
    connectOrCreate?: pantallasCreateOrConnectWithoutCuentascompartidasInput | pantallasCreateOrConnectWithoutCuentascompartidasInput[]
    createMany?: pantallasCreateManyCuentascompartidasInputEnvelope
    connect?: pantallasWhereUniqueInput | pantallasWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type plataformasUpdateOneWithoutCuentascompartidasNestedInput = {
    create?: XOR<plataformasCreateWithoutCuentascompartidasInput, plataformasUncheckedCreateWithoutCuentascompartidasInput>
    connectOrCreate?: plataformasCreateOrConnectWithoutCuentascompartidasInput
    upsert?: plataformasUpsertWithoutCuentascompartidasInput
    disconnect?: plataformasWhereInput | boolean
    delete?: plataformasWhereInput | boolean
    connect?: plataformasWhereUniqueInput
    update?: XOR<XOR<plataformasUpdateToOneWithWhereWithoutCuentascompartidasInput, plataformasUpdateWithoutCuentascompartidasInput>, plataformasUncheckedUpdateWithoutCuentascompartidasInput>
  }

  export type pantallasUpdateManyWithoutCuentascompartidasNestedInput = {
    create?: XOR<pantallasCreateWithoutCuentascompartidasInput, pantallasUncheckedCreateWithoutCuentascompartidasInput> | pantallasCreateWithoutCuentascompartidasInput[] | pantallasUncheckedCreateWithoutCuentascompartidasInput[]
    connectOrCreate?: pantallasCreateOrConnectWithoutCuentascompartidasInput | pantallasCreateOrConnectWithoutCuentascompartidasInput[]
    upsert?: pantallasUpsertWithWhereUniqueWithoutCuentascompartidasInput | pantallasUpsertWithWhereUniqueWithoutCuentascompartidasInput[]
    createMany?: pantallasCreateManyCuentascompartidasInputEnvelope
    set?: pantallasWhereUniqueInput | pantallasWhereUniqueInput[]
    disconnect?: pantallasWhereUniqueInput | pantallasWhereUniqueInput[]
    delete?: pantallasWhereUniqueInput | pantallasWhereUniqueInput[]
    connect?: pantallasWhereUniqueInput | pantallasWhereUniqueInput[]
    update?: pantallasUpdateWithWhereUniqueWithoutCuentascompartidasInput | pantallasUpdateWithWhereUniqueWithoutCuentascompartidasInput[]
    updateMany?: pantallasUpdateManyWithWhereWithoutCuentascompartidasInput | pantallasUpdateManyWithWhereWithoutCuentascompartidasInput[]
    deleteMany?: pantallasScalarWhereInput | pantallasScalarWhereInput[]
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type pantallasUncheckedUpdateManyWithoutCuentascompartidasNestedInput = {
    create?: XOR<pantallasCreateWithoutCuentascompartidasInput, pantallasUncheckedCreateWithoutCuentascompartidasInput> | pantallasCreateWithoutCuentascompartidasInput[] | pantallasUncheckedCreateWithoutCuentascompartidasInput[]
    connectOrCreate?: pantallasCreateOrConnectWithoutCuentascompartidasInput | pantallasCreateOrConnectWithoutCuentascompartidasInput[]
    upsert?: pantallasUpsertWithWhereUniqueWithoutCuentascompartidasInput | pantallasUpsertWithWhereUniqueWithoutCuentascompartidasInput[]
    createMany?: pantallasCreateManyCuentascompartidasInputEnvelope
    set?: pantallasWhereUniqueInput | pantallasWhereUniqueInput[]
    disconnect?: pantallasWhereUniqueInput | pantallasWhereUniqueInput[]
    delete?: pantallasWhereUniqueInput | pantallasWhereUniqueInput[]
    connect?: pantallasWhereUniqueInput | pantallasWhereUniqueInput[]
    update?: pantallasUpdateWithWhereUniqueWithoutCuentascompartidasInput | pantallasUpdateWithWhereUniqueWithoutCuentascompartidasInput[]
    updateMany?: pantallasUpdateManyWithWhereWithoutCuentascompartidasInput | pantallasUpdateManyWithWhereWithoutCuentascompartidasInput[]
    deleteMany?: pantallasScalarWhereInput | pantallasScalarWhereInput[]
  }

  export type plataformasCreateNestedOneWithoutCuentascompletasInput = {
    create?: XOR<plataformasCreateWithoutCuentascompletasInput, plataformasUncheckedCreateWithoutCuentascompletasInput>
    connectOrCreate?: plataformasCreateOrConnectWithoutCuentascompletasInput
    connect?: plataformasWhereUniqueInput
  }

  export type usuariosCreateNestedOneWithoutCuentascompletasInput = {
    create?: XOR<usuariosCreateWithoutCuentascompletasInput, usuariosUncheckedCreateWithoutCuentascompletasInput>
    connectOrCreate?: usuariosCreateOrConnectWithoutCuentascompletasInput
    connect?: usuariosWhereUniqueInput
  }

  export type BigIntFieldUpdateOperationsInput = {
    set?: bigint | number
    increment?: bigint | number
    decrement?: bigint | number
    multiply?: bigint | number
    divide?: bigint | number
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type NullableDecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string | null
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type plataformasUpdateOneRequiredWithoutCuentascompletasNestedInput = {
    create?: XOR<plataformasCreateWithoutCuentascompletasInput, plataformasUncheckedCreateWithoutCuentascompletasInput>
    connectOrCreate?: plataformasCreateOrConnectWithoutCuentascompletasInput
    upsert?: plataformasUpsertWithoutCuentascompletasInput
    connect?: plataformasWhereUniqueInput
    update?: XOR<XOR<plataformasUpdateToOneWithWhereWithoutCuentascompletasInput, plataformasUpdateWithoutCuentascompletasInput>, plataformasUncheckedUpdateWithoutCuentascompletasInput>
  }

  export type usuariosUpdateOneRequiredWithoutCuentascompletasNestedInput = {
    create?: XOR<usuariosCreateWithoutCuentascompletasInput, usuariosUncheckedCreateWithoutCuentascompletasInput>
    connectOrCreate?: usuariosCreateOrConnectWithoutCuentascompletasInput
    upsert?: usuariosUpsertWithoutCuentascompletasInput
    connect?: usuariosWhereUniqueInput
    update?: XOR<XOR<usuariosUpdateToOneWithWhereWithoutCuentascompletasInput, usuariosUpdateWithoutCuentascompletasInput>, usuariosUncheckedUpdateWithoutCuentascompletasInput>
  }

  export type usuariosCreateNestedOneWithoutPantallasInput = {
    create?: XOR<usuariosCreateWithoutPantallasInput, usuariosUncheckedCreateWithoutPantallasInput>
    connectOrCreate?: usuariosCreateOrConnectWithoutPantallasInput
    connect?: usuariosWhereUniqueInput
  }

  export type cuentascompartidasCreateNestedOneWithoutPantallasInput = {
    create?: XOR<cuentascompartidasCreateWithoutPantallasInput, cuentascompartidasUncheckedCreateWithoutPantallasInput>
    connectOrCreate?: cuentascompartidasCreateOrConnectWithoutPantallasInput
    connect?: cuentascompartidasWhereUniqueInput
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type usuariosUpdateOneRequiredWithoutPantallasNestedInput = {
    create?: XOR<usuariosCreateWithoutPantallasInput, usuariosUncheckedCreateWithoutPantallasInput>
    connectOrCreate?: usuariosCreateOrConnectWithoutPantallasInput
    upsert?: usuariosUpsertWithoutPantallasInput
    connect?: usuariosWhereUniqueInput
    update?: XOR<XOR<usuariosUpdateToOneWithWhereWithoutPantallasInput, usuariosUpdateWithoutPantallasInput>, usuariosUncheckedUpdateWithoutPantallasInput>
  }

  export type cuentascompartidasUpdateOneRequiredWithoutPantallasNestedInput = {
    create?: XOR<cuentascompartidasCreateWithoutPantallasInput, cuentascompartidasUncheckedCreateWithoutPantallasInput>
    connectOrCreate?: cuentascompartidasCreateOrConnectWithoutPantallasInput
    upsert?: cuentascompartidasUpsertWithoutPantallasInput
    connect?: cuentascompartidasWhereUniqueInput
    update?: XOR<XOR<cuentascompartidasUpdateToOneWithWhereWithoutPantallasInput, cuentascompartidasUpdateWithoutPantallasInput>, cuentascompartidasUncheckedUpdateWithoutPantallasInput>
  }

  export type cuentascompartidasCreateNestedManyWithoutPlataformasInput = {
    create?: XOR<cuentascompartidasCreateWithoutPlataformasInput, cuentascompartidasUncheckedCreateWithoutPlataformasInput> | cuentascompartidasCreateWithoutPlataformasInput[] | cuentascompartidasUncheckedCreateWithoutPlataformasInput[]
    connectOrCreate?: cuentascompartidasCreateOrConnectWithoutPlataformasInput | cuentascompartidasCreateOrConnectWithoutPlataformasInput[]
    createMany?: cuentascompartidasCreateManyPlataformasInputEnvelope
    connect?: cuentascompartidasWhereUniqueInput | cuentascompartidasWhereUniqueInput[]
  }

  export type cuentascompletasCreateNestedManyWithoutPlataformasInput = {
    create?: XOR<cuentascompletasCreateWithoutPlataformasInput, cuentascompletasUncheckedCreateWithoutPlataformasInput> | cuentascompletasCreateWithoutPlataformasInput[] | cuentascompletasUncheckedCreateWithoutPlataformasInput[]
    connectOrCreate?: cuentascompletasCreateOrConnectWithoutPlataformasInput | cuentascompletasCreateOrConnectWithoutPlataformasInput[]
    createMany?: cuentascompletasCreateManyPlataformasInputEnvelope
    connect?: cuentascompletasWhereUniqueInput | cuentascompletasWhereUniqueInput[]
  }

  export type inventarioCreateNestedManyWithoutPlataformasInput = {
    create?: XOR<inventarioCreateWithoutPlataformasInput, inventarioUncheckedCreateWithoutPlataformasInput> | inventarioCreateWithoutPlataformasInput[] | inventarioUncheckedCreateWithoutPlataformasInput[]
    connectOrCreate?: inventarioCreateOrConnectWithoutPlataformasInput | inventarioCreateOrConnectWithoutPlataformasInput[]
    createMany?: inventarioCreateManyPlataformasInputEnvelope
    connect?: inventarioWhereUniqueInput | inventarioWhereUniqueInput[]
  }

  export type cuentascompartidasUncheckedCreateNestedManyWithoutPlataformasInput = {
    create?: XOR<cuentascompartidasCreateWithoutPlataformasInput, cuentascompartidasUncheckedCreateWithoutPlataformasInput> | cuentascompartidasCreateWithoutPlataformasInput[] | cuentascompartidasUncheckedCreateWithoutPlataformasInput[]
    connectOrCreate?: cuentascompartidasCreateOrConnectWithoutPlataformasInput | cuentascompartidasCreateOrConnectWithoutPlataformasInput[]
    createMany?: cuentascompartidasCreateManyPlataformasInputEnvelope
    connect?: cuentascompartidasWhereUniqueInput | cuentascompartidasWhereUniqueInput[]
  }

  export type cuentascompletasUncheckedCreateNestedManyWithoutPlataformasInput = {
    create?: XOR<cuentascompletasCreateWithoutPlataformasInput, cuentascompletasUncheckedCreateWithoutPlataformasInput> | cuentascompletasCreateWithoutPlataformasInput[] | cuentascompletasUncheckedCreateWithoutPlataformasInput[]
    connectOrCreate?: cuentascompletasCreateOrConnectWithoutPlataformasInput | cuentascompletasCreateOrConnectWithoutPlataformasInput[]
    createMany?: cuentascompletasCreateManyPlataformasInputEnvelope
    connect?: cuentascompletasWhereUniqueInput | cuentascompletasWhereUniqueInput[]
  }

  export type inventarioUncheckedCreateNestedManyWithoutPlataformasInput = {
    create?: XOR<inventarioCreateWithoutPlataformasInput, inventarioUncheckedCreateWithoutPlataformasInput> | inventarioCreateWithoutPlataformasInput[] | inventarioUncheckedCreateWithoutPlataformasInput[]
    connectOrCreate?: inventarioCreateOrConnectWithoutPlataformasInput | inventarioCreateOrConnectWithoutPlataformasInput[]
    createMany?: inventarioCreateManyPlataformasInputEnvelope
    connect?: inventarioWhereUniqueInput | inventarioWhereUniqueInput[]
  }

  export type cuentascompartidasUpdateManyWithoutPlataformasNestedInput = {
    create?: XOR<cuentascompartidasCreateWithoutPlataformasInput, cuentascompartidasUncheckedCreateWithoutPlataformasInput> | cuentascompartidasCreateWithoutPlataformasInput[] | cuentascompartidasUncheckedCreateWithoutPlataformasInput[]
    connectOrCreate?: cuentascompartidasCreateOrConnectWithoutPlataformasInput | cuentascompartidasCreateOrConnectWithoutPlataformasInput[]
    upsert?: cuentascompartidasUpsertWithWhereUniqueWithoutPlataformasInput | cuentascompartidasUpsertWithWhereUniqueWithoutPlataformasInput[]
    createMany?: cuentascompartidasCreateManyPlataformasInputEnvelope
    set?: cuentascompartidasWhereUniqueInput | cuentascompartidasWhereUniqueInput[]
    disconnect?: cuentascompartidasWhereUniqueInput | cuentascompartidasWhereUniqueInput[]
    delete?: cuentascompartidasWhereUniqueInput | cuentascompartidasWhereUniqueInput[]
    connect?: cuentascompartidasWhereUniqueInput | cuentascompartidasWhereUniqueInput[]
    update?: cuentascompartidasUpdateWithWhereUniqueWithoutPlataformasInput | cuentascompartidasUpdateWithWhereUniqueWithoutPlataformasInput[]
    updateMany?: cuentascompartidasUpdateManyWithWhereWithoutPlataformasInput | cuentascompartidasUpdateManyWithWhereWithoutPlataformasInput[]
    deleteMany?: cuentascompartidasScalarWhereInput | cuentascompartidasScalarWhereInput[]
  }

  export type cuentascompletasUpdateManyWithoutPlataformasNestedInput = {
    create?: XOR<cuentascompletasCreateWithoutPlataformasInput, cuentascompletasUncheckedCreateWithoutPlataformasInput> | cuentascompletasCreateWithoutPlataformasInput[] | cuentascompletasUncheckedCreateWithoutPlataformasInput[]
    connectOrCreate?: cuentascompletasCreateOrConnectWithoutPlataformasInput | cuentascompletasCreateOrConnectWithoutPlataformasInput[]
    upsert?: cuentascompletasUpsertWithWhereUniqueWithoutPlataformasInput | cuentascompletasUpsertWithWhereUniqueWithoutPlataformasInput[]
    createMany?: cuentascompletasCreateManyPlataformasInputEnvelope
    set?: cuentascompletasWhereUniqueInput | cuentascompletasWhereUniqueInput[]
    disconnect?: cuentascompletasWhereUniqueInput | cuentascompletasWhereUniqueInput[]
    delete?: cuentascompletasWhereUniqueInput | cuentascompletasWhereUniqueInput[]
    connect?: cuentascompletasWhereUniqueInput | cuentascompletasWhereUniqueInput[]
    update?: cuentascompletasUpdateWithWhereUniqueWithoutPlataformasInput | cuentascompletasUpdateWithWhereUniqueWithoutPlataformasInput[]
    updateMany?: cuentascompletasUpdateManyWithWhereWithoutPlataformasInput | cuentascompletasUpdateManyWithWhereWithoutPlataformasInput[]
    deleteMany?: cuentascompletasScalarWhereInput | cuentascompletasScalarWhereInput[]
  }

  export type inventarioUpdateManyWithoutPlataformasNestedInput = {
    create?: XOR<inventarioCreateWithoutPlataformasInput, inventarioUncheckedCreateWithoutPlataformasInput> | inventarioCreateWithoutPlataformasInput[] | inventarioUncheckedCreateWithoutPlataformasInput[]
    connectOrCreate?: inventarioCreateOrConnectWithoutPlataformasInput | inventarioCreateOrConnectWithoutPlataformasInput[]
    upsert?: inventarioUpsertWithWhereUniqueWithoutPlataformasInput | inventarioUpsertWithWhereUniqueWithoutPlataformasInput[]
    createMany?: inventarioCreateManyPlataformasInputEnvelope
    set?: inventarioWhereUniqueInput | inventarioWhereUniqueInput[]
    disconnect?: inventarioWhereUniqueInput | inventarioWhereUniqueInput[]
    delete?: inventarioWhereUniqueInput | inventarioWhereUniqueInput[]
    connect?: inventarioWhereUniqueInput | inventarioWhereUniqueInput[]
    update?: inventarioUpdateWithWhereUniqueWithoutPlataformasInput | inventarioUpdateWithWhereUniqueWithoutPlataformasInput[]
    updateMany?: inventarioUpdateManyWithWhereWithoutPlataformasInput | inventarioUpdateManyWithWhereWithoutPlataformasInput[]
    deleteMany?: inventarioScalarWhereInput | inventarioScalarWhereInput[]
  }

  export type cuentascompartidasUncheckedUpdateManyWithoutPlataformasNestedInput = {
    create?: XOR<cuentascompartidasCreateWithoutPlataformasInput, cuentascompartidasUncheckedCreateWithoutPlataformasInput> | cuentascompartidasCreateWithoutPlataformasInput[] | cuentascompartidasUncheckedCreateWithoutPlataformasInput[]
    connectOrCreate?: cuentascompartidasCreateOrConnectWithoutPlataformasInput | cuentascompartidasCreateOrConnectWithoutPlataformasInput[]
    upsert?: cuentascompartidasUpsertWithWhereUniqueWithoutPlataformasInput | cuentascompartidasUpsertWithWhereUniqueWithoutPlataformasInput[]
    createMany?: cuentascompartidasCreateManyPlataformasInputEnvelope
    set?: cuentascompartidasWhereUniqueInput | cuentascompartidasWhereUniqueInput[]
    disconnect?: cuentascompartidasWhereUniqueInput | cuentascompartidasWhereUniqueInput[]
    delete?: cuentascompartidasWhereUniqueInput | cuentascompartidasWhereUniqueInput[]
    connect?: cuentascompartidasWhereUniqueInput | cuentascompartidasWhereUniqueInput[]
    update?: cuentascompartidasUpdateWithWhereUniqueWithoutPlataformasInput | cuentascompartidasUpdateWithWhereUniqueWithoutPlataformasInput[]
    updateMany?: cuentascompartidasUpdateManyWithWhereWithoutPlataformasInput | cuentascompartidasUpdateManyWithWhereWithoutPlataformasInput[]
    deleteMany?: cuentascompartidasScalarWhereInput | cuentascompartidasScalarWhereInput[]
  }

  export type cuentascompletasUncheckedUpdateManyWithoutPlataformasNestedInput = {
    create?: XOR<cuentascompletasCreateWithoutPlataformasInput, cuentascompletasUncheckedCreateWithoutPlataformasInput> | cuentascompletasCreateWithoutPlataformasInput[] | cuentascompletasUncheckedCreateWithoutPlataformasInput[]
    connectOrCreate?: cuentascompletasCreateOrConnectWithoutPlataformasInput | cuentascompletasCreateOrConnectWithoutPlataformasInput[]
    upsert?: cuentascompletasUpsertWithWhereUniqueWithoutPlataformasInput | cuentascompletasUpsertWithWhereUniqueWithoutPlataformasInput[]
    createMany?: cuentascompletasCreateManyPlataformasInputEnvelope
    set?: cuentascompletasWhereUniqueInput | cuentascompletasWhereUniqueInput[]
    disconnect?: cuentascompletasWhereUniqueInput | cuentascompletasWhereUniqueInput[]
    delete?: cuentascompletasWhereUniqueInput | cuentascompletasWhereUniqueInput[]
    connect?: cuentascompletasWhereUniqueInput | cuentascompletasWhereUniqueInput[]
    update?: cuentascompletasUpdateWithWhereUniqueWithoutPlataformasInput | cuentascompletasUpdateWithWhereUniqueWithoutPlataformasInput[]
    updateMany?: cuentascompletasUpdateManyWithWhereWithoutPlataformasInput | cuentascompletasUpdateManyWithWhereWithoutPlataformasInput[]
    deleteMany?: cuentascompletasScalarWhereInput | cuentascompletasScalarWhereInput[]
  }

  export type inventarioUncheckedUpdateManyWithoutPlataformasNestedInput = {
    create?: XOR<inventarioCreateWithoutPlataformasInput, inventarioUncheckedCreateWithoutPlataformasInput> | inventarioCreateWithoutPlataformasInput[] | inventarioUncheckedCreateWithoutPlataformasInput[]
    connectOrCreate?: inventarioCreateOrConnectWithoutPlataformasInput | inventarioCreateOrConnectWithoutPlataformasInput[]
    upsert?: inventarioUpsertWithWhereUniqueWithoutPlataformasInput | inventarioUpsertWithWhereUniqueWithoutPlataformasInput[]
    createMany?: inventarioCreateManyPlataformasInputEnvelope
    set?: inventarioWhereUniqueInput | inventarioWhereUniqueInput[]
    disconnect?: inventarioWhereUniqueInput | inventarioWhereUniqueInput[]
    delete?: inventarioWhereUniqueInput | inventarioWhereUniqueInput[]
    connect?: inventarioWhereUniqueInput | inventarioWhereUniqueInput[]
    update?: inventarioUpdateWithWhereUniqueWithoutPlataformasInput | inventarioUpdateWithWhereUniqueWithoutPlataformasInput[]
    updateMany?: inventarioUpdateManyWithWhereWithoutPlataformasInput | inventarioUpdateManyWithWhereWithoutPlataformasInput[]
    deleteMany?: inventarioScalarWhereInput | inventarioScalarWhereInput[]
  }

  export type cuentascompletasCreateNestedManyWithoutUsuariosInput = {
    create?: XOR<cuentascompletasCreateWithoutUsuariosInput, cuentascompletasUncheckedCreateWithoutUsuariosInput> | cuentascompletasCreateWithoutUsuariosInput[] | cuentascompletasUncheckedCreateWithoutUsuariosInput[]
    connectOrCreate?: cuentascompletasCreateOrConnectWithoutUsuariosInput | cuentascompletasCreateOrConnectWithoutUsuariosInput[]
    createMany?: cuentascompletasCreateManyUsuariosInputEnvelope
    connect?: cuentascompletasWhereUniqueInput | cuentascompletasWhereUniqueInput[]
  }

  export type pantallasCreateNestedManyWithoutUsuariosInput = {
    create?: XOR<pantallasCreateWithoutUsuariosInput, pantallasUncheckedCreateWithoutUsuariosInput> | pantallasCreateWithoutUsuariosInput[] | pantallasUncheckedCreateWithoutUsuariosInput[]
    connectOrCreate?: pantallasCreateOrConnectWithoutUsuariosInput | pantallasCreateOrConnectWithoutUsuariosInput[]
    createMany?: pantallasCreateManyUsuariosInputEnvelope
    connect?: pantallasWhereUniqueInput | pantallasWhereUniqueInput[]
  }

  export type cuentascompletasUncheckedCreateNestedManyWithoutUsuariosInput = {
    create?: XOR<cuentascompletasCreateWithoutUsuariosInput, cuentascompletasUncheckedCreateWithoutUsuariosInput> | cuentascompletasCreateWithoutUsuariosInput[] | cuentascompletasUncheckedCreateWithoutUsuariosInput[]
    connectOrCreate?: cuentascompletasCreateOrConnectWithoutUsuariosInput | cuentascompletasCreateOrConnectWithoutUsuariosInput[]
    createMany?: cuentascompletasCreateManyUsuariosInputEnvelope
    connect?: cuentascompletasWhereUniqueInput | cuentascompletasWhereUniqueInput[]
  }

  export type pantallasUncheckedCreateNestedManyWithoutUsuariosInput = {
    create?: XOR<pantallasCreateWithoutUsuariosInput, pantallasUncheckedCreateWithoutUsuariosInput> | pantallasCreateWithoutUsuariosInput[] | pantallasUncheckedCreateWithoutUsuariosInput[]
    connectOrCreate?: pantallasCreateOrConnectWithoutUsuariosInput | pantallasCreateOrConnectWithoutUsuariosInput[]
    createMany?: pantallasCreateManyUsuariosInputEnvelope
    connect?: pantallasWhereUniqueInput | pantallasWhereUniqueInput[]
  }

  export type cuentascompletasUpdateManyWithoutUsuariosNestedInput = {
    create?: XOR<cuentascompletasCreateWithoutUsuariosInput, cuentascompletasUncheckedCreateWithoutUsuariosInput> | cuentascompletasCreateWithoutUsuariosInput[] | cuentascompletasUncheckedCreateWithoutUsuariosInput[]
    connectOrCreate?: cuentascompletasCreateOrConnectWithoutUsuariosInput | cuentascompletasCreateOrConnectWithoutUsuariosInput[]
    upsert?: cuentascompletasUpsertWithWhereUniqueWithoutUsuariosInput | cuentascompletasUpsertWithWhereUniqueWithoutUsuariosInput[]
    createMany?: cuentascompletasCreateManyUsuariosInputEnvelope
    set?: cuentascompletasWhereUniqueInput | cuentascompletasWhereUniqueInput[]
    disconnect?: cuentascompletasWhereUniqueInput | cuentascompletasWhereUniqueInput[]
    delete?: cuentascompletasWhereUniqueInput | cuentascompletasWhereUniqueInput[]
    connect?: cuentascompletasWhereUniqueInput | cuentascompletasWhereUniqueInput[]
    update?: cuentascompletasUpdateWithWhereUniqueWithoutUsuariosInput | cuentascompletasUpdateWithWhereUniqueWithoutUsuariosInput[]
    updateMany?: cuentascompletasUpdateManyWithWhereWithoutUsuariosInput | cuentascompletasUpdateManyWithWhereWithoutUsuariosInput[]
    deleteMany?: cuentascompletasScalarWhereInput | cuentascompletasScalarWhereInput[]
  }

  export type pantallasUpdateManyWithoutUsuariosNestedInput = {
    create?: XOR<pantallasCreateWithoutUsuariosInput, pantallasUncheckedCreateWithoutUsuariosInput> | pantallasCreateWithoutUsuariosInput[] | pantallasUncheckedCreateWithoutUsuariosInput[]
    connectOrCreate?: pantallasCreateOrConnectWithoutUsuariosInput | pantallasCreateOrConnectWithoutUsuariosInput[]
    upsert?: pantallasUpsertWithWhereUniqueWithoutUsuariosInput | pantallasUpsertWithWhereUniqueWithoutUsuariosInput[]
    createMany?: pantallasCreateManyUsuariosInputEnvelope
    set?: pantallasWhereUniqueInput | pantallasWhereUniqueInput[]
    disconnect?: pantallasWhereUniqueInput | pantallasWhereUniqueInput[]
    delete?: pantallasWhereUniqueInput | pantallasWhereUniqueInput[]
    connect?: pantallasWhereUniqueInput | pantallasWhereUniqueInput[]
    update?: pantallasUpdateWithWhereUniqueWithoutUsuariosInput | pantallasUpdateWithWhereUniqueWithoutUsuariosInput[]
    updateMany?: pantallasUpdateManyWithWhereWithoutUsuariosInput | pantallasUpdateManyWithWhereWithoutUsuariosInput[]
    deleteMany?: pantallasScalarWhereInput | pantallasScalarWhereInput[]
  }

  export type cuentascompletasUncheckedUpdateManyWithoutUsuariosNestedInput = {
    create?: XOR<cuentascompletasCreateWithoutUsuariosInput, cuentascompletasUncheckedCreateWithoutUsuariosInput> | cuentascompletasCreateWithoutUsuariosInput[] | cuentascompletasUncheckedCreateWithoutUsuariosInput[]
    connectOrCreate?: cuentascompletasCreateOrConnectWithoutUsuariosInput | cuentascompletasCreateOrConnectWithoutUsuariosInput[]
    upsert?: cuentascompletasUpsertWithWhereUniqueWithoutUsuariosInput | cuentascompletasUpsertWithWhereUniqueWithoutUsuariosInput[]
    createMany?: cuentascompletasCreateManyUsuariosInputEnvelope
    set?: cuentascompletasWhereUniqueInput | cuentascompletasWhereUniqueInput[]
    disconnect?: cuentascompletasWhereUniqueInput | cuentascompletasWhereUniqueInput[]
    delete?: cuentascompletasWhereUniqueInput | cuentascompletasWhereUniqueInput[]
    connect?: cuentascompletasWhereUniqueInput | cuentascompletasWhereUniqueInput[]
    update?: cuentascompletasUpdateWithWhereUniqueWithoutUsuariosInput | cuentascompletasUpdateWithWhereUniqueWithoutUsuariosInput[]
    updateMany?: cuentascompletasUpdateManyWithWhereWithoutUsuariosInput | cuentascompletasUpdateManyWithWhereWithoutUsuariosInput[]
    deleteMany?: cuentascompletasScalarWhereInput | cuentascompletasScalarWhereInput[]
  }

  export type pantallasUncheckedUpdateManyWithoutUsuariosNestedInput = {
    create?: XOR<pantallasCreateWithoutUsuariosInput, pantallasUncheckedCreateWithoutUsuariosInput> | pantallasCreateWithoutUsuariosInput[] | pantallasUncheckedCreateWithoutUsuariosInput[]
    connectOrCreate?: pantallasCreateOrConnectWithoutUsuariosInput | pantallasCreateOrConnectWithoutUsuariosInput[]
    upsert?: pantallasUpsertWithWhereUniqueWithoutUsuariosInput | pantallasUpsertWithWhereUniqueWithoutUsuariosInput[]
    createMany?: pantallasCreateManyUsuariosInputEnvelope
    set?: pantallasWhereUniqueInput | pantallasWhereUniqueInput[]
    disconnect?: pantallasWhereUniqueInput | pantallasWhereUniqueInput[]
    delete?: pantallasWhereUniqueInput | pantallasWhereUniqueInput[]
    connect?: pantallasWhereUniqueInput | pantallasWhereUniqueInput[]
    update?: pantallasUpdateWithWhereUniqueWithoutUsuariosInput | pantallasUpdateWithWhereUniqueWithoutUsuariosInput[]
    updateMany?: pantallasUpdateManyWithWhereWithoutUsuariosInput | pantallasUpdateManyWithWhereWithoutUsuariosInput[]
    deleteMany?: pantallasScalarWhereInput | pantallasScalarWhereInput[]
  }

  export type EnumLogStatusFieldUpdateOperationsInput = {
    set?: $Enums.LogStatus
  }

  export type plataformasCreateNestedOneWithoutInventarioInput = {
    create?: XOR<plataformasCreateWithoutInventarioInput, plataformasUncheckedCreateWithoutInventarioInput>
    connectOrCreate?: plataformasCreateOrConnectWithoutInventarioInput
    connect?: plataformasWhereUniqueInput
  }

  export type plataformasUpdateOneRequiredWithoutInventarioNestedInput = {
    create?: XOR<plataformasCreateWithoutInventarioInput, plataformasUncheckedCreateWithoutInventarioInput>
    connectOrCreate?: plataformasCreateOrConnectWithoutInventarioInput
    upsert?: plataformasUpsertWithoutInventarioInput
    connect?: plataformasWhereUniqueInput
    update?: XOR<XOR<plataformasUpdateToOneWithWhereWithoutInventarioInput, plataformasUpdateWithoutInventarioInput>, plataformasUncheckedUpdateWithoutInventarioInput>
  }

  export type DecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedBigIntFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[]
    notIn?: bigint[] | number[]
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntFilter<$PrismaModel> | bigint | number
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type NestedBigIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[]
    notIn?: bigint[] | number[]
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntWithAggregatesFilter<$PrismaModel> | bigint | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedBigIntFilter<$PrismaModel>
    _min?: NestedBigIntFilter<$PrismaModel>
    _max?: NestedBigIntFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedDecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedEnumLogStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.LogStatus | EnumLogStatusFieldRefInput<$PrismaModel>
    in?: $Enums.LogStatus[]
    notIn?: $Enums.LogStatus[]
    not?: NestedEnumLogStatusFilter<$PrismaModel> | $Enums.LogStatus
  }

  export type NestedEnumLogStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.LogStatus | EnumLogStatusFieldRefInput<$PrismaModel>
    in?: $Enums.LogStatus[]
    notIn?: $Enums.LogStatus[]
    not?: NestedEnumLogStatusWithAggregatesFilter<$PrismaModel> | $Enums.LogStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumLogStatusFilter<$PrismaModel>
    _max?: NestedEnumLogStatusFilter<$PrismaModel>
  }

  export type NestedDecimalFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[]
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[]
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
  }

  export type NestedDecimalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[]
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[]
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedDecimalFilter<$PrismaModel>
    _sum?: NestedDecimalFilter<$PrismaModel>
    _min?: NestedDecimalFilter<$PrismaModel>
    _max?: NestedDecimalFilter<$PrismaModel>
  }
  export type NestedJsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue
    lte?: InputJsonValue
    gt?: InputJsonValue
    gte?: InputJsonValue
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue
    lte?: InputJsonValue
    gt?: InputJsonValue
    gte?: InputJsonValue
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type plataformasCreateWithoutCuentascompartidasInput = {
    nombre: string
    cantidad_pantallas?: number
    total_pagado_proveedor?: Decimal | DecimalJsLike | number | string | null
    total_pagado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_completa?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: Decimal | DecimalJsLike | number | string | null
    cuentascompletas?: cuentascompletasCreateNestedManyWithoutPlataformasInput
    inventario?: inventarioCreateNestedManyWithoutPlataformasInput
  }

  export type plataformasUncheckedCreateWithoutCuentascompartidasInput = {
    id?: number
    nombre: string
    cantidad_pantallas?: number
    total_pagado_proveedor?: Decimal | DecimalJsLike | number | string | null
    total_pagado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_completa?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: Decimal | DecimalJsLike | number | string | null
    cuentascompletas?: cuentascompletasUncheckedCreateNestedManyWithoutPlataformasInput
    inventario?: inventarioUncheckedCreateNestedManyWithoutPlataformasInput
  }

  export type plataformasCreateOrConnectWithoutCuentascompartidasInput = {
    where: plataformasWhereUniqueInput
    create: XOR<plataformasCreateWithoutCuentascompartidasInput, plataformasUncheckedCreateWithoutCuentascompartidasInput>
  }

  export type pantallasCreateWithoutCuentascompartidasInput = {
    nro_pantalla: string
    fecha_compra: Date | string
    fecha_vencimiento: Date | string
    meses_pagados?: number | null
    total_pagado?: Decimal | DecimalJsLike | number | string | null
    estado: string
    comentario?: string | null
    total_ganado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor?: Decimal | DecimalJsLike | number | string | null
    usuarios: usuariosCreateNestedOneWithoutPantallasInput
  }

  export type pantallasUncheckedCreateWithoutCuentascompartidasInput = {
    id?: number
    contacto: string
    nro_pantalla: string
    fecha_compra: Date | string
    fecha_vencimiento: Date | string
    meses_pagados?: number | null
    total_pagado?: Decimal | DecimalJsLike | number | string | null
    estado: string
    comentario?: string | null
    total_ganado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor?: Decimal | DecimalJsLike | number | string | null
  }

  export type pantallasCreateOrConnectWithoutCuentascompartidasInput = {
    where: pantallasWhereUniqueInput
    create: XOR<pantallasCreateWithoutCuentascompartidasInput, pantallasUncheckedCreateWithoutCuentascompartidasInput>
  }

  export type pantallasCreateManyCuentascompartidasInputEnvelope = {
    data: pantallasCreateManyCuentascompartidasInput | pantallasCreateManyCuentascompartidasInput[]
    skipDuplicates?: boolean
  }

  export type plataformasUpsertWithoutCuentascompartidasInput = {
    update: XOR<plataformasUpdateWithoutCuentascompartidasInput, plataformasUncheckedUpdateWithoutCuentascompartidasInput>
    create: XOR<plataformasCreateWithoutCuentascompartidasInput, plataformasUncheckedCreateWithoutCuentascompartidasInput>
    where?: plataformasWhereInput
  }

  export type plataformasUpdateToOneWithWhereWithoutCuentascompartidasInput = {
    where?: plataformasWhereInput
    data: XOR<plataformasUpdateWithoutCuentascompartidasInput, plataformasUncheckedUpdateWithoutCuentascompartidasInput>
  }

  export type plataformasUpdateWithoutCuentascompartidasInput = {
    nombre?: StringFieldUpdateOperationsInput | string
    cantidad_pantallas?: IntFieldUpdateOperationsInput | number
    total_pagado_proveedor?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    cuentascompletas?: cuentascompletasUpdateManyWithoutPlataformasNestedInput
    inventario?: inventarioUpdateManyWithoutPlataformasNestedInput
  }

  export type plataformasUncheckedUpdateWithoutCuentascompartidasInput = {
    id?: IntFieldUpdateOperationsInput | number
    nombre?: StringFieldUpdateOperationsInput | string
    cantidad_pantallas?: IntFieldUpdateOperationsInput | number
    total_pagado_proveedor?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    cuentascompletas?: cuentascompletasUncheckedUpdateManyWithoutPlataformasNestedInput
    inventario?: inventarioUncheckedUpdateManyWithoutPlataformasNestedInput
  }

  export type pantallasUpsertWithWhereUniqueWithoutCuentascompartidasInput = {
    where: pantallasWhereUniqueInput
    update: XOR<pantallasUpdateWithoutCuentascompartidasInput, pantallasUncheckedUpdateWithoutCuentascompartidasInput>
    create: XOR<pantallasCreateWithoutCuentascompartidasInput, pantallasUncheckedCreateWithoutCuentascompartidasInput>
  }

  export type pantallasUpdateWithWhereUniqueWithoutCuentascompartidasInput = {
    where: pantallasWhereUniqueInput
    data: XOR<pantallasUpdateWithoutCuentascompartidasInput, pantallasUncheckedUpdateWithoutCuentascompartidasInput>
  }

  export type pantallasUpdateManyWithWhereWithoutCuentascompartidasInput = {
    where: pantallasScalarWhereInput
    data: XOR<pantallasUpdateManyMutationInput, pantallasUncheckedUpdateManyWithoutCuentascompartidasInput>
  }

  export type pantallasScalarWhereInput = {
    AND?: pantallasScalarWhereInput | pantallasScalarWhereInput[]
    OR?: pantallasScalarWhereInput[]
    NOT?: pantallasScalarWhereInput | pantallasScalarWhereInput[]
    id?: IntFilter<"pantallas"> | number
    cuenta_id?: IntFilter<"pantallas"> | number
    contacto?: StringFilter<"pantallas"> | string
    nro_pantalla?: StringFilter<"pantallas"> | string
    fecha_compra?: DateTimeFilter<"pantallas"> | Date | string
    fecha_vencimiento?: DateTimeFilter<"pantallas"> | Date | string
    meses_pagados?: IntNullableFilter<"pantallas"> | number | null
    total_pagado?: DecimalNullableFilter<"pantallas"> | Decimal | DecimalJsLike | number | string | null
    estado?: StringFilter<"pantallas"> | string
    comentario?: StringNullableFilter<"pantallas"> | string | null
    total_ganado?: DecimalNullableFilter<"pantallas"> | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor?: DecimalNullableFilter<"pantallas"> | Decimal | DecimalJsLike | number | string | null
  }

  export type plataformasCreateWithoutCuentascompletasInput = {
    nombre: string
    cantidad_pantallas?: number
    total_pagado_proveedor?: Decimal | DecimalJsLike | number | string | null
    total_pagado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_completa?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: Decimal | DecimalJsLike | number | string | null
    cuentascompartidas?: cuentascompartidasCreateNestedManyWithoutPlataformasInput
    inventario?: inventarioCreateNestedManyWithoutPlataformasInput
  }

  export type plataformasUncheckedCreateWithoutCuentascompletasInput = {
    id?: number
    nombre: string
    cantidad_pantallas?: number
    total_pagado_proveedor?: Decimal | DecimalJsLike | number | string | null
    total_pagado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_completa?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: Decimal | DecimalJsLike | number | string | null
    cuentascompartidas?: cuentascompartidasUncheckedCreateNestedManyWithoutPlataformasInput
    inventario?: inventarioUncheckedCreateNestedManyWithoutPlataformasInput
  }

  export type plataformasCreateOrConnectWithoutCuentascompletasInput = {
    where: plataformasWhereUniqueInput
    create: XOR<plataformasCreateWithoutCuentascompletasInput, plataformasUncheckedCreateWithoutCuentascompletasInput>
  }

  export type usuariosCreateWithoutCuentascompletasInput = {
    contacto: string
    nombre?: string | null
    pantallas?: pantallasCreateNestedManyWithoutUsuariosInput
  }

  export type usuariosUncheckedCreateWithoutCuentascompletasInput = {
    contacto: string
    nombre?: string | null
    pantallas?: pantallasUncheckedCreateNestedManyWithoutUsuariosInput
  }

  export type usuariosCreateOrConnectWithoutCuentascompletasInput = {
    where: usuariosWhereUniqueInput
    create: XOR<usuariosCreateWithoutCuentascompletasInput, usuariosUncheckedCreateWithoutCuentascompletasInput>
  }

  export type plataformasUpsertWithoutCuentascompletasInput = {
    update: XOR<plataformasUpdateWithoutCuentascompletasInput, plataformasUncheckedUpdateWithoutCuentascompletasInput>
    create: XOR<plataformasCreateWithoutCuentascompletasInput, plataformasUncheckedCreateWithoutCuentascompletasInput>
    where?: plataformasWhereInput
  }

  export type plataformasUpdateToOneWithWhereWithoutCuentascompletasInput = {
    where?: plataformasWhereInput
    data: XOR<plataformasUpdateWithoutCuentascompletasInput, plataformasUncheckedUpdateWithoutCuentascompletasInput>
  }

  export type plataformasUpdateWithoutCuentascompletasInput = {
    nombre?: StringFieldUpdateOperationsInput | string
    cantidad_pantallas?: IntFieldUpdateOperationsInput | number
    total_pagado_proveedor?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    cuentascompartidas?: cuentascompartidasUpdateManyWithoutPlataformasNestedInput
    inventario?: inventarioUpdateManyWithoutPlataformasNestedInput
  }

  export type plataformasUncheckedUpdateWithoutCuentascompletasInput = {
    id?: IntFieldUpdateOperationsInput | number
    nombre?: StringFieldUpdateOperationsInput | string
    cantidad_pantallas?: IntFieldUpdateOperationsInput | number
    total_pagado_proveedor?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    cuentascompartidas?: cuentascompartidasUncheckedUpdateManyWithoutPlataformasNestedInput
    inventario?: inventarioUncheckedUpdateManyWithoutPlataformasNestedInput
  }

  export type usuariosUpsertWithoutCuentascompletasInput = {
    update: XOR<usuariosUpdateWithoutCuentascompletasInput, usuariosUncheckedUpdateWithoutCuentascompletasInput>
    create: XOR<usuariosCreateWithoutCuentascompletasInput, usuariosUncheckedCreateWithoutCuentascompletasInput>
    where?: usuariosWhereInput
  }

  export type usuariosUpdateToOneWithWhereWithoutCuentascompletasInput = {
    where?: usuariosWhereInput
    data: XOR<usuariosUpdateWithoutCuentascompletasInput, usuariosUncheckedUpdateWithoutCuentascompletasInput>
  }

  export type usuariosUpdateWithoutCuentascompletasInput = {
    contacto?: StringFieldUpdateOperationsInput | string
    nombre?: NullableStringFieldUpdateOperationsInput | string | null
    pantallas?: pantallasUpdateManyWithoutUsuariosNestedInput
  }

  export type usuariosUncheckedUpdateWithoutCuentascompletasInput = {
    contacto?: StringFieldUpdateOperationsInput | string
    nombre?: NullableStringFieldUpdateOperationsInput | string | null
    pantallas?: pantallasUncheckedUpdateManyWithoutUsuariosNestedInput
  }

  export type usuariosCreateWithoutPantallasInput = {
    contacto: string
    nombre?: string | null
    cuentascompletas?: cuentascompletasCreateNestedManyWithoutUsuariosInput
  }

  export type usuariosUncheckedCreateWithoutPantallasInput = {
    contacto: string
    nombre?: string | null
    cuentascompletas?: cuentascompletasUncheckedCreateNestedManyWithoutUsuariosInput
  }

  export type usuariosCreateOrConnectWithoutPantallasInput = {
    where: usuariosWhereUniqueInput
    create: XOR<usuariosCreateWithoutPantallasInput, usuariosUncheckedCreateWithoutPantallasInput>
  }

  export type cuentascompartidasCreateWithoutPantallasInput = {
    correo: string
    contrasena: string
    proveedor?: string | null
    cuenta_caida?: boolean
    plataformas?: plataformasCreateNestedOneWithoutCuentascompartidasInput
  }

  export type cuentascompartidasUncheckedCreateWithoutPantallasInput = {
    id?: number
    correo: string
    contrasena: string
    proveedor?: string | null
    plataforma_id?: number | null
    cuenta_caida?: boolean
  }

  export type cuentascompartidasCreateOrConnectWithoutPantallasInput = {
    where: cuentascompartidasWhereUniqueInput
    create: XOR<cuentascompartidasCreateWithoutPantallasInput, cuentascompartidasUncheckedCreateWithoutPantallasInput>
  }

  export type usuariosUpsertWithoutPantallasInput = {
    update: XOR<usuariosUpdateWithoutPantallasInput, usuariosUncheckedUpdateWithoutPantallasInput>
    create: XOR<usuariosCreateWithoutPantallasInput, usuariosUncheckedCreateWithoutPantallasInput>
    where?: usuariosWhereInput
  }

  export type usuariosUpdateToOneWithWhereWithoutPantallasInput = {
    where?: usuariosWhereInput
    data: XOR<usuariosUpdateWithoutPantallasInput, usuariosUncheckedUpdateWithoutPantallasInput>
  }

  export type usuariosUpdateWithoutPantallasInput = {
    contacto?: StringFieldUpdateOperationsInput | string
    nombre?: NullableStringFieldUpdateOperationsInput | string | null
    cuentascompletas?: cuentascompletasUpdateManyWithoutUsuariosNestedInput
  }

  export type usuariosUncheckedUpdateWithoutPantallasInput = {
    contacto?: StringFieldUpdateOperationsInput | string
    nombre?: NullableStringFieldUpdateOperationsInput | string | null
    cuentascompletas?: cuentascompletasUncheckedUpdateManyWithoutUsuariosNestedInput
  }

  export type cuentascompartidasUpsertWithoutPantallasInput = {
    update: XOR<cuentascompartidasUpdateWithoutPantallasInput, cuentascompartidasUncheckedUpdateWithoutPantallasInput>
    create: XOR<cuentascompartidasCreateWithoutPantallasInput, cuentascompartidasUncheckedCreateWithoutPantallasInput>
    where?: cuentascompartidasWhereInput
  }

  export type cuentascompartidasUpdateToOneWithWhereWithoutPantallasInput = {
    where?: cuentascompartidasWhereInput
    data: XOR<cuentascompartidasUpdateWithoutPantallasInput, cuentascompartidasUncheckedUpdateWithoutPantallasInput>
  }

  export type cuentascompartidasUpdateWithoutPantallasInput = {
    correo?: StringFieldUpdateOperationsInput | string
    contrasena?: StringFieldUpdateOperationsInput | string
    proveedor?: NullableStringFieldUpdateOperationsInput | string | null
    cuenta_caida?: BoolFieldUpdateOperationsInput | boolean
    plataformas?: plataformasUpdateOneWithoutCuentascompartidasNestedInput
  }

  export type cuentascompartidasUncheckedUpdateWithoutPantallasInput = {
    id?: IntFieldUpdateOperationsInput | number
    correo?: StringFieldUpdateOperationsInput | string
    contrasena?: StringFieldUpdateOperationsInput | string
    proveedor?: NullableStringFieldUpdateOperationsInput | string | null
    plataforma_id?: NullableIntFieldUpdateOperationsInput | number | null
    cuenta_caida?: BoolFieldUpdateOperationsInput | boolean
  }

  export type cuentascompartidasCreateWithoutPlataformasInput = {
    correo: string
    contrasena: string
    proveedor?: string | null
    cuenta_caida?: boolean
    pantallas?: pantallasCreateNestedManyWithoutCuentascompartidasInput
  }

  export type cuentascompartidasUncheckedCreateWithoutPlataformasInput = {
    id?: number
    correo: string
    contrasena: string
    proveedor?: string | null
    cuenta_caida?: boolean
    pantallas?: pantallasUncheckedCreateNestedManyWithoutCuentascompartidasInput
  }

  export type cuentascompartidasCreateOrConnectWithoutPlataformasInput = {
    where: cuentascompartidasWhereUniqueInput
    create: XOR<cuentascompartidasCreateWithoutPlataformasInput, cuentascompartidasUncheckedCreateWithoutPlataformasInput>
  }

  export type cuentascompartidasCreateManyPlataformasInputEnvelope = {
    data: cuentascompartidasCreateManyPlataformasInput | cuentascompartidasCreateManyPlataformasInput[]
    skipDuplicates?: boolean
  }

  export type cuentascompletasCreateWithoutPlataformasInput = {
    id?: bigint | number
    proveedor?: string | null
    fecha_compra?: Date | string | null
    fecha_vencimiento?: Date | string | null
    meses_pagados?: number | null
    total_pagado_completa?: Decimal | DecimalJsLike | number | string | null
    estado?: string | null
    comentario?: string | null
    contrasena: string
    correo: string
    total_ganado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: Decimal | DecimalJsLike | number | string | null
    usuarios: usuariosCreateNestedOneWithoutCuentascompletasInput
  }

  export type cuentascompletasUncheckedCreateWithoutPlataformasInput = {
    id?: bigint | number
    contacto: string
    proveedor?: string | null
    fecha_compra?: Date | string | null
    fecha_vencimiento?: Date | string | null
    meses_pagados?: number | null
    total_pagado_completa?: Decimal | DecimalJsLike | number | string | null
    estado?: string | null
    comentario?: string | null
    contrasena: string
    correo: string
    total_ganado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: Decimal | DecimalJsLike | number | string | null
  }

  export type cuentascompletasCreateOrConnectWithoutPlataformasInput = {
    where: cuentascompletasWhereUniqueInput
    create: XOR<cuentascompletasCreateWithoutPlataformasInput, cuentascompletasUncheckedCreateWithoutPlataformasInput>
  }

  export type cuentascompletasCreateManyPlataformasInputEnvelope = {
    data: cuentascompletasCreateManyPlataformasInput | cuentascompletasCreateManyPlataformasInput[]
    skipDuplicates?: boolean
  }

  export type inventarioCreateWithoutPlataformasInput = {
    correo: string
    clave?: string | null
  }

  export type inventarioUncheckedCreateWithoutPlataformasInput = {
    id?: number
    correo: string
    clave?: string | null
  }

  export type inventarioCreateOrConnectWithoutPlataformasInput = {
    where: inventarioWhereUniqueInput
    create: XOR<inventarioCreateWithoutPlataformasInput, inventarioUncheckedCreateWithoutPlataformasInput>
  }

  export type inventarioCreateManyPlataformasInputEnvelope = {
    data: inventarioCreateManyPlataformasInput | inventarioCreateManyPlataformasInput[]
    skipDuplicates?: boolean
  }

  export type cuentascompartidasUpsertWithWhereUniqueWithoutPlataformasInput = {
    where: cuentascompartidasWhereUniqueInput
    update: XOR<cuentascompartidasUpdateWithoutPlataformasInput, cuentascompartidasUncheckedUpdateWithoutPlataformasInput>
    create: XOR<cuentascompartidasCreateWithoutPlataformasInput, cuentascompartidasUncheckedCreateWithoutPlataformasInput>
  }

  export type cuentascompartidasUpdateWithWhereUniqueWithoutPlataformasInput = {
    where: cuentascompartidasWhereUniqueInput
    data: XOR<cuentascompartidasUpdateWithoutPlataformasInput, cuentascompartidasUncheckedUpdateWithoutPlataformasInput>
  }

  export type cuentascompartidasUpdateManyWithWhereWithoutPlataformasInput = {
    where: cuentascompartidasScalarWhereInput
    data: XOR<cuentascompartidasUpdateManyMutationInput, cuentascompartidasUncheckedUpdateManyWithoutPlataformasInput>
  }

  export type cuentascompartidasScalarWhereInput = {
    AND?: cuentascompartidasScalarWhereInput | cuentascompartidasScalarWhereInput[]
    OR?: cuentascompartidasScalarWhereInput[]
    NOT?: cuentascompartidasScalarWhereInput | cuentascompartidasScalarWhereInput[]
    id?: IntFilter<"cuentascompartidas"> | number
    correo?: StringFilter<"cuentascompartidas"> | string
    contrasena?: StringFilter<"cuentascompartidas"> | string
    proveedor?: StringNullableFilter<"cuentascompartidas"> | string | null
    plataforma_id?: IntNullableFilter<"cuentascompartidas"> | number | null
    cuenta_caida?: BoolFilter<"cuentascompartidas"> | boolean
  }

  export type cuentascompletasUpsertWithWhereUniqueWithoutPlataformasInput = {
    where: cuentascompletasWhereUniqueInput
    update: XOR<cuentascompletasUpdateWithoutPlataformasInput, cuentascompletasUncheckedUpdateWithoutPlataformasInput>
    create: XOR<cuentascompletasCreateWithoutPlataformasInput, cuentascompletasUncheckedCreateWithoutPlataformasInput>
  }

  export type cuentascompletasUpdateWithWhereUniqueWithoutPlataformasInput = {
    where: cuentascompletasWhereUniqueInput
    data: XOR<cuentascompletasUpdateWithoutPlataformasInput, cuentascompletasUncheckedUpdateWithoutPlataformasInput>
  }

  export type cuentascompletasUpdateManyWithWhereWithoutPlataformasInput = {
    where: cuentascompletasScalarWhereInput
    data: XOR<cuentascompletasUpdateManyMutationInput, cuentascompletasUncheckedUpdateManyWithoutPlataformasInput>
  }

  export type cuentascompletasScalarWhereInput = {
    AND?: cuentascompletasScalarWhereInput | cuentascompletasScalarWhereInput[]
    OR?: cuentascompletasScalarWhereInput[]
    NOT?: cuentascompletasScalarWhereInput | cuentascompletasScalarWhereInput[]
    id?: BigIntFilter<"cuentascompletas"> | bigint | number
    contacto?: StringFilter<"cuentascompletas"> | string
    plataforma_id?: IntFilter<"cuentascompletas"> | number
    proveedor?: StringNullableFilter<"cuentascompletas"> | string | null
    fecha_compra?: DateTimeNullableFilter<"cuentascompletas"> | Date | string | null
    fecha_vencimiento?: DateTimeNullableFilter<"cuentascompletas"> | Date | string | null
    meses_pagados?: IntNullableFilter<"cuentascompletas"> | number | null
    total_pagado_completa?: DecimalNullableFilter<"cuentascompletas"> | Decimal | DecimalJsLike | number | string | null
    estado?: StringNullableFilter<"cuentascompletas"> | string | null
    comentario?: StringNullableFilter<"cuentascompletas"> | string | null
    contrasena?: StringFilter<"cuentascompletas"> | string
    correo?: StringFilter<"cuentascompletas"> | string
    total_ganado?: DecimalNullableFilter<"cuentascompletas"> | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: DecimalNullableFilter<"cuentascompletas"> | Decimal | DecimalJsLike | number | string | null
  }

  export type inventarioUpsertWithWhereUniqueWithoutPlataformasInput = {
    where: inventarioWhereUniqueInput
    update: XOR<inventarioUpdateWithoutPlataformasInput, inventarioUncheckedUpdateWithoutPlataformasInput>
    create: XOR<inventarioCreateWithoutPlataformasInput, inventarioUncheckedCreateWithoutPlataformasInput>
  }

  export type inventarioUpdateWithWhereUniqueWithoutPlataformasInput = {
    where: inventarioWhereUniqueInput
    data: XOR<inventarioUpdateWithoutPlataformasInput, inventarioUncheckedUpdateWithoutPlataformasInput>
  }

  export type inventarioUpdateManyWithWhereWithoutPlataformasInput = {
    where: inventarioScalarWhereInput
    data: XOR<inventarioUpdateManyMutationInput, inventarioUncheckedUpdateManyWithoutPlataformasInput>
  }

  export type inventarioScalarWhereInput = {
    AND?: inventarioScalarWhereInput | inventarioScalarWhereInput[]
    OR?: inventarioScalarWhereInput[]
    NOT?: inventarioScalarWhereInput | inventarioScalarWhereInput[]
    id?: IntFilter<"inventario"> | number
    plataforma_id?: IntFilter<"inventario"> | number
    correo?: StringFilter<"inventario"> | string
    clave?: StringNullableFilter<"inventario"> | string | null
  }

  export type cuentascompletasCreateWithoutUsuariosInput = {
    id?: bigint | number
    proveedor?: string | null
    fecha_compra?: Date | string | null
    fecha_vencimiento?: Date | string | null
    meses_pagados?: number | null
    total_pagado_completa?: Decimal | DecimalJsLike | number | string | null
    estado?: string | null
    comentario?: string | null
    contrasena: string
    correo: string
    total_ganado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: Decimal | DecimalJsLike | number | string | null
    plataformas: plataformasCreateNestedOneWithoutCuentascompletasInput
  }

  export type cuentascompletasUncheckedCreateWithoutUsuariosInput = {
    id?: bigint | number
    plataforma_id: number
    proveedor?: string | null
    fecha_compra?: Date | string | null
    fecha_vencimiento?: Date | string | null
    meses_pagados?: number | null
    total_pagado_completa?: Decimal | DecimalJsLike | number | string | null
    estado?: string | null
    comentario?: string | null
    contrasena: string
    correo: string
    total_ganado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: Decimal | DecimalJsLike | number | string | null
  }

  export type cuentascompletasCreateOrConnectWithoutUsuariosInput = {
    where: cuentascompletasWhereUniqueInput
    create: XOR<cuentascompletasCreateWithoutUsuariosInput, cuentascompletasUncheckedCreateWithoutUsuariosInput>
  }

  export type cuentascompletasCreateManyUsuariosInputEnvelope = {
    data: cuentascompletasCreateManyUsuariosInput | cuentascompletasCreateManyUsuariosInput[]
    skipDuplicates?: boolean
  }

  export type pantallasCreateWithoutUsuariosInput = {
    nro_pantalla: string
    fecha_compra: Date | string
    fecha_vencimiento: Date | string
    meses_pagados?: number | null
    total_pagado?: Decimal | DecimalJsLike | number | string | null
    estado: string
    comentario?: string | null
    total_ganado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor?: Decimal | DecimalJsLike | number | string | null
    cuentascompartidas: cuentascompartidasCreateNestedOneWithoutPantallasInput
  }

  export type pantallasUncheckedCreateWithoutUsuariosInput = {
    id?: number
    cuenta_id: number
    nro_pantalla: string
    fecha_compra: Date | string
    fecha_vencimiento: Date | string
    meses_pagados?: number | null
    total_pagado?: Decimal | DecimalJsLike | number | string | null
    estado: string
    comentario?: string | null
    total_ganado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor?: Decimal | DecimalJsLike | number | string | null
  }

  export type pantallasCreateOrConnectWithoutUsuariosInput = {
    where: pantallasWhereUniqueInput
    create: XOR<pantallasCreateWithoutUsuariosInput, pantallasUncheckedCreateWithoutUsuariosInput>
  }

  export type pantallasCreateManyUsuariosInputEnvelope = {
    data: pantallasCreateManyUsuariosInput | pantallasCreateManyUsuariosInput[]
    skipDuplicates?: boolean
  }

  export type cuentascompletasUpsertWithWhereUniqueWithoutUsuariosInput = {
    where: cuentascompletasWhereUniqueInput
    update: XOR<cuentascompletasUpdateWithoutUsuariosInput, cuentascompletasUncheckedUpdateWithoutUsuariosInput>
    create: XOR<cuentascompletasCreateWithoutUsuariosInput, cuentascompletasUncheckedCreateWithoutUsuariosInput>
  }

  export type cuentascompletasUpdateWithWhereUniqueWithoutUsuariosInput = {
    where: cuentascompletasWhereUniqueInput
    data: XOR<cuentascompletasUpdateWithoutUsuariosInput, cuentascompletasUncheckedUpdateWithoutUsuariosInput>
  }

  export type cuentascompletasUpdateManyWithWhereWithoutUsuariosInput = {
    where: cuentascompletasScalarWhereInput
    data: XOR<cuentascompletasUpdateManyMutationInput, cuentascompletasUncheckedUpdateManyWithoutUsuariosInput>
  }

  export type pantallasUpsertWithWhereUniqueWithoutUsuariosInput = {
    where: pantallasWhereUniqueInput
    update: XOR<pantallasUpdateWithoutUsuariosInput, pantallasUncheckedUpdateWithoutUsuariosInput>
    create: XOR<pantallasCreateWithoutUsuariosInput, pantallasUncheckedCreateWithoutUsuariosInput>
  }

  export type pantallasUpdateWithWhereUniqueWithoutUsuariosInput = {
    where: pantallasWhereUniqueInput
    data: XOR<pantallasUpdateWithoutUsuariosInput, pantallasUncheckedUpdateWithoutUsuariosInput>
  }

  export type pantallasUpdateManyWithWhereWithoutUsuariosInput = {
    where: pantallasScalarWhereInput
    data: XOR<pantallasUpdateManyMutationInput, pantallasUncheckedUpdateManyWithoutUsuariosInput>
  }

  export type plataformasCreateWithoutInventarioInput = {
    nombre: string
    cantidad_pantallas?: number
    total_pagado_proveedor?: Decimal | DecimalJsLike | number | string | null
    total_pagado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_completa?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: Decimal | DecimalJsLike | number | string | null
    cuentascompartidas?: cuentascompartidasCreateNestedManyWithoutPlataformasInput
    cuentascompletas?: cuentascompletasCreateNestedManyWithoutPlataformasInput
  }

  export type plataformasUncheckedCreateWithoutInventarioInput = {
    id?: number
    nombre: string
    cantidad_pantallas?: number
    total_pagado_proveedor?: Decimal | DecimalJsLike | number | string | null
    total_pagado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_completa?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: Decimal | DecimalJsLike | number | string | null
    cuentascompartidas?: cuentascompartidasUncheckedCreateNestedManyWithoutPlataformasInput
    cuentascompletas?: cuentascompletasUncheckedCreateNestedManyWithoutPlataformasInput
  }

  export type plataformasCreateOrConnectWithoutInventarioInput = {
    where: plataformasWhereUniqueInput
    create: XOR<plataformasCreateWithoutInventarioInput, plataformasUncheckedCreateWithoutInventarioInput>
  }

  export type plataformasUpsertWithoutInventarioInput = {
    update: XOR<plataformasUpdateWithoutInventarioInput, plataformasUncheckedUpdateWithoutInventarioInput>
    create: XOR<plataformasCreateWithoutInventarioInput, plataformasUncheckedCreateWithoutInventarioInput>
    where?: plataformasWhereInput
  }

  export type plataformasUpdateToOneWithWhereWithoutInventarioInput = {
    where?: plataformasWhereInput
    data: XOR<plataformasUpdateWithoutInventarioInput, plataformasUncheckedUpdateWithoutInventarioInput>
  }

  export type plataformasUpdateWithoutInventarioInput = {
    nombre?: StringFieldUpdateOperationsInput | string
    cantidad_pantallas?: IntFieldUpdateOperationsInput | number
    total_pagado_proveedor?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    cuentascompartidas?: cuentascompartidasUpdateManyWithoutPlataformasNestedInput
    cuentascompletas?: cuentascompletasUpdateManyWithoutPlataformasNestedInput
  }

  export type plataformasUncheckedUpdateWithoutInventarioInput = {
    id?: IntFieldUpdateOperationsInput | number
    nombre?: StringFieldUpdateOperationsInput | string
    cantidad_pantallas?: IntFieldUpdateOperationsInput | number
    total_pagado_proveedor?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    cuentascompartidas?: cuentascompartidasUncheckedUpdateManyWithoutPlataformasNestedInput
    cuentascompletas?: cuentascompletasUncheckedUpdateManyWithoutPlataformasNestedInput
  }

  export type pantallasCreateManyCuentascompartidasInput = {
    id?: number
    contacto: string
    nro_pantalla: string
    fecha_compra: Date | string
    fecha_vencimiento: Date | string
    meses_pagados?: number | null
    total_pagado?: Decimal | DecimalJsLike | number | string | null
    estado: string
    comentario?: string | null
    total_ganado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor?: Decimal | DecimalJsLike | number | string | null
  }

  export type pantallasUpdateWithoutCuentascompartidasInput = {
    nro_pantalla?: StringFieldUpdateOperationsInput | string
    fecha_compra?: DateTimeFieldUpdateOperationsInput | Date | string
    fecha_vencimiento?: DateTimeFieldUpdateOperationsInput | Date | string
    meses_pagados?: NullableIntFieldUpdateOperationsInput | number | null
    total_pagado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    estado?: StringFieldUpdateOperationsInput | string
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    total_ganado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    usuarios?: usuariosUpdateOneRequiredWithoutPantallasNestedInput
  }

  export type pantallasUncheckedUpdateWithoutCuentascompartidasInput = {
    id?: IntFieldUpdateOperationsInput | number
    contacto?: StringFieldUpdateOperationsInput | string
    nro_pantalla?: StringFieldUpdateOperationsInput | string
    fecha_compra?: DateTimeFieldUpdateOperationsInput | Date | string
    fecha_vencimiento?: DateTimeFieldUpdateOperationsInput | Date | string
    meses_pagados?: NullableIntFieldUpdateOperationsInput | number | null
    total_pagado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    estado?: StringFieldUpdateOperationsInput | string
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    total_ganado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
  }

  export type pantallasUncheckedUpdateManyWithoutCuentascompartidasInput = {
    id?: IntFieldUpdateOperationsInput | number
    contacto?: StringFieldUpdateOperationsInput | string
    nro_pantalla?: StringFieldUpdateOperationsInput | string
    fecha_compra?: DateTimeFieldUpdateOperationsInput | Date | string
    fecha_vencimiento?: DateTimeFieldUpdateOperationsInput | Date | string
    meses_pagados?: NullableIntFieldUpdateOperationsInput | number | null
    total_pagado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    estado?: StringFieldUpdateOperationsInput | string
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    total_ganado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
  }

  export type cuentascompartidasCreateManyPlataformasInput = {
    id?: number
    correo: string
    contrasena: string
    proveedor?: string | null
    cuenta_caida?: boolean
  }

  export type cuentascompletasCreateManyPlataformasInput = {
    id?: bigint | number
    contacto: string
    proveedor?: string | null
    fecha_compra?: Date | string | null
    fecha_vencimiento?: Date | string | null
    meses_pagados?: number | null
    total_pagado_completa?: Decimal | DecimalJsLike | number | string | null
    estado?: string | null
    comentario?: string | null
    contrasena: string
    correo: string
    total_ganado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: Decimal | DecimalJsLike | number | string | null
  }

  export type inventarioCreateManyPlataformasInput = {
    id?: number
    correo: string
    clave?: string | null
  }

  export type cuentascompartidasUpdateWithoutPlataformasInput = {
    correo?: StringFieldUpdateOperationsInput | string
    contrasena?: StringFieldUpdateOperationsInput | string
    proveedor?: NullableStringFieldUpdateOperationsInput | string | null
    cuenta_caida?: BoolFieldUpdateOperationsInput | boolean
    pantallas?: pantallasUpdateManyWithoutCuentascompartidasNestedInput
  }

  export type cuentascompartidasUncheckedUpdateWithoutPlataformasInput = {
    id?: IntFieldUpdateOperationsInput | number
    correo?: StringFieldUpdateOperationsInput | string
    contrasena?: StringFieldUpdateOperationsInput | string
    proveedor?: NullableStringFieldUpdateOperationsInput | string | null
    cuenta_caida?: BoolFieldUpdateOperationsInput | boolean
    pantallas?: pantallasUncheckedUpdateManyWithoutCuentascompartidasNestedInput
  }

  export type cuentascompartidasUncheckedUpdateManyWithoutPlataformasInput = {
    id?: IntFieldUpdateOperationsInput | number
    correo?: StringFieldUpdateOperationsInput | string
    contrasena?: StringFieldUpdateOperationsInput | string
    proveedor?: NullableStringFieldUpdateOperationsInput | string | null
    cuenta_caida?: BoolFieldUpdateOperationsInput | boolean
  }

  export type cuentascompletasUpdateWithoutPlataformasInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    proveedor?: NullableStringFieldUpdateOperationsInput | string | null
    fecha_compra?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fecha_vencimiento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    meses_pagados?: NullableIntFieldUpdateOperationsInput | number | null
    total_pagado_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    estado?: NullableStringFieldUpdateOperationsInput | string | null
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    contrasena?: StringFieldUpdateOperationsInput | string
    correo?: StringFieldUpdateOperationsInput | string
    total_ganado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    usuarios?: usuariosUpdateOneRequiredWithoutCuentascompletasNestedInput
  }

  export type cuentascompletasUncheckedUpdateWithoutPlataformasInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    contacto?: StringFieldUpdateOperationsInput | string
    proveedor?: NullableStringFieldUpdateOperationsInput | string | null
    fecha_compra?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fecha_vencimiento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    meses_pagados?: NullableIntFieldUpdateOperationsInput | number | null
    total_pagado_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    estado?: NullableStringFieldUpdateOperationsInput | string | null
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    contrasena?: StringFieldUpdateOperationsInput | string
    correo?: StringFieldUpdateOperationsInput | string
    total_ganado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
  }

  export type cuentascompletasUncheckedUpdateManyWithoutPlataformasInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    contacto?: StringFieldUpdateOperationsInput | string
    proveedor?: NullableStringFieldUpdateOperationsInput | string | null
    fecha_compra?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fecha_vencimiento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    meses_pagados?: NullableIntFieldUpdateOperationsInput | number | null
    total_pagado_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    estado?: NullableStringFieldUpdateOperationsInput | string | null
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    contrasena?: StringFieldUpdateOperationsInput | string
    correo?: StringFieldUpdateOperationsInput | string
    total_ganado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
  }

  export type inventarioUpdateWithoutPlataformasInput = {
    correo?: StringFieldUpdateOperationsInput | string
    clave?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type inventarioUncheckedUpdateWithoutPlataformasInput = {
    id?: IntFieldUpdateOperationsInput | number
    correo?: StringFieldUpdateOperationsInput | string
    clave?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type inventarioUncheckedUpdateManyWithoutPlataformasInput = {
    id?: IntFieldUpdateOperationsInput | number
    correo?: StringFieldUpdateOperationsInput | string
    clave?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type cuentascompletasCreateManyUsuariosInput = {
    id?: bigint | number
    plataforma_id: number
    proveedor?: string | null
    fecha_compra?: Date | string | null
    fecha_vencimiento?: Date | string | null
    meses_pagados?: number | null
    total_pagado_completa?: Decimal | DecimalJsLike | number | string | null
    estado?: string | null
    comentario?: string | null
    contrasena: string
    correo: string
    total_ganado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: Decimal | DecimalJsLike | number | string | null
  }

  export type pantallasCreateManyUsuariosInput = {
    id?: number
    cuenta_id: number
    nro_pantalla: string
    fecha_compra: Date | string
    fecha_vencimiento: Date | string
    meses_pagados?: number | null
    total_pagado?: Decimal | DecimalJsLike | number | string | null
    estado: string
    comentario?: string | null
    total_ganado?: Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor?: Decimal | DecimalJsLike | number | string | null
  }

  export type cuentascompletasUpdateWithoutUsuariosInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    proveedor?: NullableStringFieldUpdateOperationsInput | string | null
    fecha_compra?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fecha_vencimiento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    meses_pagados?: NullableIntFieldUpdateOperationsInput | number | null
    total_pagado_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    estado?: NullableStringFieldUpdateOperationsInput | string | null
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    contrasena?: StringFieldUpdateOperationsInput | string
    correo?: StringFieldUpdateOperationsInput | string
    total_ganado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    plataformas?: plataformasUpdateOneRequiredWithoutCuentascompletasNestedInput
  }

  export type cuentascompletasUncheckedUpdateWithoutUsuariosInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    plataforma_id?: IntFieldUpdateOperationsInput | number
    proveedor?: NullableStringFieldUpdateOperationsInput | string | null
    fecha_compra?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fecha_vencimiento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    meses_pagados?: NullableIntFieldUpdateOperationsInput | number | null
    total_pagado_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    estado?: NullableStringFieldUpdateOperationsInput | string | null
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    contrasena?: StringFieldUpdateOperationsInput | string
    correo?: StringFieldUpdateOperationsInput | string
    total_ganado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
  }

  export type cuentascompletasUncheckedUpdateManyWithoutUsuariosInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    plataforma_id?: IntFieldUpdateOperationsInput | number
    proveedor?: NullableStringFieldUpdateOperationsInput | string | null
    fecha_compra?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    fecha_vencimiento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    meses_pagados?: NullableIntFieldUpdateOperationsInput | number | null
    total_pagado_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    estado?: NullableStringFieldUpdateOperationsInput | string | null
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    contrasena?: StringFieldUpdateOperationsInput | string
    correo?: StringFieldUpdateOperationsInput | string
    total_ganado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor_completa?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
  }

  export type pantallasUpdateWithoutUsuariosInput = {
    nro_pantalla?: StringFieldUpdateOperationsInput | string
    fecha_compra?: DateTimeFieldUpdateOperationsInput | Date | string
    fecha_vencimiento?: DateTimeFieldUpdateOperationsInput | Date | string
    meses_pagados?: NullableIntFieldUpdateOperationsInput | number | null
    total_pagado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    estado?: StringFieldUpdateOperationsInput | string
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    total_ganado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    cuentascompartidas?: cuentascompartidasUpdateOneRequiredWithoutPantallasNestedInput
  }

  export type pantallasUncheckedUpdateWithoutUsuariosInput = {
    id?: IntFieldUpdateOperationsInput | number
    cuenta_id?: IntFieldUpdateOperationsInput | number
    nro_pantalla?: StringFieldUpdateOperationsInput | string
    fecha_compra?: DateTimeFieldUpdateOperationsInput | Date | string
    fecha_vencimiento?: DateTimeFieldUpdateOperationsInput | Date | string
    meses_pagados?: NullableIntFieldUpdateOperationsInput | number | null
    total_pagado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    estado?: StringFieldUpdateOperationsInput | string
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    total_ganado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
  }

  export type pantallasUncheckedUpdateManyWithoutUsuariosInput = {
    id?: IntFieldUpdateOperationsInput | number
    cuenta_id?: IntFieldUpdateOperationsInput | number
    nro_pantalla?: StringFieldUpdateOperationsInput | string
    fecha_compra?: DateTimeFieldUpdateOperationsInput | Date | string
    fecha_vencimiento?: DateTimeFieldUpdateOperationsInput | Date | string
    meses_pagados?: NullableIntFieldUpdateOperationsInput | number | null
    total_pagado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    estado?: StringFieldUpdateOperationsInput | string
    comentario?: NullableStringFieldUpdateOperationsInput | string | null
    total_ganado?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    total_pagado_proveedor?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}