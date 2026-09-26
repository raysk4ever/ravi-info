/**
 * Shared aggregation layer for chat insights.
 *
 * Both the terminal report (chat-insights.cjs) and the HTML report
 * (chat-report.cjs) render from this, so the two views can never disagree
 * about what the data says.
 */

/** Strips anything that would break a single-line cell in the CLI. */
function clean(s, n) {
  return String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, n || 120);
}

function avg(nums) {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Run every aggregation the reports need against one database.
 *
 * @param {import('mongodb').Db} db
 * @param {{ since: Date, limit?: number, minAsks?: number }} opts
 */
async function collectInsights(db, { since, limit = 20, minAsks = 1 }) {
  const turns = db.collection("chat_turns");
  const stats = db.collection("chat_question_stats");
  const feedback = db.collection("chat_feedback");
  const inRange = { createdAt: { $gte: since } };

  const hasTurns = (await turns.countDocuments(inRange)) > 0;

  const [
    totalTurns,
    ratedTurns,
    daily,
    top,
    down,
    noContext,
    disliked,
    topics,
    entities,
    negatives,
    clusters,
    geo,
    devices,
    browsers,
    models,
    outcomes,
    timingRows,
  ] = await Promise.all([
    turns.countDocuments(inRange),
    turns.countDocuments({ ...inRange, "feedback.rating": { $ne: null } }),

    turns
      .aggregate([
        { $match: inRange },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            asks: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 30 },
        { $sort: { _id: 1 } },
      ])
      .toArray(),

    stats
      .find({ lastAskedAt: { $gte: since }, askCount: { $gte: minAsks } })
      .sort({ askCount: -1 })
      .limit(limit)
      .toArray(),

    feedback
      .aggregate([
        { $match: { createdAt: { $gte: since }, rating: -1 } },
        {
          $group: {
            _id: "$question",
            count: { $sum: 1 },
            sample: { $first: "$answerSnippet" },
          },
        },
        { $sort: { count: -1 } },
        { $limit: limit },
      ])
      .toArray(),

    // Retrieval matched nothing: these are missing knowledge, not bad answers.
    turns
      .aggregate([
        { $match: { ...inRange, outcome: "no_context" } },
        { $group: { _id: "$question", n: { $sum: 1 }, visitors: { $addToSet: "$visitorId" } } },
        { $sort: { n: -1 } },
        { $limit: limit },
      ])
      .toArray(),

    turns
      .aggregate([
        { $match: { ...inRange, "feedback.rating": -1 } },
        { $group: { _id: "$question", n: { $sum: 1 } } },
        { $sort: { n: -1 } },
        { $limit: limit },
      ])
      .toArray(),

    turns
      .aggregate([
        { $match: inRange },
        { $unwind: "$text.topics" },
        {
          $group: {
            _id: "$text.topics",
            asks: { $sum: 1 },
            down: { $sum: { $cond: [{ $eq: ["$feedback.rating", -1] }, 1, 0] } },
          },
        },
        { $sort: { asks: -1 } },
      ])
      .toArray(),

    turns
      .aggregate([
        { $match: inRange },
        { $unwind: "$text.entities" },
        { $group: { _id: "$text.entities", n: { $sum: 1 } } },
        { $sort: { n: -1 } },
        { $limit: 12 },
      ])
      .toArray(),

    turns
      .aggregate([
        { $match: inRange },
        { $match: { "text.negativeSignals.0": { $exists: true } } },
        { $unwind: "$text.negativeSignals" },
        {
          $group: {
            _id: "$text.negativeSignals",
            count: { $sum: 1 },
            sample: { $first: "$question" },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray(),

    // Same content words asked differently - a coverage signal in itself.
    stats
      .aggregate([
        { $match: { lastAskedAt: { $gte: since } } },
        {
          $group: {
            _id: "$signature",
            variants: { $push: { q: "$question", n: "$askCount" } },
            total: { $sum: "$askCount" },
          },
        },
        { $match: { total: { $gte: 2 } } },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ])
      .toArray(),

    turns
      .aggregate([
        { $match: inRange },
        {
          $group: {
            _id: { geo: "$geo.countryCode", city: "$geo.city" },
            n: { $sum: 1 },
          },
        },
        { $sort: { n: -1 } },
        { $limit: 10 },
      ])
      .toArray(),

    turns
      .aggregate([
        { $match: inRange },
        { $group: { _id: "$device.deviceType", n: { $sum: 1 } } },
        { $sort: { n: -1 } },
      ])
      .toArray(),

    turns
      .aggregate([
        { $match: inRange },
        { $group: { _id: "$device.browser", n: { $sum: 1 } } },
        { $sort: { n: -1 } },
        { $limit: 5 },
      ])
      .toArray(),

    turns
      .aggregate([
        { $match: inRange },
        { $group: { _id: "$model", n: { $sum: 1 } } },
        { $sort: { n: -1 } },
      ])
      .toArray(),

    turns
      .aggregate([
        { $match: inRange },
        { $group: { _id: "$outcome", n: { $sum: 1 } } },
        { $sort: { n: -1 } },
      ])
      .toArray(),

    turns
      .find(
        { ...inRange, "timing.ttftMs": { $ne: null } },
        { projection: { "timing.ttftMs": 1, "timing.totalMs": 1 }, limit: 20000 }
      )
      .toArray(),
  ]);

  const [sessions, visitors, returning] = await Promise.all([
    turns.distinct("sessionId", inRange),
    turns.distinct("visitorId", inRange),
    turns
      .aggregate([
        { $match: inRange },
        { $group: { _id: "$visitorId", n: { $sum: 1 } } },
        { $match: { n: { $gt: 1 } } },
        { $count: "n" },
      ])
      .toArray(),
  ]);

  const ttfts = timingRows.map((d) => d.timing.ttftMs).sort((a, b) => a - b);
  const totals = timingRows.map((d) => d.timing.totalMs).sort((a, b) => a - b);
  const thumbsUp = await turns.countDocuments({ ...inRange, "feedback.rating": 1 });
  const thumbsDown = await turns.countDocuments({ ...inRange, "feedback.rating": -1 });

  return {
    hasTurns,
    range: { since, until: new Date() },
    totals: {
      questions: totalTurns,
      rated: ratedTurns,
      thumbsUp,
      thumbsDown,
      approval: ratedTurns > 0 ? thumbsUp / ratedTurns : null,
      uniqueVisitors: visitors.length,
      sessions: sessions.length,
      returning: returning[0]?.n ?? 0,
      turnsPerSession: sessions.length ? totalTurns / sessions.length : 0,
      turnsPerVisitor: visitors.length ? totalTurns / visitors.length : 0,
      neverRated: totalTurns - ratedTurns,
    },
    daily,
    topQuestions: top.map((q) => ({
      question: q.question,
      askCount: q.askCount,
      thumbsUp: q.thumbsUp || 0,
      thumbsDown: q.thumbsDown || 0,
      topics: q.topics || [],
      lastAskedAt: q.lastAskedAt,
    })),
    unanswered: noContext.map((q) => ({
      question: q._id,
      n: q.n,
      visitors: q.visitors.length,
    })),
    disliked: disliked.map((d) => ({ question: d._id, n: d.n })),
    thumbsDownDetail: down.map((d) => ({
      question: d._id,
      n: d.count,
      sample: d.sample,
    })),
    topics: topics.map((t) => ({ topic: t._id, asks: t.asks, down: t.down })),
    entities: entities.map((e) => ({ entity: e._id, n: e.n })),
    negatives: negatives.map((n) => ({
      signal: n._id,
      count: n.count,
      sample: clean(n.sample, 90),
    })),
    clusters: clusters.map((c) => ({
      total: c.total,
      variants: c.variants.map((v) => ({ q: clean(v.q, 80), n: v.n })),
    })),
    geo: geo.map((g) => ({ country: g._id.geo, city: g._id.city, n: g.n })),
    devices: devices.map((d) => ({ device: d._id || "unknown", n: d.n })),
    browsers: browsers.map((b) => ({ browser: b._id || "unknown", n: b.n })),
    models: models.map((m) => ({ model: m._id || "unknown", n: m.n })),
    outcomes: outcomes.map((o) => ({ outcome: o._id, n: o.n })),
    timing: {
      samples: ttfts.length,
      ttftP50: ttfts.length ? percentile(ttfts, 0.5) : null,
      ttftP95: ttfts.length ? percentile(ttfts, 0.95) : null,
      ttftAvg: avg(ttfts),
      ttftMax: ttfts.length ? ttfts[ttfts.length - 1] : null,
      totalAvg: avg(totals),
    },
  };
}

module.exports = { collectInsights, clean, avg, percentile };
