export async function uploadSession(config, payload) {
  const url = `${config.siteUrl}/api/ingest/session`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text.slice(0, 200) };
  }

  if (!res.ok) {
    throw new Error(data.error ?? `Upload failed (${res.status})`);
  }

  return data;
}
