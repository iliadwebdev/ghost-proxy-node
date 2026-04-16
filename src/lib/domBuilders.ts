// A list of functions that build DOM strings for various purposes. Kept separate from where they are invoked because they are ugly.

export function buildAtlasRedirectPage(atlasBase: string): string {
  return `<!DOCTYPE html>
<html><head><script>
var dest = location.hash ? "/" + location.hash : "/";
window.location.replace(${JSON.stringify(atlasBase)} + "?destination=" + encodeURIComponent(dest));
</script></head><body></body></html>`;
}
