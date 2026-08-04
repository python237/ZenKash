/**
 * AI Report Service
 *
 * Turns a financial snapshot into the plain-text prompt the user sends to an
 * external assistant. Pure: it receives its data and its formatters, so the
 * exact text can be reviewed, diffed and tested without any store.
 *
 * ⚠️ This is the only place in the app that produces content meant to leave the
 * device. Two consequences, both deliberate:
 * - transaction descriptions are **never** included — they are the most likely
 *   place for third-party names and other personal data;
 * - the wording lives in a local dictionary rather than the i18n bundle: it is
 *   prompt content, not interface text, and it must be reviewable in one place
 *   next to the privacy rules it has to respect.
 * @module services/ai-report
 */

import type {
    AiReportData,
    AiReportOptions,
    ReportFormatters,
    ReportLanguage,
} from 'src/types/ai-report';

/**
 * Wording of the report body. Declared explicitly rather than as an index
 * signature so a missing key is a compile error, not an `undefined` in the text
 * the user is about to send out.
 */
interface ReportLabels {
    /** Report heading */
    title: string;
    /** Opening instruction to the assistant */
    intro: string;
    /** Currency disclosure, with a `{currency}` placeholder */
    currencyNote: string;
    /** Notice shown when absolute amounts are withheld */
    percentOnlyNote: string;
    /** Notice stating transaction labels are excluded */
    noDescriptions: string;
    /** "Period" */
    period: string;
    /** "Overview" section heading */
    overview: string;
    /** "Income" */
    income: string;
    /** "Expenses" */
    expenses: string;
    /** "Net" */
    net: string;
    /** "Savings rate" */
    savingsRate: string;
    /** "Share of income" */
    shareOfIncome: string;
    /** "Month by month" section heading */
    monthByMonth: string;
    /** "Month" column header */
    month: string;
    /** "Share" column header */
    share: string;
    /** Expenses-by-group section heading */
    expensesByGroup: string;
    /** Income-by-group section heading */
    incomeByGroup: string;
    /** "Master category" column header */
    group: string;
    /** "Amount" column header */
    amount: string;
    /** Commitments section heading */
    commitments: string;
    /** Budgets section heading */
    budgets: string;
    /** Net worth section heading */
    netWorth: string;
    /** "used", suffixed after a budget ratio */
    used: string;
    /** Prefix of an anonymized master category */
    anonymizedGroup: string;
    /** Prefix of an anonymized commitment */
    anonymizedCommitment: string;
    /** Prefix of an anonymized budget */
    anonymizedBudget: string;
    /** Closing section heading */
    ask: string;
    /** Numbered questions asked to the assistant */
    questions: string;
    /** Placeholder for an empty period */
    noData: string;
}

