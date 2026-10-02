/**
 * Wallet History Service
 *
 * Reads every movement of one wallet, most recent first, one page at a time.
 * Only the requested page is loaded, so a wallet with years of history stays
 * cheap to open.
 *
 * The balance after each movement is not stored: it is rebuilt backwards from
 * the current balance, subtracting each movement's effect. That is why every
 * source adjusting a wallet balance must appear here (transactions, transfers,
 * investment buys/sells, bets): a missing one would skew all older balances.
 * Whatever remains once the oldest movement is passed is the opening balance
 * (initial balance plus manual corrections).
 * @module services/wallet-history
 */

import type {
    WalletHistoryCursor,
    WalletHistoryEntry,
    WalletMovement,
    WalletMovementKind,
} from 'src/types/wallet-history';
import { query } from 'src/services/database';

/** Default number of movements per page */
export const WALLET_HISTORY_PAGE_SIZE = 30;

/**
 *
 */
interface WalletMovementRow {
    key: string;
    kind: WalletMovementKind;
    date: string;
    created_at: string;
    delta: number;
    label: string | null;
    icon: string | null;
    description: string | null;
    fee: number | null;
}

// The debt direction decides which way a debt movement goes: lending sends
// money out, borrowing brings it in, a repayment goes the opposite way. An
// orphan debt movement never touched the balance, hence 0.
const MOVEMENTS_SQL = `
    SELECT t.id || ':w' AS key,
        CASE
            WHEN t.type = 'project' THEN 'project_' || t.project_transaction_type
            WHEN t.type = 'debt' THEN 'debt_' || t.debt_transaction_type
            ELSE t.type
        END AS kind,
        t.date AS date, t.created_at AS created_at,
        CASE
            WHEN t.type = 'income' THEN t.amount
            WHEN t.type = 'expense' THEN -t.amount
            WHEN t.type = 'project' AND t.project_transaction_type = 'injection' THEN -t.amount
            WHEN t.type = 'project' THEN t.amount
            WHEN d.direction IS NULL THEN 0
            WHEN (t.debt_transaction_type = 'principal' AND d.direction = 'lent')
                OR (t.debt_transaction_type = 'repayment' AND d.direction = 'borrowed')
                THEN -t.amount
            ELSE t.amount
        END AS delta,
        COALESCE(c.name, p.name, d.counterparty) AS label,
        c.icon AS icon, t.description AS description, NULL AS fee
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    LEFT JOIN projects p ON p.id = t.project_id
    LEFT JOIN debts d ON d.id = t.debt_id
    WHERE t.wallet_id = :wallet AND t.type IN ('income', 'expense', 'project', 'debt')

    UNION ALL
    SELECT t.id || ':out', 'transfer_out', t.date, t.created_at,
        -(t.amount + COALESCE(t.fee, 0)), w.name, w.icon, t.description, t.fee
    FROM transactions t
    LEFT JOIN wallets w ON w.id = t.to_wallet_id
    WHERE t.type = 'transfer' AND t.from_wallet_id = :wallet

    UNION ALL
    SELECT t.id || ':in', 'transfer_in', t.date, t.created_at,
        t.amount, w.name, w.icon, t.description, NULL
    FROM transactions t
    LEFT JOIN wallets w ON w.id = t.from_wallet_id
    WHERE t.type = 'transfer' AND t.to_wallet_id = :wallet

    UNION ALL
    SELECT it.id || ':inv', 'investment_' || it.type, it.date, it.created_at,
        CASE WHEN it.type = 'buy' THEN -1 ELSE 1 END * it.quantity * it.price_per_unit,
        ii.label, NULL, NULL, NULL
    FROM investment_transactions it
    JOIN investment_items ii ON ii.id = it.investment_item_id
    WHERE ii.wallet_id = :wallet

    UNION ALL
    SELECT b.id || ':stake', 'bet_stake', b.placed_at, b.created_at,
        -b.stake, g.name, g.icon, b.description, NULL
    FROM bets b
    JOIN games g ON g.id = b.game_id
    WHERE g.wallet_id = :wallet

    UNION ALL
    SELECT b.id || ':payout', 'bet_payout', COALESCE(b.resolved_at, b.placed_at), b.updated_at,
        COALESCE(b.payout, 0), g.name, g.icon, b.description, NULL
    FROM bets b
    JOIN games g ON g.id = b.game_id
    WHERE g.wallet_id = :wallet AND b.status = 'won'
`;

/**
 * Converts a database row to a movement.
 * @param row - The raw movement row
 * @returns The typed movement
 */
function rowToMovement(row: WalletMovementRow): WalletMovement {
    return {
        key: row.key,
        kind: row.kind,
        date: new Date(row.date),
        delta: row.delta,
        label: row.label ?? undefined,
        icon: row.icon ?? undefined,
        description: row.description ?? undefined,
        fee: row.fee ?? undefined,
        cursor: { date: row.date, createdAt: row.created_at, key: row.key },
    };
}

/**
 * Loads one page of a wallet's movements, most recent first.
 * @param walletId - The wallet identifier
 * @param after - Last movement of the previous page, omitted for the first page
 * @param limit - Maximum number of movements to return
 * @returns The movements of the page; fewer than `limit` means the end is reached
 */
export async function fetchWalletMovements(
    walletId: string,
    after?: WalletHistoryCursor,
    limit = WALLET_HISTORY_PAGE_SIZE,
): Promise<WalletMovement[]> {
    // Positional parameters only: named ones are not portable across the
    // native and web SQLite drivers, so the wallet id is repeated per branch.
    const branches = MOVEMENTS_SQL.split(':wallet');
    const sql = branches.join('?');
    const values: unknown[] = Array.from({ length: branches.length - 1 }, () => walletId);

    // Expanded tuple comparison (date, created_at, key) < cursor, in the same
    // order as the ORDER BY below.
    let where = '';
    if (after) {
        where = `WHERE m.date < ? OR (m.date = ? AND (m.created_at < ? OR (m.created_at = ? AND m.key < ?)))`;
        values.push(after.date, after.date, after.createdAt, after.createdAt, after.key);
    }
    values.push(limit);

    const rows = await query<WalletMovementRow>(
        `SELECT * FROM (${sql}) m ${where}
         ORDER BY m.date DESC, m.created_at DESC, m.key DESC
         LIMIT ?`,
        values,
    );
    return rows.map(rowToMovement);
}

/**
 * Attaches the balance after each movement, walking backwards in time.
 * @param movements - Consecutive movements, most recent first
 * @param balanceAfterFirst - Wallet balance right after the first movement
 * @returns The entries, and the balance before the last one (start of the next page)
 */
export function withRunningBalance(
    movements: WalletMovement[],
    balanceAfterFirst: number,
): { entries: WalletHistoryEntry[]; balanceBefore: number } {
    let balance = balanceAfterFirst;
    const entries = movements.map((movement) => {
        const entry = { ...movement, balanceAfter: balance };
        balance -= movement.delta;
        return entry;
    });
    return { entries, balanceBefore: balance };
}
