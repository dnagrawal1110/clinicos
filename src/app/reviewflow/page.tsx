import { redirect } from "next/navigation";
import { skinEthics } from "@/lib/mock/clients";

export default function ReviewFlowIndex() {
  redirect(`/review/${skinEthics.locations[2].slug}`);
}
