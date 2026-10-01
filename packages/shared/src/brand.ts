declare const BrandTag: unique symbol;

/**
 * Brand type helper for zero-runtime nominal typing.
 */
export type Brand<T, TBrand extends string> = T & { readonly [BrandTag]: TBrand };
