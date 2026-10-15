export function isAdminAuthorized(request: Request) {
  const expected = process.env.ADMIN_DASHBOARD_TOKEN;
  return Boolean(expected && request.headers.get("x-admin-token") === expected);
}
