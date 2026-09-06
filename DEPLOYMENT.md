# Deployment

The API runs on Lambda behind an HTTP API, the client is a static build on S3,
and one CloudFront distribution sits in front of both. CloudFront sends
`/api/*` to the API and everything else to S3, so the SPA and the API share an
origin — the client keeps calling relative `/api` paths and there is no CORS to
configure.

```
CloudFront
  ├── /*      → S3          (client/dist)
  └── /api/*  → HTTP API    → Lambda → MongoDB Atlas
```

All of it is defined in [`template.yaml`](template.yaml) (AWS SAM). Nothing is
clicked together by hand.

## One-time setup

Nothing has to be installed locally — the GitHub runners already carry the AWS
and SAM CLIs.

**1. GitHub secrets**

Settings → Secrets and variables → Actions:

| Secret | Value |
| --- | --- |
| `AWS_ACCESS_KEY_ID` | from an IAM user that can deploy CloudFormation |
| `AWS_SECRET_ACCESS_KEY` | its secret |
| `MONGODB_URI` | Atlas connection string |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `ADMIN_SECRET` | any long random string |
| `CLIENT_ORIGIN` | leave empty for the first deploy, see below |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `SMTP_FROM` | optional — without them invite links are still created, just not emailed |

Set the `AWS_REGION` variable if `ap-south-1` is not wanted.

**2. First deploy**

1. Run **Deploy API** (Actions → workflow → Run workflow). It prints the stack
   outputs, including `CloudFrontURL`.
2. Put that URL into the `CLIENT_ORIGIN` secret and run **Deploy API** again —
   invite links and the CORS allow list both need it.
3. Run **Deploy client**.

**3. Create the first admin**

```bash
curl -X POST https://<CloudFrontURL>/api/auth/admin \
  -H 'Content-Type: application/json' \
  -d '{"name":"Admin","email":"admin@example.com","password":"<8+ chars>","secret":"<ADMIN_SECRET>"}'
```

## After that

Pushes to `main` deploy themselves:

- `server/**` or `template.yaml` → **Deploy API**
- `client/**` → **Deploy client**

The client workflow reads the bucket name and distribution id back from the
stack, so those never become secrets.

## Things worth knowing

**Mongo connections.** Lambda opens a connection per container.
[`server/src/lambda.js`](server/src/lambda.js) caches it outside the handler and
the function is capped at 20 concurrent executions, so a traffic spike cannot
exhaust the Atlas connection limit.

**The 30 second ceiling.** HTTP API integrations time out at 30s. Payrun compute
is the only call that goes near it, and only for a large batch — it resolves a
contract and the unpaid leave per employee. Fixing those N+1 queries is the
first thing to do if a run ever times out; the operation is idempotent, so a
retry is always safe.

**Cold starts.** The first request after an idle period pays for the container
boot plus the Mongo connect, roughly 1–3s. Memory is set to 1024 MB because
Lambda scales CPU with memory, which also speeds up bcrypt.

**Email.** AWS blocks outbound port 25. Use 587 or 465, or move to SES.

**Permissions.** The deploy user needs enough to let CloudFormation build the
whole stack — Lambda, IAM roles, S3, CloudFront. PowerUserAccess plus
IAMFullAccess covers it, which is wider than production should allow; narrow it
to the specific resources before this runs for real.

**Long-lived keys.** Access keys in repository secrets stay valid until they are
rotated. The stronger option is GitHub OIDC: an IAM role that only this repo's
`main` branch can assume, handing out short-lived credentials per run. It needs
an IAM role created once with the AWS CLI, so it is worth doing before this is
treated as anything but a demo.

## Running locally

Unchanged. `server/src/index.js` is still the local entrypoint and Lambda is not
involved.

```bash
cd server && npm run dev    # :4000
cd client && npm run dev    # :5173, proxies /api
```
