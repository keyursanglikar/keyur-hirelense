# Render Free-Tier Uptime Monitoring

> **Important disclaimer:** This setup reduces cold-start delays on Render Free but does NOT guarantee 24/7 uptime. Render Free services can still restart, redeploy, or suspend at any time.

---

## 1. Health Endpoint

A lightweight liveness probe is exposed at:

```
GET https://keyur-hirelense.onrender.com/health
```

### Expected Response

```json
{
  "status": "ok",
  "service": "backend"
}
```

### What it intentionally does NOT do

- Database query: Never
- Gemini / AI call: Never
- Third-party API call: Never
- Require JWT token: Never
- Require cookies: Never
- Require a logged-in user: Never
- Return env vars / keys / secrets: Never

The endpoint is registered FIRST in urlpatterns, before any authentication middleware.

---

## 2. UptimeRobot Configuration

1. Go to https://uptimerobot.com/ → Add New Monitor
2. Monitor Type: HTTP(s)
3. Friendly Name: Hirelens Backend
4. URL: https://keyur-hirelense.onrender.com/health
5. Monitoring Interval: Every 5 minutes
6. Alert Contact: Your email
7. Click Create Monitor.

> Render Free spins down services after ~15 minutes of inactivity.
> A 5-minute ping keeps it warm during business hours.

---

## 3. Alternative Free Uptime Monitors

- UptimeRobot - 50 monitors, 5-min interval - https://uptimerobot.com
- Freshping  - 50 checks, 1-min interval  - https://freshping.io
- Cron-job.org - Unlimited, 1-min interval - https://cron-job.org

---

## 4. Testing the Endpoint

```bash
curl -i https://keyur-hirelense.onrender.com/health
```

Expected: HTTP/2 200 with {"status": "ok", "service": "backend"}

---

## 5. Implementation Notes

- File changed: backend/saas_platform/urls.py
- No new dependencies added: True
- No DB queries: True
- Authentication bypassed: True (plain Django view, not DRF APIView)
- Route position: First in urlpatterns
- Logging: GET /health - 200 - Xms logged at INFO level

---

## 6. Limitations

- Render Free will still cold-start after a full service restart or redeploy.
- The external monitor keeps the process warm between restarts, not 24/7.
- Render Free allows only 750 hours/month of runtime. Plan accordingly.

