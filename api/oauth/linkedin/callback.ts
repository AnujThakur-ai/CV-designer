import { finishOAuth } from "../../../lib/oauth-flow.ts";
import { setSecurityHeaders, type ApiRequest, type ApiResponse } from "../../../lib/http.ts";

export default async function handler(req: ApiRequest, res: ApiResponse) {
  setSecurityHeaders(res);
  await finishOAuth("linkedin", req, res);
}
