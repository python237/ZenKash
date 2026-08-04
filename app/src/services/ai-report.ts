/**
 * AI Report Service
 *
 * Turns a financial snapshot into the plain-text prompt the user sends to an
 * external assistant. Pure: it receives its data and its formatters, so the
 * exact text can be reviewed, diffed and tested without any store.
 *
 * ⚠️ This is the only place in the app that produces content meant to leave the
 * device. Two consequences, both deliberate:
 * - transaction descriptions are user-written free text and the likeliest place
 *   for third-party names, so they only appear in the detailed listings and the
 *   `anonymizeLabels` switch drops those listings entirely;
 * - the wording lives in a local dictionary rather than the i18n bundle: it is
 *   prompt content, not interface text, and it must be reviewable in one place
 *   next to the privacy rules it has to respect.
 * @module services/ai-report
 */

import type {
    AiReportData,
    AiReportOptions,
    ReportEntry,
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
    /** "Allocated" */
    allocated: string;
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
    /** "Savings" column header */
    savings: string;
    /** Savings goals section heading */
    goals: string;
    /** Detailed net worth section heading */
    assets: string;
    /** Suffix marking an amount put into a holding */
    invested: string;
    /** Suffix marking dividends received */
    dividends: string;
    /** Total line of the detailed net worth */
    assetsTotal: string;
    /** Note explaining how projects are valued in that total */
    assetsTotalNote: string;
    /** Income detail section heading */
    incomeDetail: string;
    /** Large expenses section heading, with a `{threshold}` placeholder */
    largeExpenses: string;
    /** Notice disclosing that a list was capped, with `{shown}` and `{total}` */
    listCapped: string;
    /** Notice explaining why free-text sections are missing */
    labelsWithheld: string;
    /** Monthly requirement of a goal, with `{amount}` and `{months}` */
    goalPace: string;
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
        allocated: 'Alloué (projets, jeux — non dépensé)',
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
        savings: 'Épargne',
        goals: "Objectifs d'épargne",
        assets: 'Patrimoine détaillé',
        invested: 'investi',
        dividends: 'dividendes reçus',
        assetsTotal: 'Total',
        assetsTotalNote:
            'les projets sont comptés à leur montant investi, ce qui peut différer du suivi de patrimoine',
        incomeDetail: 'Revenus détaillés',
        largeExpenses: 'Dépenses importantes (> {threshold})',
        listCapped: '({shown} listés sur {total})',
        labelsWithheld:
            'Les listes détaillées (revenus, grosses dépenses) sont omises : les libellés sont anonymisés.',
        goalPace: 'requis {amount}/mois sur {months} mois',
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
        allocated: 'Allocated (projects, games — not spent)',
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
        savings: 'Savings',
        goals: 'Savings goals',
        assets: 'Detailed net worth',
        invested: 'invested',
        dividends: 'dividends received',
        assetsTotal: 'Total',
        assetsTotalNote:
            'projects are counted at their invested amount, which may differ from the net worth tracking',
        incomeDetail: 'Income detail',
        largeExpenses: 'Large expenses (> {threshold})',
        listCapped: '({shown} listed out of {total})',
        labelsWithheld:
            'Detailed lists (income, large expenses) are omitted: labels are anonymized.',
        goalPace: 'requires {amount}/month over {months} months',
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

    /**
     * Renders one individually listed transaction.
     * @param entry - The entry to render
     * @returns The rendered line, without its bullet
     */
    const renderEntry = (entry: ReportEntry): string => {
        const context = entry.category && entry.category !== entry.label ? ` — ${entry.category}` : '';
        return `${entry.date} · ${entry.label}${context} : ${value(entry.amount, data.totals.inflow)}`;
    };

    // Header
    lines.push(`# ${label.title}`, '', label.intro, '');
    if (withAmounts) {
        lines.push(label.currencyNote.replace('{currency}', data.currency));
    } else {
        lines.push(label.percentOnlyNote);
    }
    // Only claimed when it is actually true.
    if (options.anonymizeLabels) lines.push(label.noDescriptions);
    lines.push('', `**${label.period}** : ${data.periodLabel}`, '');

    // Overview. Spending and allocation are reported separately: money put into a
    // project or onto a game platform is reallocated, not consumed.
    const { inflow, spending, allocated, net, savingsRate } = data.totals;
    lines.push(`## ${label.overview}`, '');
    if (withAmounts) {
        lines.push(
            `- ${label.income} : ${format.amount(inflow)}`,
            `- ${label.expenses} : ${format.amount(spending)}`,
        );
        if (allocated > 0) lines.push(`- ${label.allocated} : ${format.amount(allocated)}`);
        lines.push(`- ${label.net} : ${format.amount(net)}`);
    } else {
        lines.push(`- ${label.expenses} (${label.shareOfIncome}) : ${value(spending, inflow)}`);
        if (allocated > 0) {
            lines.push(
                `- ${label.allocated} (${label.shareOfIncome}) : ${value(allocated, inflow)}`,
            );
        }
    }
    lines.push(`- ${label.savingsRate} : ${format.percent(savingsRate)}`, '');

    // Month by month
    lines.push(`## ${label.monthByMonth}`, '');
    if (data.months.length === 0) {
        lines.push(label.noData, '');
    } else {
        lines.push(
            withAmounts
                ? `| ${label.month} | ${label.income} | ${label.expenses} | ${label.savings} | ${label.net} | ${label.savingsRate} |`
                : `| ${label.month} | ${label.expenses} (${label.shareOfIncome}) | ${label.savingsRate} |`,
            withAmounts ? '|---|---|---|---|---|---|' : '|---|---|---|',
        );
        for (const month of data.months) {
            lines.push(
                withAmounts
                    ? `| ${month.label} | ${format.amount(month.inflow)} | ${format.amount(month.outflow)} | ${format.amount(month.savings)} | ${format.amount(month.net)} | ${format.percent(month.savingsRate)} |`
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

    // Savings goals
    if (data.goals.length > 0) {
        lines.push(`## ${label.goals}`, '');
        data.goals.forEach((goal, index) => {
            const name = options.anonymizeLabels ? anonymize(label.goals, index) : goal.name;
            const progress = withAmounts
                ? `${format.amount(goal.current)} / ${format.amount(goal.target)} (${format.percent(goal.percent)})`
                : format.percent(goal.percent);

            const pace =
                withAmounts && goal.requiredMonthly !== undefined && goal.monthsLeft !== undefined
                    ? ` · ${label.goalPace
                          .replace('{amount}', format.amount(goal.requiredMonthly))
                          .replace('{months}', String(goal.monthsLeft))}`
                    : '';

            lines.push(`- ${name} : ${progress}${pace}`);
        });
        lines.push('');
    }

    // Detailed net worth, holding by holding (amounts only: a share of the
    // portfolio of itself carries no information)
    if (withAmounts && data.assets.length > 0) {
        lines.push(`## ${label.assets}`, '');
        let total = 0;

        data.assets.forEach((asset, index) => {
            const name = options.anonymizeLabels ? anonymize(label.assets, index) : asset.name;

            if (asset.kind === 'project') {
                total += asset.value;
                const dividends =
                    asset.dividends !== undefined
                        ? ` (${label.dividends} : ${format.amount(asset.dividends)})`
                        : '';
                lines.push(
                    `- ${name} : ${format.amount(asset.value)} ${label.invested}${dividends}`,
                );
                return;
            }

            total += asset.value;
            const invested =
                asset.invested !== undefined
                    ? ` (${label.invested} : ${format.amount(asset.invested)})`
                    : '';
            lines.push(`- ${name} : ${format.amount(asset.value)}${invested}`);
        });

        const hasProject = data.assets.some((asset) => asset.kind === 'project');
        const note = hasProject ? ` (${label.assetsTotalNote})` : '';
        lines.push('', `**${label.assetsTotal}** : ${format.amount(total)}${note}`, '');
    }

    // Net worth trend (amounts only: a share of itself carries no information)
    if (withAmounts && data.netWorth.length > 0) {
        lines.push(`## ${label.netWorth}`, '');
        for (const point of data.netWorth) {
            lines.push(`- ${point.label} : ${format.amount(point.total)}`);
        }
        lines.push('');
    }

    // Free-text listings. Anonymizing means no user-written label leaves the
    // device, so these two sections are dropped rather than emptied.
    if (options.anonymizeLabels) {
        lines.push(label.labelsWithheld, '');
    } else {
        if (data.incomes.length > 0) {
            lines.push(`## ${label.incomeDetail}`, '');
            for (const entry of data.incomes) {
                lines.push(`- ${renderEntry(entry)}`);
            }
            if (data.incomeTotalCount > data.incomes.length) {
                lines.push(
                    label.listCapped
                        .replace('{shown}', String(data.incomes.length))
                        .replace('{total}', String(data.incomeTotalCount)),
                );
            }
            lines.push('');
        }

        if (data.largeExpenses.length > 0) {
            lines.push(
                `## ${label.largeExpenses.replace('{threshold}', format.amount(options.largeExpenseThreshold))}`,
                '',
            );
            for (const month of data.largeExpenses) {
                lines.push(`### ${month.label}`, '');
                for (const entry of month.entries) {
                    lines.push(`- ${renderEntry(entry)}`);
                }
                lines.push('');
            }
        }
    }

    // The ask
    lines.push(`## ${label.ask}`, '', label.questions, '');

    return lines.join('\n');
}
