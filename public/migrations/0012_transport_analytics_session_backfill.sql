-- Build privacy-safe historical session rows from the existing event stream.
-- Values that were not observed at the time remain NULL/Unknown; nothing is guessed.

INSERT OR IGNORE INTO analytics_sessions (
  session_id, visitor_id, first_visit_at, session_started_at, first_seen_at, last_activity_at,
  visit_count, is_returning, visitor_local_time, landing_url, landing_path, landing_title,
  referrer, utm_source, utm_medium, utm_campaign, utm_term, utm_content, traffic_source,
  source_category, ai_referral_source, language, device_type, screen_width, screen_height,
  cf_country, cf_region, cf_city, cf_timezone, created_at, updated_at
)
SELECT
  session_id,
  MAX(NULLIF(visitor_id, '')),
  MIN(NULLIF(json_extract(raw_payload, '$.first_visit_at'), '')),
  COALESCE(MIN(NULLIF(json_extract(raw_payload, '$.session_started_at'), '')), MIN(created_at)),
  MIN(created_at),
  MAX(created_at),
  MAX(COALESCE(CAST(json_extract(raw_payload, '$.visitCount') AS INTEGER), 1)),
  CASE WHEN MAX(COALESCE(CAST(json_extract(raw_payload, '$.visitCount') AS INTEGER), 1)) > 1 THEN 1 ELSE 0 END,
  MAX(NULLIF(json_extract(raw_payload, '$.visitor_local_time'), '')),
  COALESCE(MAX(NULLIF(json_extract(raw_payload, '$.landing_url'), '')), MIN(CASE WHEN event_name = 'page_view' THEN page_url END)),
  COALESCE(MAX(NULLIF(json_extract(raw_payload, '$.landing_path'), '')), MIN(CASE WHEN event_name = 'page_view' THEN page_path END)),
  MAX(NULLIF(json_extract(raw_payload, '$.landing_title'), '')),
  MIN(NULLIF(referrer, '')),
  MAX(NULLIF(utm_source, '')),
  MAX(NULLIF(utm_medium, '')),
  MAX(NULLIF(utm_campaign, '')),
  MAX(NULLIF(json_extract(raw_payload, '$.utm_term'), '')),
  MAX(NULLIF(json_extract(raw_payload, '$.utm_content'), '')),
  COALESCE(MAX(NULLIF(json_extract(raw_payload, '$.traffic_source'), '')), MAX(NULLIF(utm_source, '')), 'direct'),
  COALESCE(MAX(NULLIF(json_extract(raw_payload, '$.source_category'), '')),
    CASE
      WHEN MAX(NULLIF(json_extract(raw_payload, '$.ai_referral_source'), '')) IS NOT NULL THEN 'ai_referral'
      WHEN LOWER(COALESCE(MAX(NULLIF(json_extract(raw_payload, '$.traffic_source'), '')), MAX(NULLIF(utm_source, '')), 'direct')) GLOB '*google*'
        OR LOWER(COALESCE(MAX(NULLIF(json_extract(raw_payload, '$.traffic_source'), '')), MAX(NULLIF(utm_source, '')), 'direct')) GLOB '*bing*' THEN 'organic_search'
      WHEN COALESCE(MAX(NULLIF(json_extract(raw_payload, '$.traffic_source'), '')), MAX(NULLIF(utm_source, '')), 'direct') = 'direct' THEN 'direct'
      ELSE 'referral'
    END),
  MAX(NULLIF(json_extract(raw_payload, '$.ai_referral_source'), '')),
  MAX(NULLIF(language, '')),
  MAX(NULLIF(device_type, '')),
  MAX(screen_width),
  MAX(screen_height),
  MAX(NULLIF(ip_country, '')),
  MAX(NULLIF(ip_region, '')),
  MAX(NULLIF(ip_city, '')),
  MAX(NULLIF(ip_timezone, '')),
  MIN(created_at),
  MAX(created_at)
FROM analytics_events
WHERE session_id IS NOT NULL AND session_id <> '' AND session_id <> 'unknown_session'
GROUP BY session_id;