/** Report wording, per supported language. */
const LABELS: Record<ReportLanguage, ReportLabels> = {
    fr: {
        title: 'Analyse de mes finances personnelles',
        intro: 'Voici un extrait de mes données financières personnelles, exporté depuis mon application de gestion budgétaire. Analyse-les et réponds en français.',
        currencyNote: 'Devise : {currency}. Tous les montants sont convertis dans cette devise.',
        percentOnlyNote:
            'Les montants absolus sont volontairement omis : seules les parts et les taux sont fournis.',
        noDescriptions:
            "Aucun libellé de transaction n'est inclus dans cet extrait.",
        period: 'Période',
        overview: "Vue d'ensemble",
        income: 'Revenus',
        expenses: 'Dépenses',
        net: 'Net',
        savingsRate: "Taux d'épargne",
        shareOfIncome: 'Part des revenus',
        monthByMonth: 'Mois par mois',
        month: 'Mois',
        share: 'Part',
        expensesByGroup: 'Dépenses par grande catégorie',
        incomeByGroup: 'Revenus par grande catégorie',
        group: 'Grande catégorie',
        amount: 'Montant',
        commitments: 'Engagements récurrents actifs',
        budgets: 'Budgets du mois en cours',
        netWorth: 'Évolution du patrimoine',
        used: 'utilisé',
        anonymizedGroup: 'Grande catégorie',
        anonymizedCommitment: 'Engagement',
        anonymizedBudget: 'Budget',
        ask: 'Ce que j’attends de toi',
        questions: [
            '1. Fais un diagnostic honnête de ma situation : ce qui va bien, ce qui ne va pas.',
            '2. Repère les dérives et les postes anormalement élevés au regard du reste.',
            '3. Identifie mes trois plus gros leviers d’économies, chiffrés.',
            '4. Propose un budget cible par grande catégorie, cohérent avec mes revenus.',
            '5. Donne-moi trois actions concrètes à mettre en place le mois prochain.',
        ].join('\n'),
        noData: 'Aucune donnée sur cette période.',
    },
    en: {
        title: 'Personal finance analysis',
        intro: 'Here is an extract of my personal financial data, exported from my budgeting app. Analyse it and answer in English.',
        currencyNote: 'Currency: {currency}. Every amount is converted into it.',
        percentOnlyNote:
            'Absolute amounts are deliberately omitted: only shares and rates are provided.',
        noDescriptions: 'No transaction labels are included in this extract.',
        period: 'Period',
        overview: 'Overview',
        income: 'Income',
        expenses: 'Expenses',
        net: 'Net',
        savingsRate: 'Savings rate',
        shareOfIncome: 'Share of income',
        monthByMonth: 'Month by month',
        month: 'Month',
        share: 'Share',
        expensesByGroup: 'Expenses by master category',
        incomeByGroup: 'Income by master category',
        group: 'Master category',
        amount: 'Amount',
        commitments: 'Active recurring commitments',
        budgets: 'Budgets for the current month',
        netWorth: 'Net worth trend',
        used: 'used',
        anonymizedGroup: 'Master category',
        anonymizedCommitment: 'Commitment',
        anonymizedBudget: 'Budget',
        ask: 'What I expect from you',
        questions: [
            '1. Give me an honest diagnosis: what works, what does not.',
            '2. Spot the drifts and the categories that are abnormally high compared with the rest.',
            '3. Identify my three biggest saving levers, with figures.',
            '4. Propose a target budget per master category, consistent with my income.',
            '5. Give me three concrete actions to put in place next month.',
        ].join('\n'),
        noData: 'No data for this period.',
    },
};

/**
 * Replaces a display name with a neutral, stable label.
 * @param prefix - Localized label prefix
 * @param index - Zero-based position of the item
 * @returns The anonymized label, for example `Grande catégorie 2`
 */
function anonymize(prefix: string, index: number): string {
    return `${prefix} ${index + 1}`;
}

/**
 * Builds the report text sent for external analysis.
 * @param data - The financial snapshot
 * @param options - User-controlled options
 * @param format - Amount and percentage formatters
 * @returns The report as markdown-flavoured plain text
 */
