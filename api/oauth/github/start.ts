import { startOAuth } from "../../../lib/oauth-flow.ts";
import { setSecurityHeaders, type ApiRequest, type ApiResponse } from "../../../lib/http.ts";

export default function handler(req: ApiRequest, res: ApiResponse) {
  setSecurityHeaders(res);
  startOAuth("github", req, res);
}
