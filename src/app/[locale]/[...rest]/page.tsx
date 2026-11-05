import { notFound } from "next/navigation";

// Unknown localized paths render the localized not-found page (with header and footer).
export default function CatchAll() {
  notFound();
}