export function buildAiReport(
    data: AiReportData,
    options: AiReportOptions,
    format: ReportFormatters,
): string {
    const label = LABELS[options.language];
    const withAmounts = options.includeAmounts;
    const lines: string[] = [];

    /**
     * Renders a value as an amount, or as a share of a reference when absolute
     * amounts are withheld.
     * @param amount - The amount to render
     * @param reference - Total the share is computed against
     * @returns The rendered value
     */
    const value = (amount: number, reference: number): string => {
        if (withAmounts) return format.amount(amount);
        return reference > 0 ? format.percent((amount / reference) * 100) : '—';
    };

    // Header
    lines.push(`# ${label.title}`, '', label.intro, '');
    if (withAmounts) {
        lines.push(label.currencyNote.replace('{currency}', data.currency));
    } else {
        lines.push(label.percentOnlyNote);
    }
    lines.push(label.noDescriptions, '', `**${label.period}** : ${data.periodLabel}`, '');

    // Overview
    const { inflow, outflow, net, savingsRate } = data.totals;
    lines.push(`## ${label.overview}`, '');
    if (withAmounts) {
        lines.push(
            `- ${label.income} : ${format.amount(inflow)}`,
            `- ${label.expenses} : ${format.amount(outflow)}`,
            `- ${label.net} : ${format.amount(net)}`,
        );
    } else {
        lines.push(
            `- ${label.expenses} (${label.shareOfIncome}) : ${value(outflow, inflow)}`,
        );
    }
    lines.push(`- ${label.savingsRate} : ${format.percent(savingsRate)}`, '');

    // Month by month
    lines.push(`## ${label.monthByMonth}`, '');
    if (data.months.length === 0) {
        lines.push(label.noData, '');
    } else {
        lines.push(
            withAmounts
                ? `| ${label.month} | ${label.income} | ${label.expenses} | ${label.net} | ${label.savingsRate} |`
                : `| ${label.month} | ${label.expenses} (${label.shareOfIncome}) | ${label.savingsRate} |`,
            withAmounts ? '|---|---|---|---|---|' : '|---|---|---|',
        );
        for (const month of data.months) {
            lines.push(
                withAmounts
                    ? `| ${month.label} | ${format.amount(month.inflow)} | ${format.amount(month.outflow)} | ${format.amount(month.net)} | ${format.percent(month.savingsRate)} |`
                    : `| ${month.label} | ${value(month.outflow, month.inflow)} | ${format.percent(month.savingsRate)} |`,
            );
        }
        lines.push('');
    }

    // Groups per direction
    for (const [heading, groups, prefix] of [
        [label.expensesByGroup, data.expenseGroups, label.anonymizedGroup],
        [label.incomeByGroup, data.incomeGroups, label.anonymizedGroup],
    ] as const) {
        if (groups.length === 0) continue;

        lines.push(`## ${heading}`, '');
        lines.push(
            withAmounts
                ? `| ${label.group} | ${label.amount} | ${label.share} |`
                : `| ${label.group} | ${label.share} |`,
            withAmounts ? '|---|---|---|' : '|---|---|',
        );
        groups.forEach((group, index) => {
            const name = options.anonymizeLabels ? anonymize(prefix, index) : group.name;
            lines.push(
                withAmounts
                    ? `| ${name} | ${format.amount(group.amount)} | ${format.percent(group.percent)} |`
                    : `| ${name} | ${format.percent(group.percent)} |`,
            );
        });
        lines.push('');
    }

    // Recurring commitments
    if (data.commitments.length > 0) {
        // A commitment is per occurrence, so its share is expressed against the
        // average monthly income rather than the whole window's total.
        const monthlyIncome = data.totals.inflow / Math.max(1, data.months.length);

        lines.push(`## ${label.commitments}`, '');
        data.commitments.forEach((commitment, index) => {
            const name = options.anonymizeLabels
                ? anonymize(label.anonymizedCommitment, index)
                : commitment.name;
            const direction = commitment.direction === 'in' ? label.income : label.expenses;
            const rendered = withAmounts
                ? format.amount(commitment.amount)
                : value(commitment.amount, monthlyIncome);
            lines.push(`- ${name} (${direction}) : ${rendered} / ${commitment.frequency}`);
        });
        lines.push('');
    }

    // Budgets of the current month
    if (data.budgets.length > 0) {
        lines.push(`## ${label.budgets}`, '');
        data.budgets.forEach((budget, index) => {
            const name = options.anonymizeLabels
                ? anonymize(label.anonymizedBudget, index)
                : budget.name;
            const rendered = withAmounts
                ? `${format.amount(budget.spent)} / ${format.amount(budget.amount)}`
                : '';
            lines.push(
                `- ${name} : ${rendered}${rendered ? ' · ' : ''}${format.percent(budget.percentUsed)} ${label.used}`,
            );
        });
        lines.push('');
    }

    // Net worth trend (amounts only: a share of itself carries no information)
    if (withAmounts && data.netWorth.length > 0) {
        lines.push(`## ${label.netWorth}`, '');
        for (const point of data.netWorth) {
            lines.push(`- ${point.label} : ${format.amount(point.total)}`);
        }
        lines.push('');
    }

    // The ask
    lines.push(`## ${label.ask}`, '', label.questions, '');

    return lines.join('\n');
}
