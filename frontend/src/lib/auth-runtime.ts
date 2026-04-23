type TokenGetter = () => Promise<string | null>;
type LogoutHandler = () => Promise<void>;

let tokenGetter: TokenGetter = async () => null;
let logoutHandler: LogoutHandler = async () => {};

export function configureAuthRuntime(config: {
  getToken: TokenGetter;
  logout: LogoutHandler;
}) {
  tokenGetter = config.getToken;
  logoutHandler = config.logout;
}

export async function getAuthToken() {
  return tokenGetter();
}

export async function logoutFromRuntime() {
  await logoutHandler();
}
