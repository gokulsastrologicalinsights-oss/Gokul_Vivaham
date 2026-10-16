/** Match the browser origin against its actual request host, including behind Next's local listener. */
export function isSameOrigin(request: Request): boolean {
  const url = new URL(request.url);
  const host = request.headers.get('host') || url.host;
  return request.headers.get('origin') === url.protocol + '//' + host;
}
