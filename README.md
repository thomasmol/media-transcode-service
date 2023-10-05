# Media Transcode Service

This is a AWS MediaConvert alternative for converting audio and videos files to mp3.

Built using Elysia with Bun runtime

1. Takes an input file url and
2. converts the file to mp3 and
3. uploads them to output file url

Either sent a request to '/' for synchronous conversion or to '/async' for asynchronous conversion.
With '/async' you must send a webhook url in the body of the request.

## Getting Started

To get started clone this repo and run in your terminal:

```bash
bun run dev
```

or to start in prod:

```bash
bun run build && bun run start
```

### Example sync request

#### Request

```bash
curl --location --request POST 'http://localhost:3000/' \
--header 'Content-Type: application/json' \
--data-raw '{
    "inputFileUrl: "somefile.com/file.mp4",
    "outputFileUrl": "somefile.com/file.mp3"
}'
```

#### Response

```json
{ "message": "Job finished in 200ms" }
```

### Example async request

#### Request

```bash
curl --location --request POST 'http://localhost:3000/async' \
--header 'Content-Type: application/json' \
--data-raw '{
    "inputFileUrl: "somefile.com/file.mp4",
    "outputFileUrl": "somefile.com/file.mp3",
    "webhookUrl": "https://webhook.site/0b0b0b0b-0b0b-0b0b-0b0b-0b0b0b0b0b0b"
}'
```
#### Response

```json
{ "message": "Job started" }
```

#### Webhook Response

```json
{
    "status": "succeeded"
}
```
or
```json
{
    "status": "failed"
}
```
