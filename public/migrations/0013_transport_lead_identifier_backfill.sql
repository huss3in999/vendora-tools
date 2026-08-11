-- Populate existing identifier columns only from values already recorded in the
-- protected lead payload. This improves historical grouping without inventing IDs.

UPDATE whatsapp_leads
SET
  visitor_id = COALESCE(NULLIF(visitor_id, ''), NULLIF(json_extract(raw_payload, '$.visitorId'), '')),
  visit_count = COALESCE(CAST(json_extract(raw_payload, '$.visitCount') AS INTEGER), visit_count, 1),
  session_page_views = COALESCE(CAST(json_extract(raw_payload, '$.sessionPageViews') AS INTEGER), session_page_views, 1)
WHERE json_valid(raw_payload)
  AND (visitor_id IS NULL OR visitor_id = '');

