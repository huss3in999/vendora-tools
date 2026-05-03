export async function loader() {
  return new Response("ok", { headers: { "Content-Type": "text/plain" } });
}

