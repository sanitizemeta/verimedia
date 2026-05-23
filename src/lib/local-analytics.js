const STORE_KEY = 'vm_growth_events_v1';

function nowIso() {
  return new Date().toISOString();
}

function readEvents() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeEvents(events) {
  localStorage.setItem(STORE_KEY, JSON.stringify(events.slice(-500)));
}

export function trackEvent(event, props = {}) {
  try {
    const events = readEvents();
    events.push({
      event,
      props,
      path: window.location.pathname,
      ts: nowIso()
    });
    writeEvents(events);
  } catch {
    // no-op
  }
}

export function getEventSummary() {
  const events = readEvents();
  const counts = {};
  for (const e of events) counts[e.event] = (counts[e.event] || 0) + 1;
  return { total: events.length, counts };
}

export function exportEventsJson() {
  const payload = {
    exportedAt: nowIso(),
    summary: getEventSummary(),
    events: readEvents()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `verimedia-growth-events-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

window.VerimediaGrowth = {
  trackEvent,
  getEventSummary,
  exportEventsJson
};
