import { Elysia } from "elysia";
import ffmpeg from "fluent-ffmpeg";
import { unlinkSync } from "node:fs";

const app = new Elysia().onError(({ code, error }) => {
  return new Response(error.toString());
});
app.get("/", async () => {
  return {
    app: "Media Transcode Service",
    message: "Hello World",
    bunVersion: Bun.version,
  };
});

app.post("/", async (context) => {
  const { inputFileUrl, outputFileUrl } = context.body as any;

  // start converting and wait
  const startTime = Date.now();
  try {
    await processAndUploadFile(inputFileUrl, outputFileUrl);
    const endTime = Date.now();
    return { message: `Job finished in ${endTime - startTime}ms` };
  } catch (error) {
    const endTime = Date.now();
    return { message: `Job error after ${endTime - startTime}ms`, error };
  }
});

app.post("/async", async (context) => {
  const { inputFileUrl, outputFileUrl, webhookUrl } = context.body as any;

  processAndUploadFile(inputFileUrl, outputFileUrl, webhookUrl);
  return { message: "Job started" };
});

app.listen(Bun.env.PORT || 3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

const processAndUploadFile = async (
  inputFileUrl: string,
  outputFileUrl: string,
  webhookUrl?: string
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    // generate temp file name
    const outputFilePath = `media-transcode-file-${Math.random()
      .toString(36)
      .substring(7)}.mp3`;

    let startTime = Date.now();
    let endTime;
    const command = ffmpeg(inputFileUrl);
    command
      .audioBitrate(128)
      .noVideo()
      .format("mp3")
      .on("start", (commandLine) => {
        console.log("Spawned Ffmpeg with command: " + commandLine);
      })
      .on("progress", (progress) => {
        if (progress.percent > 0) {
          console.log(`Processing: ${Math.round(progress.percent)}% done`);
        }
      })
      .on("end", async () => {
        endTime = Date.now();
        console.log(
          `Finished processing in ${endTime - startTime}ms, now uploading`
        );
        try {
          const file = Bun.file(outputFilePath);
          console.log("Uploading file", file.type, file);
          const response = await fetch(outputFileUrl, {
            method: "PUT",
            headers: {
              "Content-Type": file.type,
            },
            body: file,
          });
          if(!response.ok){
            throw new Error(`Failed uploading file: ${response.status} ${response.statusText}`)
          }

          if (webhookUrl) {
            await fetch(webhookUrl, {
              method: "POST",
              body: JSON.stringify({ status: "succeeded" }),
            });
            console.log("Sent webhook");
          }
          resolve();
        } catch (error) {
          console.log(error);
          if (webhookUrl) {
            await fetch(webhookUrl, {
              method: "POST",
              body: JSON.stringify({ status: "failed", error }),
            });
          }
          reject(error);
        } finally {
          unlinkSync(outputFilePath);
        }
      })
      .on("error", async (error: Error) => {
        console.log(error);

        // if outputfile exists, delete it
        try {
          unlinkSync(outputFilePath);
        } catch (error) {
          console.log("failed deleting file", error);
        }

        if (webhookUrl) {
          await fetch(webhookUrl, {
            method: "POST",
            body: JSON.stringify({ status: "failed", error }),
          });
        }
        reject(error);
      })
      .save(outputFilePath);
  });
};