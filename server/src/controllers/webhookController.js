import crypto from "crypto";

export function createWebhookController(settings) {
  function verifyMessenger(req, res) {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token && token === settings.messengerVerifyToken) {
      return res.status(200).send(challenge);
    }

    return res.sendStatus(403);
  }

  function receiveMessenger(req, res) {
    if (!isValidMessengerSignature(req, settings.messengerAppSecret)) {
      return res.sendStatus(401);
    }

    // TODO: dispatch req.body.entry[].messaging[] to the chat-link/intent services once built.
    console.log("Messenger webhook event:", JSON.stringify(req.body));

    return res.sendStatus(200);
  }

  return { verifyMessenger, receiveMessenger };
}

function isValidMessengerSignature(req, appSecret) {
  // Signature check is skipped only until the app secret is configured (local/dev scaffolding).
  if (!appSecret) return true;

  const signatureHeader = req.headers["x-hub-signature-256"];
  if (!signatureHeader || !req.rawBody) return false;

  const expected = `sha256=${crypto.createHmac("sha256", appSecret).update(req.rawBody).digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signatureHeader);

  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}
