/**
 * Posts the result of a CI test run to Slack. Runs as the last workflow step.
 *
 * Reads playwright-report/results.json (the JSON reporter) for test counts and
 * failed tests, and the run context from environment variables set by the workflow.
 *
 *   SLACK_BOT_TOKEN        bot token with chat:write (secret)
 *   SLACK_CHANNEL_ID       channel to post in, e.g. C0123456789 (the bot must be a member)
 *   SLACK_MENTION_USER_ID  user to tag, e.g. U06AG118M5K
 *   RUN_NAME               what ran, for the title (default "E2E tests")
 *   SLACK_DRY_RUN=1        print the message instead of sending it
 *
 * Never fails the job: problems are reported as workflow warnings.
 */
import fs from 'fs';

interface Stats {
  duration: number;
  expected: number;
  unexpected: number;
  flaky: number;
  skipped: number;
}

interface Suite {
  title: string;
  specs?: { title: string; file: string; tests: { projectName: string; status: string }[] }[];
  suites?: Suite[];
}

const REPORT = 'playwright-report/results.json';
const MAX_FAILED_LISTED = 10;
const e = process.env;

function readReport(): { stats: Stats; failed: string[] } | undefined {
  if (!fs.existsSync(REPORT)) return undefined;
  const report = JSON.parse(fs.readFileSync(REPORT, 'utf8')) as { stats: Stats; suites: Suite[] };
  const failed: string[] = [];
  const walk = (suite: Suite) => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        if (test.status === 'unexpected') failed.push(`[${test.projectName}] ${spec.title}`);
      }
    }
    suite.suites?.forEach(walk);
  };
  report.suites.forEach(walk);
  return { stats: report.stats, failed };
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function buildMessage() {
  const report = readReport();
  const jobStatus = e.JOB_STATUS ?? 'unknown';
  const testsFailed = !!report && (report.stats.unexpected > 0 || report.failed.length > 0);

  const status =
    jobStatus === 'cancelled'
      ? { icon: ':warning:', label: 'cancelled', color: '#a0a0a0' }
      : jobStatus === 'success' && !testsFailed
        ? { icon: ':white_check_mark:', label: 'passed', color: '#2eb67d' }
        : { icon: ':x:', label: 'failed', color: '#e01e5a' };

  const runUrl = e.RUN_URL ?? '';
  const repoUrl = `${e.GITHUB_SERVER_URL}/${e.GITHUB_REPOSITORY}`;
  const sha = e.COMMIT_SHA ?? e.GITHUB_SHA ?? '';
  const mention = e.SLACK_MENTION_USER_ID ? `<@${e.SLACK_MENTION_USER_ID}> ` : '';
  const title = `${status.icon} ${e.RUN_NAME ?? 'E2E tests'} ${status.label} on *${e.ENV ?? 'demo'}*`;

  const results = report
    ? [
        `:large_green_circle: Passed *${report.stats.expected}*`,
        `:red_circle: Failed *${report.stats.unexpected}*`,
        `:large_yellow_circle: Flaky *${report.stats.flaky}*`,
        `:white_circle: Skipped *${report.stats.skipped}*`,
        `:stopwatch: ${formatDuration(report.stats.duration)}`,
      ].join('   ')
    : '_No test results: the run stopped before the tests finished (see the run log)._';

  const failedList = report?.failed.length
    ? [
        '*Failed tests*',
        ...report.failed.slice(0, MAX_FAILED_LISTED).map((t) => `• ${t}`),
        ...(report.failed.length > MAX_FAILED_LISTED ? [`…and ${report.failed.length - MAX_FAILED_LISTED} more`] : []),
      ].join('\n')
    : undefined;

  const context = [
    `*Suite* ${e.SUITE ?? 'all'}`,
    `*Feature* ${e.FEATURE ?? 'all'}`,
    `*Scope* ${e.SCOPE ?? 'all'}`,
    `*Browsers* ${e.BROWSERS ?? '-'}`,
    `*Branch* ${e.BRANCH ?? e.GITHUB_REF_NAME ?? '-'}`,
    `*Commit* <${repoUrl}/commit/${sha}|${sha.slice(0, 7)}>`,
    `*Trigger* ${e.GITHUB_EVENT_NAME ?? '-'} by ${e.GITHUB_ACTOR ?? '-'}`,
  ].join('   ·   ');

  const blocks = [
    { type: 'section', text: { type: 'mrkdwn', text: results } },
    ...(failedList ? [{ type: 'section', text: { type: 'mrkdwn', text: failedList } }] : []),
    { type: 'context', elements: [{ type: 'mrkdwn', text: context }] },
    {
      type: 'actions',
      elements: [
        { type: 'button', text: { type: 'plain_text', text: 'Open test run' }, url: runUrl },
        { type: 'button', text: { type: 'plain_text', text: 'Download report' }, url: `${runUrl}#artifacts` },
      ],
    },
  ];

  return {
    channel: e.SLACK_CHANNEL_ID,
    // Top-level text carries the mention so it triggers a push notification.
    text: `${mention}${title}\n<${runUrl}|View test run>`,
    attachments: [{ color: status.color, blocks }],
    unfurl_links: false,
  };
}

function warn(message: string): void {
  console.log(`::warning title=Slack notification::${message}`);
}

const message = buildMessage();

if (e.SLACK_DRY_RUN === '1') {
  console.log(JSON.stringify(message, null, 2));
} else if (!e.SLACK_BOT_TOKEN || !e.SLACK_CHANNEL_ID) {
  warn('Skipped: set the SLACK_BOT_TOKEN secret and the SLACK_CHANNEL_ID variable to enable it.');
} else {
  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { authorization: `Bearer ${e.SLACK_BOT_TOKEN}`, 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(message),
    });
    const body = (await response.json()) as { ok: boolean; error?: string };
    if (body.ok) console.log('Slack notification sent.');
    else warn(`Slack API error: ${body.error}. For not_in_channel, invite the bot to the channel.`);
  } catch (error) {
    warn(`Could not reach Slack: ${(error as Error).message}`);
  }
}
