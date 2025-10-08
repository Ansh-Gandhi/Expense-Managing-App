import { query } from "./_generated/server";
import { v } from "convex/values";

export const getUsersWithOutstandingDebts = query({
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        const result = [];

        const expenses = await ctx.db.query("expenses").filter((q) => q.eq(q.field("groupId"), undefined)).collect();

        const settlements = await ctx.db.query("settlements").filter((q) => q.eq(q.field("groupId"), undefined)).collect();

        const userCache = new Map();
        const getUser = async (id) => {
            if (!userCache.has(id)) {
                userCache.set(id, await ctx.db.get(id));
            }
            return userCache.get(id);
        };

        for (const user of users) {
            const ledger = new Map();
            for (const exp of expenses) {
                if (exp.paidByUserId !== user._id) {
                    const split = exp.splits.find((s) => s.userId === user._id && !s.paid);
                    if (!split) continue;

                    const entry = ledger.get(exp.paidByUserId) ?? {
                        amount: 0,
                        since: exp.date,
                    };
                    entry.amount += split.amount;
                    entry.since = Math.min(entry.since, exp.date);
                    ledger.set(exp.paidByUserId, entry);
                } else {
                    for (const s of exp.splits) {
                        if (s.userId === user._id || s.paid) continue;

                        const entry = ledger.get(s.userId) ?? {
                            amount: 0,
                            since: exp.date, 
                        };
                        entry.amount -= s.amount; 
                        ledger.set(s.userId, entry);
                    }
                }
            }

            for (const s of settlements) {
                if (s.paidByUserId === user._id) {
                    const entry = ledger.get(s.receivedByUserId);

                    if (entry) {
                        entry.amount -= s.amount;
                        if (entry.amount === 0) ledger.delete(s.receivedByUserId);
                        else ledger.set(s.receivedByUserId, entry);
                    }
                } else if (s.receivedByUserId === user._id) {
                    const entry = ledger.get(s.paidByUserId);
                    if (entry) {
                        entry.amount += s.amount; // entry.amount is negative
                        if (entry.amount === 0) {
                            ledger.delete(s.paidByUserId);
                        } else {
                            ledger.set(s.paidByUserId, entry)
                        };
                    }
                }
            }

            const debts = [];
            for (const [counterId, { amount, since }] of ledger) {
                if (amount > 0) {
                    const counter = await getUser(counterId);
                    debts.push({
                        userId: counterId,
                        name: counter?.name ?? "Unknown",
                        amount,
                        since,
                    });
                }
            }

            if (debts.length) {
                result.push({
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    debts,
                });
            }
        }

        return result;
    },
});

export const getUsersWithExpenses = query({
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        const result = [];

        const now = new Date();
        const oneMonthAgo = new Date(now);
        oneMonthAgo.setMonth(now.getMonth() - 1);
        const monthStart = oneMonthAgo.getTime();

        for (const user of users) {
            const paidExpenses = await ctx.db.query("expenses").withIndex("by_date", (q) => q.gte("date", monthStart))
                .filter((q) => q.eq(q.field("paidByUserId"), user._id)).collect();

            const allRecentExpenses = await ctx.db.query("expenses").withIndex("by_date", (q) => q.gte("date", monthStart)).collect();

            const splitExpenses = allRecentExpenses.filter((expense) => expense.splits.some((split) => split.userId === user._id));

            const userExpenses = [...new Set([...paidExpenses, ...splitExpenses])];

            if (userExpenses.length > 0) {
                result.push({
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                });
            }
        }

        return result;
    },
});

export const getUserMonthlyExpenses = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const now = new Date();
        const oneMonthAgo = new Date(now);
        oneMonthAgo.setMonth(now.getMonth() - 1);
        const monthStart = oneMonthAgo.getTime();

        const allExpenses = await ctx.db.query("expenses").withIndex("by_date", (q) => q.gte("date", monthStart)).collect();

        const userExpenses = allExpenses.filter((expense) => {
            const isInvolved = expense.paidByUserId === args.userId || expense.splits.some((split) => split.userId === args.userId);
            return isInvolved;
        });

        return userExpenses.map((expense) => {
            const userSplit = expense.splits.find((split) => split.userId === args.userId);

            return {
                description: expense.description,
                category: expense.category,
                date: expense.date,
                amount: userSplit ? userSplit.amount : 0,
                isPayer: expense.paidByUserId === args.userId,
                isGroup: expense.groupId !== undefined,
            };
        });
    },
});
