import type { Metadata } from "next";

import GameClient from "@/components/GameClient";

export const metadata: Metadata = {
  title: "Play",
};

export default function PlayPage() {
  return <GameClient />;
}
