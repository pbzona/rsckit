import * as crypto from "node:crypto";

export const hashString = (str: string) =>
  // Using md5 because it's fast, most platforms have it, and this is for
  // change detection, integrity is not as important
  crypto
    .createHash("md5")
    .update(str)
    .digest("hex");
