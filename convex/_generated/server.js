import {
  query as rawQuery,
  mutation as rawMutation,
  action as rawAction,
  internalQuery as rawInternalQuery,
  internalMutation as rawInternalMutation,
  internalAction as rawInternalAction,
} from "convex/server";

export const query = rawQuery;
export const mutation = rawMutation;
export const action = rawAction;
export const internalQuery = rawInternalQuery;
export const internalMutation = rawInternalMutation;
export const internalAction = rawInternalAction;
