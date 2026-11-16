# Oro Site Analysis backend (Earth Engine on Cloud Run)

A small service that computes live, per-polygon landscape statistics in Earth
Engine. `POST /analyze` with a GeoJSON geometry → per-theme stats + thumbnail
URLs. It runs **as the Earth Engine service account** (Cloud Run runtime
identity), so no key file ships in the image.

See the project chat / `docs/09-site-analysis.md` for the design. Deploy steps
below; the frontend is wired to the deployed URL separately.

## One-time setup

```bash
# 1. Point gcloud at the project and enable the APIs
gcloud config set project orodataportal
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
    earthengine.googleapis.com artifactregistry.googleapis.com

# 2. The Earth Engine service account email (the client_email inside the
#    EE_SERVICE_ACCOUNT_KEY you already use in GitHub Actions)
export EE_SA="REPLACE_WITH_client_email@orodataportal.iam.gserviceaccount.com"

# 3. Make sure it can run Earth Engine (usually already true)
gcloud projects add-iam-policy-binding orodataportal \
    --member="serviceAccount:${EE_SA}" --role="roles/earthengine.writer"
```

Then, in the Cloud Console, confirm the project is registered on the
**noncommercial Community tier**: https://console.cloud.google.com/earth-engine

## Deploy (run from the repo root)

```bash
gcloud run deploy oro-site-analysis \
  --source backend \
  --region us-central1 \
  --service-account "${EE_SA}" \
  --allow-unauthenticated \
  --max-instances 3 \
  --concurrency 20 \
  --memory 512Mi \
  --timeout 120 \
  --set-env-vars "EE_PROJECT=orodataportal,ALLOWED_ORIGIN=https://wtunsworth-a11y.github.io,MAX_AOI_HA=50000,RATE_LIMIT_PER_MIN=30"
```

## Get the URL and test

```bash
URL=$(gcloud run services describe oro-site-analysis --region us-central1 --format='value(status.url)')
echo "$URL"
curl -s -X POST "$URL/analyze" -H 'Content-Type: application/json' \
  -d '{"geometry":{"type":"Polygon","coordinates":[[[148.42,-9.22],[148.58,-9.22],[148.58,-9.38],[148.42,-9.38],[148.42,-9.22]]]}}'
```

## Safety: a billing budget

```bash
gcloud billing accounts list                          # find your billing account id
gcloud billing budgets create \
  --billing-account=XXXXXX-XXXXXX-XXXXXX \
  --display-name="Oro EE backend" \
  --budget-amount=10USD \
  --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 --threshold-rule=percent=1.0
```

## Env vars

| var | default | meaning |
|---|---|---|
| `EE_PROJECT` | orodataportal | Earth Engine / Cloud project |
| `ALLOWED_ORIGIN` | `*` | CORS origin (set to the portal URL) |
| `MAX_AOI_HA` | 50000 | reject AOIs larger than this |
| `RATE_LIMIT_PER_MIN` | 30 | per-instance per-IP request cap |
